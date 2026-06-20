import {
  createPlugin,
  createApiFactory,
  createRoutableExtension,
  createComponentExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import {
  createTechDocsAddonExtension,
  TechDocsAddonLocations,
} from '@backstage/plugin-techdocs-react';
import { adpApiRef, AdpClient } from './api';
import { AdpGovernanceDocs as AdpGovernanceDocsComponent } from './components/AdpGovernanceDocs';
import { rootRouteRef, sessionsRouteRef, approvalsRouteRef, auditRouteRef, reportsRouteRef } from './routes';

/**
 * ADP frontend plugin for Backstage
 *
 * This plugin provides:
 * - Session management UI
 * - Approval workflow interface
 * - Decision audit trail viewer
 * - Lineage visualization
 * - Reporting dashboards
 */
export const adpPlugin = createPlugin({
  id: 'adp',
  apis: [
    createApiFactory({
      api: adpApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new AdpClient({ discoveryApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
    sessions: sessionsRouteRef,
    approvals: approvalsRouteRef,
    audit: auditRouteRef,
    reports: reportsRouteRef,
  },
});

/**
 * Main ADP page component
 */
export const AdpPage = adpPlugin.provide(
  createRoutableExtension({
    name: 'AdpPage',
    component: () => import('./pages/AdpPage').then(m => m.AdpPage),
    mountPoint: rootRouteRef,
  }),
);

/**
 * Sessions page component
 */
export const AdpSessionsPage = adpPlugin.provide(
  createRoutableExtension({
    name: 'AdpSessionsPage',
    component: () => import('./pages/SessionsPage').then(m => m.SessionsPage),
    mountPoint: sessionsRouteRef,
  }),
);

/**
 * Approvals page component
 */
export const AdpApprovalsPage = adpPlugin.provide(
  createRoutableExtension({
    name: 'AdpApprovalsPage',
    component: () => import('./pages/ApprovalsPage').then(m => m.ApprovalsPage),
    mountPoint: approvalsRouteRef,
  }),
);

/**
 * Audit page component
 */
export const AdpAuditPage = adpPlugin.provide(
  createRoutableExtension({
    name: 'AdpAuditPage',
    component: () => import('./pages/AuditPage').then(m => m.AuditPage),
    mountPoint: auditRouteRef,
  }),
);

/**
 * Reports page component
 */
export const AdpReportsPage = adpPlugin.provide(
  createRoutableExtension({
    name: 'AdpReportsPage',
    component: () => import('./pages/ReportsPage').then(m => m.ReportsPage),
    mountPoint: reportsRouteRef,
  }),
);

/**
 * Entity content component for catalog entities
 */
export const EntityAdpContent = adpPlugin.provide(
  createComponentExtension({
    name: 'EntityAdpContent',
    component: {
      lazy: () =>
        import('./components/EntityAdpContent').then(m => m.EntityAdpContent),
    },
  }),
);

/**
 * TechDocs Addon that surfaces ADP documentation-engine output (session
 * summaries, risk/pattern reports) in the TechDocs reader's secondary sidebar
 * for the entity being viewed. Mount inside `<TechDocsAddons>` on the entity
 * TechDocs route — see the plugins README.
 */
export const AdpGovernanceDocsAddon = adpPlugin.provide(
  createTechDocsAddonExtension({
    name: 'AdpGovernanceDocs',
    location: TechDocsAddonLocations.SecondarySidebar,
    component: AdpGovernanceDocsComponent,
  }),
);
