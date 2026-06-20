import React, { useState } from 'react';
import {
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import {
  Tabs,
  Tab,
  Box,
} from '@material-ui/core';
import { GovernanceEffectiveness } from '../components/GovernanceEffectiveness';
import { EscalationAnalytics } from '../components/EscalationAnalytics';
import { ComplianceExport } from '../components/ComplianceExport';
import { AdoptionMetrics } from '../components/AdoptionMetrics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box pt={3}>{children}</Box>}
    </div>
  );
}

/**
 * Reports and analytics page
 */
export const ReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Content>
      <ContentHeader title="Reports & Analytics">
        <SupportButton>
          Analyze agent activity, governance effectiveness, and compliance metrics.
        </SupportButton>
      </ContentHeader>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Governance" />
        <Tab label="Escalations" />
        <Tab label="Adoption" />
        <Tab label="Compliance Export" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <GovernanceEffectiveness />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <EscalationAnalytics />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AdoptionMetrics />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ComplianceExport />
      </TabPanel>
    </Content>
  );
};
