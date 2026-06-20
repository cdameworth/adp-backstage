import React from 'react';
import {
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { ApprovalsQueue } from '../components/ApprovalsQueue';

/**
 * Approvals management page
 */
export const ApprovalsPage = () => {
  return (
    <Content>
      <ContentHeader title="Approval Requests">
        <SupportButton>
          Review and resolve escalated agent actions requiring human approval.
        </SupportButton>
      </ContentHeader>
      <ApprovalsQueue />
    </Content>
  );
};
