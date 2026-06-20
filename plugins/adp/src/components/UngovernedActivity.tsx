import React, { useState, useCallback } from 'react';
import { useAsync } from 'react-use';
import {
  Table,
  TableColumn,
  Progress,
  StatusWarning,
  StatusOK,
  StatusPending,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Box, Typography, Button, Chip } from '@material-ui/core';
import { adpApiRef, Finding } from '../api';

const statusCell = (status: Finding['status']) => {
  switch (status) {
    case 'open':
      return <StatusWarning>Open</StatusWarning>;
    case 'acknowledged':
      return <StatusPending>Acknowledged</StatusPending>;
    case 'resolved':
      return <StatusOK>Resolved</StatusOK>;
    default:
      return <>{status}</>;
  }
};

/**
 * Ungoverned-activity console: lists reconciliation findings — commits (and
 * other activity) that bypassed ADP governance — with acknowledge/resolve
 * actions. This is the detection backstop to the merge gate / interceptor.
 */
export const UngovernedActivity = () => {
  const adpApi = useApi(adpApiRef);
  const [refreshKey, setRefreshKey] = useState(0);

  const { value, loading, error } = useAsync(async () => {
    const res = await adpApi.getFindings({ status: 'open' });
    return res.items;
  }, [refreshKey]);

  const update = useCallback(
    async (id: string, status: 'acknowledged' | 'resolved') => {
      await adpApi.resolveFinding(id, status);
      setRefreshKey(k => k + 1);
    },
    [adpApi],
  );

  if (loading) {
    return <Progress />;
  }
  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load findings: {error.message}
        </Typography>
      </Box>
    );
  }

  const columns: TableColumn<Finding>[] = [
    {
      title: 'Type',
      field: 'type',
      render: row => <Chip size="small" label={row.type.replace(/_/g, ' ')} />,
    },
    {
      title: 'Reference',
      field: 'reference',
      render: row => <code>{row.reference.substring(0, 10)}</code>,
    },
    { title: 'Repo', field: 'repo', render: row => row.repo || '-' },
    { title: 'Author', field: 'author', render: row => row.author || '-' },
    { title: 'Reason', field: 'reason' },
    {
      title: 'Detected',
      field: 'detected_at',
      render: row => new Date(row.detected_at).toLocaleString(),
    },
    { title: 'Status', field: 'status', render: row => statusCell(row.status) },
    {
      title: 'Actions',
      render: row => (
        <Box display="flex" gridGap={8}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => update(row.id, 'acknowledged')}
          >
            Ack
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => update(row.id, 'resolved')}
          >
            Resolve
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Table
      title={
        <Box display="flex" alignItems="center" gridGap={16}>
          <Typography variant="h6">Ungoverned activity</Typography>
          {value && value.length > 0 && (
            <Chip label={value.length} color="secondary" size="small" />
          )}
        </Box>
      }
      options={{ search: true, paging: true, pageSize: 10 }}
      columns={columns}
      data={value || []}
      emptyContent={
        <Box p={4} textAlign="center">
          <Typography variant="h6" color="textSecondary">
            No ungoverned activity
          </Typography>
          <Typography variant="body2" color="textSecondary">
            All observed commits have a governance trail.
          </Typography>
        </Box>
      }
    />
  );
};
