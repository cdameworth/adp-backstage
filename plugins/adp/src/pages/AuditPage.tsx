import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { DecisionTimeline } from '../components/DecisionTimeline';
import { DecisionLineageGraph } from '../components/DecisionLineageGraph';

/**
 * Audit and decision lineage page
 */
export const AuditPage = () => {
  const { decisionId } = useParams<{ decisionId?: string }>();

  if (decisionId) {
    return (
      <Content>
        <ContentHeader title="Decision Lineage">
          <SupportButton>
            Visualize the decision chain and relationships.
          </SupportButton>
        </ContentHeader>
        <DecisionLineageGraph decisionId={decisionId} />
      </Content>
    );
  }

  return (
    <Content>
      <ContentHeader title="Audit Log">
        <SupportButton>
          Explore agent decisions with full reasoning traces and lineage.
        </SupportButton>
      </ContentHeader>
      <DecisionTimeline />
    </Content>
  );
};
