/**
 * ADP Frontend Plugin for Backstage
 *
 * This plugin provides UI components for the Agent Developer Portal,
 * including session management, approval workflows, and decision lineage visualization.
 *
 * @packageDocumentation
 */

export {
  adpPlugin,
  AdpPage,
  AdpSessionsPage,
  AdpApprovalsPage,
  AdpAuditPage,
  AdpReportsPage,
  EntityAdpContent,
  AdpGovernanceDocsAddon,
} from './plugin';

export { adpApiRef, AdpClient } from './api';
export type {
  AdpApi,
  Session,
  Decision,
  Approval,
  Service,
  ContextResponse,
  PolicyCheckResult,
  ReportSummary,
  GovernanceReport,
  EscalationReport,
  LineageGraph,
  AdpDoc,
  Finding,
} from './api';

// Components
export { SessionsTable } from './components/SessionsTable';
export { ApprovalsQueue } from './components/ApprovalsQueue';
export { DecisionTimeline } from './components/DecisionTimeline';
export { DecisionLineageGraph } from './components/DecisionLineageGraph';
export { ExecutiveDashboard } from './components/ExecutiveDashboard';
export { GovernanceEffectiveness } from './components/GovernanceEffectiveness';
export { EscalationAnalytics } from './components/EscalationAnalytics';
export { ServiceAgentActivity } from './components/ServiceAgentActivity';
export { AdpGovernanceDocs } from './components/AdpGovernanceDocs';
export { UngovernedActivity } from './components/UngovernedActivity';
