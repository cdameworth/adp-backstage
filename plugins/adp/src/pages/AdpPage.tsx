import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Content,
  Header,
  Page,
  HeaderTabs,
} from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { SessionsPage } from './SessionsPage';
import { ApprovalsPage } from './ApprovalsPage';
import { AuditPage } from './AuditPage';
import { ReportsPage } from './ReportsPage';
import { ExecutiveDashboard } from '../components/ExecutiveDashboard';
import { UngovernedActivity } from '../components/UngovernedActivity';
import { rootRouteRef } from '../routes';

interface TabDef {
  id: string;
  label: string;
  /** Sub-path relative to the plugin root; '' is the overview tab. */
  path: string;
}

export const adpTabs: TabDef[] = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'sessions', label: 'Sessions', path: 'sessions' },
  { id: 'approvals', label: 'Approvals', path: 'approvals' },
  { id: 'audit', label: 'Audit', path: 'audit' },
  { id: 'reports', label: 'Reports', path: 'reports' },
  { id: 'enforcement', label: 'Enforcement', path: 'enforcement' },
];

/**
 * Resolve the active tab index from the current pathname.
 *
 * Pure helper, exported for unit testing. `rootPath` is the mounted path of the
 * plugin root (e.g. `/adp`), so this works regardless of the app's base path.
 */
export function resolveActiveTabIndex(
  pathname: string,
  rootPath: string,
): number {
  const sub = pathname.startsWith(rootPath)
    ? pathname.slice(rootPath.length).replace(/^\//, '').split('/')[0]
    : '';
  const index = adpTabs.findIndex(tab => tab.path === sub);
  return index === -1 ? 0 : index;
}

/**
 * Main ADP page with router-driven navigation tabs.
 */
export const AdpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const rootPath = useRouteRef(rootRouteRef)();

  const selectedIndex = resolveActiveTabIndex(location.pathname, rootPath);

  const handleTabChange = (index: number) => {
    const { path } = adpTabs[index];
    navigate(path ? `${rootPath}/${path}` : rootPath);
  };

  return (
    <Page themeId="tool">
      <Header
        title="Agent Developer Portal"
        subtitle="Governance, Context, and Audit for AI Agents"
      />
      <HeaderTabs
        selectedIndex={selectedIndex}
        onChange={handleTabChange}
        tabs={adpTabs.map(tab => ({ id: tab.id, label: tab.label }))}
      />
      <Content>
        <Routes>
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/sessions/*" element={<SessionsPage />} />
          <Route path="/approvals/*" element={<ApprovalsPage />} />
          <Route path="/audit/*" element={<AuditPage />} />
          <Route path="/reports/*" element={<ReportsPage />} />
          <Route path="/enforcement/*" element={<UngovernedActivity />} />
        </Routes>
      </Content>
    </Page>
  );
};
