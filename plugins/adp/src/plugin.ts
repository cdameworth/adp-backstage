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

/*
 * Sessions/Approvals/Audit/Reports are rendered by AdpPage's internal router
 * (mounted at /adp/*), so they are not separate routable extensions — those
 * sub-route refs are bound via the plugin `routes` map above.
 */

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
