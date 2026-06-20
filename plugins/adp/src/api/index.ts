import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

/**
 * Session data
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
 * Decision record
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
 * Approval request
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
 * Service definition
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
 * Context response
 */
export interface ContextResponse {
  session_id: string;
  service_id: string;
  task?: string;
  layers: {
    essential: { content: string; tokens: number; sources: string[] };
    task_relevant?: { content: string; tokens: number; sources: string[] };
    supporting?: { content: string; tokens: number; sources: string[] };
  };
  total_tokens: number;
  cache_hit: boolean;
  retrieval_time_ms: number;
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
 * Report summary for executive dashboard
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
 * Governance effectiveness report
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
 * Escalation analytics report
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
 * Lineage graph node
 */
export interface LineageNode {
  id: string;
  type: 'decision' | 'session' | 'commit' | 'service' | 'policy';
  label: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

/**
 * Lineage graph edge
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
 * List response wrapper
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Generated documentation record (from the ADP documentation engine).
 * `content` is Markdown. `category` is session_summary | risk_report | pattern_report.
 */
export interface AdpDoc {
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
 * ADP API interface
 */
export interface AdpApi {
  // Sessions
  getSessions(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    service_id?: string;
  }): Promise<ListResponse<Session>>;
  getSession(sessionId: string): Promise<Session>;

  // Approvals
  getApprovals(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<ListResponse<Approval>>;
  getPendingApprovals(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ListResponse<Approval>>;
  resolveApproval(
    approvalId: string,
    decision: { status: 'approved' | 'denied'; comment?: string },
  ): Promise<Approval>;

  // Decisions/Audit
  getDecisions(params?: {
    limit?: number;
    offset?: number;
    session_id?: string;
    result?: string;
    since?: string;
    until?: string;
  }): Promise<ListResponse<Decision>>;
  getDecision(decisionId: string): Promise<Decision>;
  getDecisionLineage(decisionId: string, depth?: number): Promise<LineageGraph>;

  // Services
  getServices(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ListResponse<Service>>;
  getService(serviceId: string): Promise<Service>;

  // Reports
  getReportSummary(): Promise<ReportSummary>;
  getGovernanceReport(params?: {
    start?: string;
    end?: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<GovernanceReport>;
  getEscalationReport(params?: {
    start?: string;
    end?: string;
  }): Promise<EscalationReport>;
  getServiceReport(
    serviceId: string,
    params?: { start?: string; end?: string },
  ): Promise<unknown>;

  // Documentation (ADP documentation engine output)
  getDocs(params?: {
    category?: string;
    session_id?: string;
    query?: string;
    limit?: number;
  }): Promise<ListResponse<AdpDoc>>;
  getDoc(docId: string): Promise<AdpDoc>;

  // Enforcement (reconciliation backstop)
  getFindings(params?: {
    status?: string;
  }): Promise<{ items: Finding[]; total: number }>;
  resolveFinding(
    id: string,
    status: 'open' | 'acknowledged' | 'resolved',
  ): Promise<Finding>;
}

/**
 * API reference for the ADP API
 */
export const adpApiRef = createApiRef<AdpApi>({
  id: 'plugin.adp.api',
});

/**
 * ADP API client implementation
 */
export class AdpClient implements AdpApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = await this.discoveryApi.getBaseUrl('adp');
    // fetchApi attaches the Backstage identity/service token, which the
    // adp-backend plugin's default auth policy requires for every route
    // except /health.
    const response = await this.fetchApi.fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`ADP API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Sessions
  async getSessions(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    service_id?: string;
  }): Promise<ListResponse<Session>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    if (params?.service_id) query.set('service_id', params.service_id);
    const queryStr = query.toString();
    return this.fetch(`/sessions${queryStr ? `?${queryStr}` : ''}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetch(`/sessions/${sessionId}`);
  }

  // Approvals
  async getApprovals(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<ListResponse<Approval>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    const queryStr = query.toString();
    return this.fetch(`/governance/approvals${queryStr ? `?${queryStr}` : ''}`);
  }

  async getPendingApprovals(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ListResponse<Approval>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryStr = query.toString();
    return this.fetch(`/governance/approvals/pending${queryStr ? `?${queryStr}` : ''}`);
  }

  async resolveApproval(
    approvalId: string,
    decision: { status: 'approved' | 'denied'; comment?: string },
  ): Promise<Approval> {
    return this.fetch(`/governance/approvals/${approvalId}`, {
      method: 'PATCH',
      body: JSON.stringify(decision),
    });
  }

  // Decisions/Audit
  async getDecisions(params?: {
    limit?: number;
    offset?: number;
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
    return this.fetch(`/audit/decisions${queryStr ? `?${queryStr}` : ''}`);
  }

  async getDecision(decisionId: string): Promise<Decision> {
    return this.fetch(`/audit/decisions/${decisionId}`);
  }

  async getDecisionLineage(decisionId: string, depth?: number): Promise<LineageGraph> {
    const query = depth ? `?depth=${depth}` : '';
    return this.fetch(`/audit/decisions/${decisionId}/lineage${query}`);
  }

  // Services
  async getServices(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ListResponse<Service>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryStr = query.toString();
    return this.fetch(`/services${queryStr ? `?${queryStr}` : ''}`);
  }

  async getService(serviceId: string): Promise<Service> {
    return this.fetch(`/services/${serviceId}`);
  }

  // Reports
  async getReportSummary(): Promise<ReportSummary> {
    return this.fetch('/reports/summary');
  }

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
    return this.fetch(`/reports/governance${queryStr ? `?${queryStr}` : ''}`);
  }

  async getEscalationReport(params?: {
    start?: string;
    end?: string;
  }): Promise<EscalationReport> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryStr = query.toString();
    return this.fetch(`/reports/escalations${queryStr ? `?${queryStr}` : ''}`);
  }

  async getServiceReport(
    serviceId: string,
    params?: { start?: string; end?: string },
  ): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryStr = query.toString();
    return this.fetch(`/reports/by-service/${serviceId}${queryStr ? `?${queryStr}` : ''}`);
  }

  // Documentation
  async getDocs(params?: {
    category?: string;
    session_id?: string;
    query?: string;
    limit?: number;
  }): Promise<ListResponse<AdpDoc>> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.session_id) query.set('session_id', params.session_id);
    if (params?.query) query.set('query', params.query);
    if (params?.limit) query.set('limit', String(params.limit));
    const queryStr = query.toString();
    return this.fetch(`/docs${queryStr ? `?${queryStr}` : ''}`);
  }

  async getDoc(docId: string): Promise<AdpDoc> {
    return this.fetch(`/docs/${docId}`);
  }

  // Enforcement
  async getFindings(params?: {
    status?: string;
  }): Promise<{ items: Finding[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    const queryStr = query.toString();
    return this.fetch(`/enforcement/findings${queryStr ? `?${queryStr}` : ''}`);
  }

  async resolveFinding(
    id: string,
    status: 'open' | 'acknowledged' | 'resolved',
  ): Promise<Finding> {
    return this.fetch(`/enforcement/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}
