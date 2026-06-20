import { Config } from '@backstage/config';
import express, { Router, Request, Response, NextFunction } from 'express';
import { AdpClient } from './client';
import {
  AuthService,
  HttpAuthService,
  DatabaseService,
  DiscoveryService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  BasicPermission,
} from '@backstage/plugin-permission-common';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';
import { NotAllowedError } from '@backstage/errors';
import {
  adpPermissions,
  adpSessionReadPermission,
  adpSessionWritePermission,
  adpContextReadPermission,
  adpGovernanceCheckPermission,
  adpApprovalReadPermission,
  adpApprovalRequestPermission,
  adpApprovalResolvePermission,
  adpDecisionReadPermission,
  adpDecisionWritePermission,
  adpCommitWritePermission,
  adpServiceReadPermission,
  adpServiceWritePermission,
  adpServiceDeletePermission,
  adpReportReadPermission,
  adpDocsReadPermission,
  adpEnforcementReadPermission,
  adpEnforcementResolvePermission,
} from './permissions';

/**
 * Router options
 */
export interface RouterOptions {
  adpClient: AdpClient;
  config: Config;
  logger: LoggerService;
  database: DatabaseService;
  auth: AuthService;
  httpAuth: HttpAuthService;
  permissions: PermissionsService;
  discovery: DiscoveryService;
}

/**
 * Helper to extract user info from request
 */
async function getUserFromRequest(
  req: Request,
  httpAuth: HttpAuthService,
): Promise<{ userEntityRef?: string }> {
  try {
    const credentials = await httpAuth.credentials(req);
    if (credentials.principal.type === 'user') {
      return { userEntityRef: credentials.principal.userEntityRef };
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Authorize a request against a single basic permission, throwing
 * {@link NotAllowedError} if the decision is not ALLOW.
 *
 * Exported for unit testing.
 */
export async function authorizeRequest(options: {
  req: Request;
  permission: BasicPermission;
  httpAuth: HttpAuthService;
  permissions: PermissionsService;
}): Promise<void> {
  const { req, permission, httpAuth, permissions } = options;
  const credentials = await httpAuth.credentials(req);
  const [decision] = await permissions.authorize([{ permission }], {
    credentials,
  });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError(`Not authorized: '${permission.name}'`);
  }
}

/**
 * Create the ADP backend router
 */
export async function createRouter(options: RouterOptions): Promise<Router> {
  const { adpClient, logger, httpAuth, permissions } = options;

  const router = Router();
  router.use(express.json());

  // Expose ADP permissions to the permission framework.
  router.use(createPermissionIntegrationRouter({ permissions: adpPermissions }));

  // Error handler middleware
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  // Permission guard middleware factory
  const requirePermission = (permission: BasicPermission) =>
    asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
      await authorizeRequest({ req, permission, httpAuth, permissions });
      next();
    });

  // ===== Health =====

  router.get('/health', async (_req, res) => {
    try {
      const health = await adpClient.healthCheck();
      res.json({ status: 'ok', adp: health });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'ADP server unavailable',
      });
    }
  });

  // ===== Sessions =====

  router.post(
    '/sessions',
    requirePermission(adpSessionWritePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Creating session', { user: user.userEntityRef, body: req.body });

      const session = await adpClient.createSession({
        ...req.body,
        user_id: req.body.user_id || user.userEntityRef,
      });

      res.status(201).json(session);
    }),
  );

  router.get(
    '/sessions',
    requirePermission(adpSessionReadPermission),
    asyncHandler(async (req, res) => {
      const { limit, offset, status, user_id, service_id } = req.query;

      const sessions = await adpClient.listSessions({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        status: status as string | undefined,
        user_id: user_id as string | undefined,
        service_id: service_id as string | undefined,
      });

      res.json(sessions);
    }),
  );

  router.get(
    '/sessions/:id',
    requirePermission(adpSessionReadPermission),
    asyncHandler(async (req, res) => {
      const session = await adpClient.getSession(req.params.id);
      res.json(session);
    }),
  );

  router.patch(
    '/sessions/:id',
    requirePermission(adpSessionWritePermission),
    asyncHandler(async (req, res) => {
      const session = await adpClient.updateSession(req.params.id, req.body);
      res.json(session);
    }),
  );

  router.delete(
    '/sessions/:id',
    requirePermission(adpSessionWritePermission),
    asyncHandler(async (req, res) => {
      await adpClient.endSession(req.params.id);
      res.status(204).send();
    }),
  );

  router.patch(
    '/sessions/:id/heartbeat',
    requirePermission(adpSessionWritePermission),
    asyncHandler(async (req, res) => {
      await adpClient.heartbeat(req.params.id);
      res.status(204).send();
    }),
  );

  // ===== Context =====

  router.post(
    '/context',
    requirePermission(adpContextReadPermission),
    asyncHandler(async (req, res) => {
      logger.debug('Getting context', { body: req.body });
      const context = await adpClient.getContext(req.body);
      res.json(context);
    }),
  );

  // ===== Governance =====

  router.post(
    '/governance/check',
    requirePermission(adpGovernanceCheckPermission),
    asyncHandler(async (req, res) => {
      logger.debug('Checking action', { body: req.body });
      const result = await adpClient.checkAction(req.body);
      res.json(result);
    }),
  );

  router.post(
    '/governance/approvals',
    requirePermission(adpApprovalRequestPermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Requesting approval', { user: user.userEntityRef, body: req.body });

      const approval = await adpClient.requestApproval(req.body);
      res.status(201).json(approval);
    }),
  );

  router.get(
    '/governance/approvals',
    requirePermission(adpApprovalReadPermission),
    asyncHandler(async (req, res) => {
      const { limit, offset, status, session_id } = req.query;

      const approvals = await adpClient.listApprovals({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        status: status as string | undefined,
        session_id: session_id as string | undefined,
      });

      res.json(approvals);
    }),
  );

  router.get(
    '/governance/approvals/pending',
    requirePermission(adpApprovalReadPermission),
    asyncHandler(async (req, res) => {
      const { limit, offset } = req.query;

      const approvals = await adpClient.listPendingApprovals({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.json(approvals);
    }),
  );

  router.get(
    '/governance/approvals/:id',
    requirePermission(adpApprovalReadPermission),
    asyncHandler(async (req, res) => {
      const approval = await adpClient.getApproval(req.params.id);
      res.json(approval);
    }),
  );

  router.patch(
    '/governance/approvals/:id',
    requirePermission(adpApprovalResolvePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Resolving approval', {
        approvalId: req.params.id,
        user: user.userEntityRef,
        body: req.body,
      });

      const approval = await adpClient.resolveApproval(req.params.id, {
        ...req.body,
        approver_id: req.body.approver_id || user.userEntityRef,
      });

      res.json(approval);
    }),
  );

  // ===== Audit =====

  router.post(
    '/audit/decisions',
    requirePermission(adpDecisionWritePermission),
    asyncHandler(async (req, res) => {
      logger.debug('Logging decision', { body: req.body });
      const decision = await adpClient.logDecision(req.body);
      res.status(201).json(decision);
    }),
  );

  router.get(
    '/audit/decisions',
    requirePermission(adpDecisionReadPermission),
    asyncHandler(async (req, res) => {
      const { limit, offset, session_id, result, since, until } = req.query;

      const decisions = await adpClient.listDecisions({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        session_id: session_id as string | undefined,
        result: result as string | undefined,
        since: since as string | undefined,
        until: until as string | undefined,
      });

      res.json(decisions);
    }),
  );

  router.get(
    '/audit/decisions/:id',
    requirePermission(adpDecisionReadPermission),
    asyncHandler(async (req, res) => {
      const decision = await adpClient.getDecision(req.params.id);
      res.json(decision);
    }),
  );

  router.get(
    '/audit/decisions/:id/lineage',
    requirePermission(adpDecisionReadPermission),
    asyncHandler(async (req, res) => {
      const { depth } = req.query;
      const lineage = await adpClient.getDecisionLineage(
        req.params.id,
        depth ? Number(depth) : undefined,
      );
      res.json(lineage);
    }),
  );

  // ===== Commits =====

  router.post(
    '/commits/prepare',
    requirePermission(adpCommitWritePermission),
    asyncHandler(async (req, res) => {
      logger.debug('Preparing commit', { body: req.body });
      const result = await adpClient.prepareCommit(req.body);
      res.status(201).json(result);
    }),
  );

  router.post(
    '/commits/verify',
    requirePermission(adpCommitWritePermission),
    asyncHandler(async (req, res) => {
      logger.debug('Verifying commit', { body: req.body });
      const result = await adpClient.verifyCommit(req.body);
      res.json(result);
    }),
  );

  // ===== Services =====

  router.post(
    '/services',
    requirePermission(adpServiceWritePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Creating service', { user: user.userEntityRef, body: req.body });

      const service = await adpClient.createService(req.body);
      res.status(201).json(service);
    }),
  );

  router.get(
    '/services',
    requirePermission(adpServiceReadPermission),
    asyncHandler(async (req, res) => {
      const { limit, offset, owner_team } = req.query;

      const services = await adpClient.listServices({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        owner_team: owner_team as string | undefined,
      });

      res.json(services);
    }),
  );

  router.get(
    '/services/:id',
    requirePermission(adpServiceReadPermission),
    asyncHandler(async (req, res) => {
      const service = await adpClient.getService(req.params.id);
      res.json(service);
    }),
  );

  router.patch(
    '/services/:id',
    requirePermission(adpServiceWritePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Updating service', {
        serviceId: req.params.id,
        user: user.userEntityRef,
        body: req.body,
      });

      const service = await adpClient.updateService(req.params.id, req.body);
      res.json(service);
    }),
  );

  router.delete(
    '/services/:id',
    requirePermission(adpServiceDeletePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Deleting service', {
        serviceId: req.params.id,
        user: user.userEntityRef,
      });

      await adpClient.deleteService(req.params.id);
      res.status(204).send();
    }),
  );

  // ===== Reports =====

  router.get(
    '/reports/summary',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (_req, res) => {
      const summary = await adpClient.getReportSummary();
      res.json(summary);
    }),
  );

  router.get(
    '/reports/governance',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (req, res) => {
      const { start, end, granularity } = req.query;

      const report = await adpClient.getGovernanceReport({
        start: start as string | undefined,
        end: end as string | undefined,
        granularity: granularity as 'hour' | 'day' | 'week' | 'month' | undefined,
      });

      res.json(report);
    }),
  );

  router.get(
    '/reports/escalations',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (req, res) => {
      const { start, end } = req.query;

      const report = await adpClient.getEscalationReport({
        start: start as string | undefined,
        end: end as string | undefined,
      });

      res.json(report);
    }),
  );

  router.get(
    '/reports/by-service/:serviceId',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (req, res) => {
      const { start, end } = req.query;

      const report = await adpClient.getServiceReport(req.params.serviceId, {
        start: start as string | undefined,
        end: end as string | undefined,
      });

      res.json(report);
    }),
  );

  router.get(
    '/reports/by-user/:userId',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (req, res) => {
      const { start, end } = req.query;

      const report = await adpClient.getUserReport(req.params.userId, {
        start: start as string | undefined,
        end: end as string | undefined,
      });

      res.json(report);
    }),
  );

  router.get(
    '/reports/compliance',
    requirePermission(adpReportReadPermission),
    asyncHandler(async (req, res) => {
      const { start, end, format } = req.query;

      if (!start || !end || !format) {
        res.status(400).json({ error: 'start, end, and format are required' });
        return;
      }

      const report = await adpClient.exportComplianceReport({
        start: start as string,
        end: end as string,
        format: format as 'json' | 'csv' | 'prometheus',
      });

      // Set content type based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      } else if (format === 'prometheus') {
        res.setHeader('Content-Type', 'text/plain');
      }

      res.json(report);
    }),
  );

  // ===== Documentation (ADP documentation engine output) =====

  router.get(
    '/docs',
    requirePermission(adpDocsReadPermission),
    asyncHandler(async (req, res) => {
      const { category, session_id, query, limit } = req.query;

      const docs = await adpClient.listDocs({
        category: category as string | undefined,
        session_id: session_id as string | undefined,
        query: query as string | undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(docs);
    }),
  );

  router.get(
    '/docs/:id',
    requirePermission(adpDocsReadPermission),
    asyncHandler(async (req, res) => {
      const doc = await adpClient.getDoc(req.params.id);
      res.json(doc);
    }),
  );

  // ===== Enforcement (reconciliation findings) =====

  router.get(
    '/enforcement/findings',
    requirePermission(adpEnforcementReadPermission),
    asyncHandler(async (req, res) => {
      const { status } = req.query;
      const findings = await adpClient.listFindings({
        status: status as string | undefined,
      });
      res.json(findings);
    }),
  );

  router.patch(
    '/enforcement/findings/:id',
    requirePermission(adpEnforcementResolvePermission),
    asyncHandler(async (req, res) => {
      const user = await getUserFromRequest(req, httpAuth);
      logger.info('Resolving finding', {
        findingId: req.params.id,
        user: user.userEntityRef,
        status: req.body.status,
      });
      const finding = await adpClient.resolveFinding(req.params.id, req.body.status);
      res.json(finding);
    }),
  );

  // Error handling middleware
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NotAllowedError) {
      logger.warn('Authorization denied', { error: err.message });
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    logger.error('Request error', { error: err.message, stack: err.stack });
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return router;
}
