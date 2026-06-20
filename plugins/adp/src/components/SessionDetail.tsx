import React from 'react';
import { useAsync } from 'react-use';
import {
  Progress,
  InfoCard,
  StructuredMetadataTable,
  StatusOK,
  StatusPending,
  StatusError,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Grid, Chip, Box, Typography } from '@material-ui/core';
import { adpApiRef } from '../api';
import { DecisionTimeline } from './DecisionTimeline';

interface SessionDetailProps {
  sessionId: string;
}

const trustLevelLabels: Record<number, string> = {
  1: 'Observer',
  2: 'Contributor',
  3: 'Developer',
  4: 'Maintainer',
  5: 'Admin',
};

/**
 * Session detail view with activity timeline
 */
export const SessionDetail = ({ sessionId }: SessionDetailProps) => {
  const adpApi = useApi(adpApiRef);

  const { value: session, loading, error } = useAsync(async () => {
    return adpApi.getSession(sessionId);
  }, [sessionId]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load session: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box p={2}>
        <Typography>Session not found</Typography>
      </Box>
    );
  }

  const statusComponent = () => {
    switch (session.status) {
      case 'active':
        return <StatusOK>Active</StatusOK>;
      case 'ended':
        return <StatusPending>Ended</StatusPending>;
      case 'expired':
        return <StatusError>Expired</StatusError>;
      default:
        return session.status;
    }
  };

  const metadata = {
    'Session ID': session.id,
    'Status': statusComponent(),
    'Agent Tool': <Chip label={session.agent_tool} size="small" />,
    'Trust Level': (
      <Chip
        label={trustLevelLabels[session.trust_level] || `Level ${session.trust_level}`}
        size="small"
        color="primary"
      />
    ),
    'User': session.user_id || '-',
    'Organization': session.organization_id,
    'Service': session.service_id || '-',
    'Started': new Date(session.started_at).toLocaleString(),
    'Last Heartbeat': session.last_heartbeat
      ? new Date(session.last_heartbeat).toLocaleString()
      : '-',
    'Ended': session.ended_at
      ? new Date(session.ended_at).toLocaleString()
      : '-',
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <InfoCard title="Session Details">
          <StructuredMetadataTable metadata={metadata} />
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={8}>
        <InfoCard title="Activity Timeline">
          <DecisionTimeline sessionId={sessionId} />
        </InfoCard>
      </Grid>
    </Grid>
  );
};
