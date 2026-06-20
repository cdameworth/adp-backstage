import { createPermission } from '@backstage/plugin-permission-common';

/**
 * Permissions exposed by the ADP backend plugin.
 *
 * These are *basic* permissions: the permission policy in the host Backstage
 * backend decides ALLOW/DENY per permission name. When the permission system is
 * disabled (the default, `permission.enabled: false`), every authorize call
 * resolves to ALLOW, so guarding routes with these is non-breaking until an org
 * opts in.
 */

// Sessions
export const adpSessionReadPermission = createPermission({
  name: 'adp.session.read',
  attributes: { action: 'read' },
});
export const adpSessionWritePermission = createPermission({
  name: 'adp.session.write',
  attributes: { action: 'update' },
});

// Context
export const adpContextReadPermission = createPermission({
  name: 'adp.context.read',
  attributes: { action: 'read' },
});

// Governance
export const adpGovernanceCheckPermission = createPermission({
  name: 'adp.governance.check',
  attributes: { action: 'read' },
});
export const adpApprovalReadPermission = createPermission({
  name: 'adp.approval.read',
  attributes: { action: 'read' },
});
export const adpApprovalRequestPermission = createPermission({
  name: 'adp.approval.request',
  attributes: { action: 'create' },
});
/** Sensitive: approving or denying an escalated agent action. */
export const adpApprovalResolvePermission = createPermission({
  name: 'adp.approval.resolve',
  attributes: { action: 'update' },
});

// Audit
export const adpDecisionReadPermission = createPermission({
  name: 'adp.decision.read',
  attributes: { action: 'read' },
});
export const adpDecisionWritePermission = createPermission({
  name: 'adp.decision.write',
  attributes: { action: 'create' },
});

// Commits
export const adpCommitWritePermission = createPermission({
  name: 'adp.commit.write',
  attributes: { action: 'create' },
});

// Services
export const adpServiceReadPermission = createPermission({
  name: 'adp.service.read',
  attributes: { action: 'read' },
});
export const adpServiceWritePermission = createPermission({
  name: 'adp.service.write',
  attributes: { action: 'update' },
});
/** Sensitive: removing a service from ADP. */
export const adpServiceDeletePermission = createPermission({
  name: 'adp.service.delete',
  attributes: { action: 'delete' },
});

// Reports
export const adpReportReadPermission = createPermission({
  name: 'adp.report.read',
  attributes: { action: 'read' },
});

// Documentation
export const adpDocsReadPermission = createPermission({
  name: 'adp.docs.read',
  attributes: { action: 'read' },
});

// Enforcement (reconciliation findings)
export const adpEnforcementReadPermission = createPermission({
  name: 'adp.enforcement.read',
  attributes: { action: 'read' },
});
/** Sensitive: acknowledging/resolving an ungoverned-activity finding. */
export const adpEnforcementResolvePermission = createPermission({
  name: 'adp.enforcement.resolve',
  attributes: { action: 'update' },
});

/** All ADP permissions, for registration with the permission framework. */
export const adpPermissions = [
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
];
