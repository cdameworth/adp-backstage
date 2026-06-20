import React from 'react';
import { useAsync } from 'react-use';
import {
  Table,
  TableColumn,
  Progress,
  StatusOK,
  StatusPending,
  StatusError,
  Link,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Chip, Box, Typography } from '@material-ui/core';
import { adpApiRef, Session } from '../api';

const trustLevelLabels: Record<number, string> = {
  1: 'Observer',
  2: 'Contributor',
  3: 'Developer',
  4: 'Maintainer',
  5: 'Admin',
};

const trustLevelColors: Record<number, 'default' | 'primary' | 'secondary'> = {
  1: 'default',
  2: 'default',
  3: 'primary',
  4: 'primary',
  5: 'secondary',
};

const columns: TableColumn<Session>[] = [
  {
    title: 'Session ID',
    field: 'id',
    render: row => (
      <Link to={`/adp/sessions/${row.id}`}>
        <code>{row.id.substring(0, 8)}...</code>
      </Link>
    ),
  },
  {
    title: 'Agent Tool',
    field: 'agent_tool',
    render: row => (
      <Chip
        label={row.agent_tool}
        size="small"
        variant="outlined"
      />
    ),
  },
  {
    title: 'User',
    field: 'user_id',
    render: row => row.user_id || '-',
  },
  {
    title: 'Service',
    field: 'service_id',
    render: row => row.service_id || '-',
  },
  {
    title: 'Trust Level',
    field: 'trust_level',
    render: row => (
      <Chip
        label={trustLevelLabels[row.trust_level] || `Level ${row.trust_level}`}
        size="small"
        color={trustLevelColors[row.trust_level] || 'default'}
      />
    ),
  },
  {
    title: 'Status',
    field: 'status',
    render: row => {
      switch (row.status) {
        case 'active':
          return <StatusOK>Active</StatusOK>;
        case 'ended':
          return <StatusPending>Ended</StatusPending>;
        case 'expired':
          return <StatusError>Expired</StatusError>;
        default:
          return row.status;
      }
    },
  },
  {
    title: 'Started',
    field: 'started_at',
    render: row => new Date(row.started_at).toLocaleString(),
  },
  {
    title: 'Last Heartbeat',
    field: 'last_heartbeat',
    render: row => row.last_heartbeat
      ? new Date(row.last_heartbeat).toLocaleString()
      : '-',
  },
];

interface SessionsTableProps {
  serviceId?: string;
}

/**
 * Table component displaying agent sessions
 */
export const SessionsTable = ({ serviceId }: SessionsTableProps) => {
  const adpApi = useApi(adpApiRef);

  const { value, loading, error } = useAsync(async () => {
    const response = await adpApi.getSessions({
      limit: 50,
      service_id: serviceId,
    });
    return response.items;
  }, [serviceId]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load sessions: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Table
      title="Agent Sessions"
      options={{
        search: true,
        paging: true,
        pageSize: 10,
        sorting: true,
      }}
      columns={columns}
      data={value || []}
    />
  );
};
