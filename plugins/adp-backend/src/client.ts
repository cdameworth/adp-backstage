import fetch, { Response } from 'node-fetch';
import { LoggerService } from '@backstage/backend-plugin-api';

/**
 * Configuration for the ADP client
 */
export interface AdpClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  logger?: LoggerService;
}

/**
 * Agent session with trust level and context
 */
export interface Session {
  id: string;
  agent_tool: string;
  user_id: string;
  organization_id: string;
  service_id?: string;
  trust_level: number;
  status: 'active' | 'ended' | 'expired';
  started_at: string;
  ended_at?: string;
  last_heartbeat?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Decision record with reasoning trace
 */
export interface Decision {
  id: string;
  session_id: string;
  action_type: string;
  target: string;
  result: 'allowed' | 'denied' | 'escalated';
  reasoning?: string;
  confidence_score?: number;
  policy_names?: string[];
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Approval request for escalated actions
 */
export interface Approval {
  id: string;
  session_id: string;
  action: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requested_at: string;
  resolved_at?: string;
  approver_id?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service in the catalog
 */
export interface Service {
  id: string;
  name: string;
  description?: string;
  owner_team?: string;
  owner_user?: string;
  repository_url?: string;
  context_config?: {
    essential_paths?: string[];
    excluded_patterns?: string[];
    token_budget?: {
      essential?: number;
      task_relevant?: number;
      supporting?: number;
    };
  };
  escalation_config?: {
    default_approvers?: string[];
    approval_timeout_hours?: number;
  };
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

/**
 * Context response with layered content
 */
export interface ContextResponse {
  session_id: string;
  service_id: string;
  task?: string;
  layers: {
    essential: ContextLayer;
    task_relevant?: ContextLayer;
    supporting?: ContextLayer;
  };
  total_tokens: number;
  cache_hit: boolean;
  retrieval_time_ms: number;
}

/**
 * Single layer of context
 */
export interface ContextLayer {
  content: string;
  tokens: number;
  sources: string[];
}

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  allowed: boolean;
  policies_evaluated: string[];
  denied_by?: string[];
  warnings?: string[];
  requires_approval: boolean;
  approval_reason?: string;
}

/**
 * Commit preparation result
 */
export interface CommitPrepareResult {
  token: string;
  session_id: string;
  files: string[];
  expires_at: string;
}

/**
 * Commit verification result
 */
export interface CommitVerifyResult {
  verified: boolean;
  session_id?: string;
  reason?: string;
}

/**
 * Report summary
 */
export interface ReportSummary {
  active_sessions: number;
  decisions_today: number;
  decisions_average_7d: number;
  escalation_queue_depth: number;
  policy_health_score: number;
  adoption_trend_30d: number[];
}

/**
 * Governance report
 */
export interface GovernanceReport {
  time_range: { start: string; end: string };
  policy_evaluations: {
    total: number;
    allowed: number;
    denied: number;
    escalated: number;
  };
  policies_by_denial_rate: Array<{
    policy_name: string;
    evaluations: number;
    denial_rate: number;
  }>;
  false_positive_trend: Array<{ date: string; rate: number }>;
}

/**
 * Escalation report
 */
export interface EscalationReport {
  time_range: { start: string; end: string };
  total_escalations: number;
  approval_rate: number;
  rejection_rate: number;
  average_resolution_time_hours: number;
  escalations_by_policy: Array<{
    policy_name: string;
    count: number;
  }>;
}

/**
 * Decision lineage graph node
 */
export interface LineageNode {
  id: string;
  type: 'decision' | 'session' | 'commit' | 'service' | 'policy';
  label: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

/**
 * Decision lineage graph edge
 */
export interface LineageEdge {
  source: string;
  target: string;
  relationship: string;
}

/**
 * Decision lineage graph
 */
export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * List response wrapper
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Generated documentation record from the ADP documentation engine.
 * `content` is Markdown.
 */
export interface Doc {
  id: string;
  session_id?: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Ungoverned-activity finding from the reconciliation backstop.
 */
export interface Finding {
  id: string;
  type: string;
  reference: string;
  repo?: string;
  ref?: string;
  author?: string;
  reason: string;
  status: 'open' | 'acknowledged' | 'resolved';
  detected_at: string;
  updated_at: string;
}

/**
 * Client for communicating with ADP server
 */
export class AdpClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;
  private readonly logger?: LoggerService;

  constructor(config: AdpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.logger = config.logger;
  }

  /**
   * Make authenticated request to ADP server
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      this.logger?.debug('ADP request', { method, url });

      const response: Response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal as AbortSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger?.error('ADP request failed', {
          method,
          url,
          status: response.status,
          body: errorBody,
        });
        throw new Error(`ADP request failed: ${response.status} ${errorBody}`);
      }

      const data = await response.json() as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`ADP request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('GET', '/health');
  }

  // ===== Session Management =====

  /**
   * Create a new agent session
   */
  async createSession(params: {
    agent_tool: string;
    user_id: string;
    organization_id: string;
    service_id?: string;
    trust_level?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Session> {
    return this.request('POST', '/v1/sessions', params);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    return this.request('GET', `/v1/sessions/${sessionId}`);
  }

  /**
   * List sessions with optional filters
   */
  async listSessions(params?: PaginationParams & {
    status?: string;
    user_id?: string;
    service_id?: string;
  }): Promise<ListResponse<Session>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    if (params?.user_id) query.set('user_id', params.user_id);
    if (params?.service_id) query.set('service_id', params.service_id);
    const queryStr = query.toString();
    return this.request('GET', `/v1/sessions${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, params: {
    trust_level?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Session> {
    return this.request('PATCH', `/v1/sessions/${sessionId}`, params);
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.request('DELETE', `/v1/sessions/${sessionId}`);
  }

  /**
   * Send heartbeat for session
   */
  async heartbeat(sessionId: string): Promise<void> {
    await this.request('PATCH', `/v1/sessions/${sessionId}/heartbeat`);
  }

  // ===== Context Orchestration =====

  /**
   * Get context for a session
   */
  async getContext(params: {
    session_id: string;
    service_id: string;
    task?: string;
    token_budget?: {
      essential?: number;
      task_relevant?: number;
      supporting?: number;
    };
  }): Promise<ContextResponse> {
    return this.request('POST', '/v1/context', params);
  }

  // ===== Governance =====

  /**
   * Check if an action is allowed
   */
  async checkAction(params: {
    session_id: string;
    action_type: string;
    target: string;
    metadata?: Record<string, unknown>;
  }): Promise<PolicyCheckResult> {
    return this.request('POST', '/v1/governance/check', params);
  }

  /**
   * Request approval for an escalated action
   */
  async requestApproval(params: {
    session_id: string;
    action: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<Approval> {
    return this.request('POST', '/v1/governance/approvals', params);
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<Approval> {
    return this.request('GET', `/v1/governance/approvals/${approvalId}`);
  }

  /**
   * List approvals
   */
  async listApprovals(params?: PaginationParams & {
    status?: string;
    session_id?: string;
  }): Promise<ListResponse<Approval>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    if (params?.session_id) query.set('session_id', params.session_id);
    const queryStr = query.toString();
    return this.request('GET', `/v1/governance/approvals${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * List pending approvals
   */
  async listPendingApprovals(params?: PaginationParams): Promise<ListResponse<Approval>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryStr = query.toString();
    return this.request('GET', `/v1/governance/approvals/pending${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Resolve an approval request
   */
  async resolveApproval(approvalId: string, params: {
    status: 'approved' | 'denied';
    approver_id: string;
    comment?: string;
  }): Promise<Approval> {
    return this.request('PATCH', `/v1/governance/approvals/${approvalId}`, params);
  }

  // ===== Audit =====

  /**
   * Log a decision
   */
  async logDecision(params: {
    session_id: string;
    action_type: string;
    target: string;
    result: 'allowed' | 'denied' | 'escalated';
    reasoning?: string;
    confidence_score?: number;
    policy_names?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<Decision> {
    return this.request('POST', '/v1/audit/decisions', params);
  }

  /**
   * Get decision by ID
   */
  async getDecision(decisionId: string): Promise<Decision> {
    return this.request('GET', `/v1/audit/decisions/${decisionId}`);
  }

  /**
   * List decisions
   */
  async listDecisions(params?: PaginationParams & {
    session_id?: string;
    result?: string;
    since?: string;
    until?: string;
  }): Promise<ListResponse<Decision>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.session_id) query.set('session_id', params.session_id);
    if (params?.result) query.set('result', params.result);
    if (params?.since) query.set('since', params.since);
    if (params?.until) query.set('until', params.until);
    const queryStr = query.toString();
    return this.request('GET', `/v1/audit/decisions${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Get decision lineage graph
   */
  async getDecisionLineage(decisionId: string, depth?: number): Promise<LineageGraph> {
    const query = depth ? `?depth=${depth}` : '';
    return this.request('GET', `/v1/audit/decisions/${decisionId}/lineage${query}`);
  }

  // ===== Commits =====

  /**
   * Prepare a commit for verification
   */
  async prepareCommit(params: {
    session_id: string;
    files: string[];
    message?: string;
  }): Promise<CommitPrepareResult> {
    return this.request('POST', '/v1/commits/prepare', params);
  }

  /**
   * Verify a commit
   */
  async verifyCommit(params: {
    token?: string;
    sha?: string;
  }): Promise<CommitVerifyResult> {
    return this.request('POST', '/v1/commits/verify', params);
  }

  // ===== Services =====

  /**
   * Create a service
   */
  async createService(params: {
    name: string;
    description?: string;
    owner_team?: string;
    owner_user?: string;
    repository_url?: string;
    context_config?: Service['context_config'];
    escalation_config?: Service['escalation_config'];
    metadata?: Record<string, unknown>;
  }): Promise<Service> {
    return this.request('POST', '/v1/services', params);
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<Service> {
    return this.request('GET', `/v1/services/${serviceId}`);
  }

  /**
   * List services
   */
  async listServices(params?: PaginationParams & {
    owner_team?: string;
  }): Promise<ListResponse<Service>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.owner_team) query.set('owner_team', params.owner_team);
    const queryStr = query.toString();
    return this.request('GET', `/v1/services${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Update service
   */
  async updateService(serviceId: string, params: Partial<{
    name: string;
    description: string;
    owner_team: string;
    owner_user: string;
    repository_url: string;
    context_config: Service['context_config'];
    escalation_config: Service['escalation_config'];
    metadata: Record<string, unknown>;
  }>): Promise<Service> {
    return this.request('PATCH', `/v1/services/${serviceId}`, params);
  }

  /**
   * Delete service
   */
  async deleteService(serviceId: string): Promise<void> {
    await this.request('DELETE', `/v1/services/${serviceId}`);
  }

  // ===== Reports =====

  /**
   * Get executive summary report
   */
  async getReportSummary(): Promise<ReportSummary> {
    return this.request('GET', '/v1/reports/summary');
  }

  /**
   * Get governance effectiveness report
   */
  async getGovernanceReport(params?: {
    start?: string;
    end?: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<GovernanceReport> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.granularity) query.set('granularity', params.granularity);
    const queryStr = query.toString();
    return this.request('GET', `/v1/reports/governance${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Get escalation report
   */
  async getEscalationReport(params?: {
    start?: string;
    end?: string;
  }): Promise<EscalationReport> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryStr = query.toString();
    return this.request('GET', `/v1/reports/escalations${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Get service-specific report
   */
  async getServiceReport(serviceId: string, params?: {
    start?: string;
    end?: string;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryStr = query.toString();
    return this.request('GET', `/v1/reports/by-service/${serviceId}${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Get user-specific report
   */
  async getUserReport(userId: string, params?: {
    start?: string;
    end?: string;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryStr = query.toString();
    return this.request('GET', `/v1/reports/by-user/${userId}${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Export compliance report
   */
  async exportComplianceReport(params: {
    start: string;
    end: string;
    format: 'json' | 'csv' | 'prometheus';
  }): Promise<unknown> {
    const query = new URLSearchParams();
    query.set('start', params.start);
    query.set('end', params.end);
    query.set('format', params.format);
    return this.request('GET', `/v1/reports/compliance?${query.toString()}`);
  }

  // ===== Documentation =====

  /**
   * List generated documentation (session summaries, risk/pattern reports).
   */
  async listDocs(params?: {
    category?: string;
    session_id?: string;
    query?: string;
    limit?: number;
  }): Promise<ListResponse<Doc>> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.session_id) query.set('session_id', params.session_id);
    if (params?.query) query.set('query', params.query);
    if (params?.limit) query.set('limit', String(params.limit));
    const queryStr = query.toString();
    return this.request('GET', `/v1/docs${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Get a single generated document by ID. Unwraps the ADP `{data}` envelope.
   */
  async getDoc(docId: string): Promise<Doc> {
    const res = await this.request<{ data: Doc }>('GET', `/v1/docs/${docId}`);
    return res.data;
  }

  // ===== Enforcement (reconciliation) =====

  async listFindings(params?: {
    status?: string;
  }): Promise<{ items: Finding[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    const queryStr = query.toString();
    return this.request('GET', `/v1/enforcement/findings${queryStr ? `?${queryStr}` : ''}`);
  }

  async resolveFinding(
    id: string,
    status: 'open' | 'acknowledged' | 'resolved',
  ): Promise<Finding> {
    const res = await this.request<{ data: Finding }>(
      'PATCH',
      `/v1/enforcement/findings/${id}`,
      { status },
    );
    return res.data;
  }
}
