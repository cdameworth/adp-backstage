import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

/**
 * Root route for the ADP plugin
 */
export const rootRouteRef = createRouteRef({
  id: 'adp',
});

/**
 * Sessions route
 */
export const sessionsRouteRef = createSubRouteRef({
  id: 'adp:sessions',
  parent: rootRouteRef,
  path: '/sessions',
});

/**
 * Session detail route
 */
export const sessionDetailRouteRef = createSubRouteRef({
  id: 'adp:session-detail',
  parent: rootRouteRef,
  path: '/sessions/:sessionId',
});

/**
 * Approvals route
 */
export const approvalsRouteRef = createSubRouteRef({
  id: 'adp:approvals',
  parent: rootRouteRef,
  path: '/approvals',
});

/**
 * Audit route
 */
export const auditRouteRef = createSubRouteRef({
  id: 'adp:audit',
  parent: rootRouteRef,
  path: '/audit',
});

/**
 * Decision lineage route
 */
export const lineageRouteRef = createSubRouteRef({
  id: 'adp:lineage',
  parent: rootRouteRef,
  path: '/lineage/:decisionId',
});

/**
 * Reports route
 */
export const reportsRouteRef = createSubRouteRef({
  id: 'adp:reports',
  parent: rootRouteRef,
  path: '/reports',
});

/**
 * Services route
 */
export const servicesRouteRef = createSubRouteRef({
  id: 'adp:services',
  parent: rootRouteRef,
  path: '/services',
});

/**
 * Service detail route
 */
export const serviceDetailRouteRef = createSubRouteRef({
  id: 'adp:service-detail',
  parent: rootRouteRef,
  path: '/services/:serviceId',
});

/**
 * Policies route
 */
export const policiesRouteRef = createSubRouteRef({
  id: 'adp:policies',
  parent: rootRouteRef,
  path: '/policies',
});
