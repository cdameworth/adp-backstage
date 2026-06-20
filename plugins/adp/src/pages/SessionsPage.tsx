import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { SessionsTable } from '../components/SessionsTable';
import { SessionDetail } from '../components/SessionDetail';

/**
 * Sessions management page
 */
export const SessionsPage = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();

  if (sessionId) {
    return <SessionDetail sessionId={sessionId} />;
  }

  return (
    <Content>
      <ContentHeader title="Agent Sessions">
        <SupportButton>
          View and manage active agent sessions across your organization.
        </SupportButton>
      </ContentHeader>
      <SessionsTable />
    </Content>
  );
};
