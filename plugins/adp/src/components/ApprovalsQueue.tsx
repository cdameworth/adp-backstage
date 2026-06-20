import React, { useState, useCallback } from 'react';
import { useAsync } from 'react-use';
import {
  Table,
  TableColumn,
  Progress,
  StatusOK,
  StatusWarning,
  StatusError,
  StatusPending,
  Link,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@material-ui/core';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import { adpApiRef, Approval } from '../api';

interface ApprovalDialogProps {
  approval: Approval | null;
  open: boolean;
  onClose: () => void;
  onResolve: (approvalId: string, status: 'approved' | 'denied', comment?: string) => Promise<void>;
}

const ApprovalDialog = ({ approval, open, onClose, onResolve }: ApprovalDialogProps) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResolve = async (status: 'approved' | 'denied') => {
    if (!approval) return;
    setLoading(true);
    try {
      await onResolve(approval.id, status, comment || undefined);
      setComment('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!approval) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Approval Request</DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">Action</Typography>
          <Typography>{approval.action}</Typography>
        </Box>
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
          <Typography>{approval.reason}</Typography>
        </Box>
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">Session</Typography>
          <Link to={`/adp/sessions/${approval.session_id}`}>
            <code>{approval.session_id}</code>
          </Link>
        </Box>
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">Requested</Typography>
          <Typography>{new Date(approval.requested_at).toLocaleString()}</Typography>
        </Box>
        <TextField
          label="Comment (optional)"
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => handleResolve('denied')}
          color="secondary"
          startIcon={<CloseIcon />}
          disabled={loading}
        >
          Deny
        </Button>
        <Button
          onClick={() => handleResolve('approved')}
          color="primary"
          variant="contained"
          startIcon={<CheckIcon />}
          disabled={loading}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Approval queue component with action buttons
 */
export const ApprovalsQueue = () => {
  const adpApi = useApi(adpApiRef);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { value, loading, error } = useAsync(async () => {
    const response = await adpApi.getPendingApprovals({ limit: 50 });
    return response.items;
  }, [refreshKey]);

  const handleResolve = useCallback(
    async (approvalId: string, status: 'approved' | 'denied', comment?: string) => {
      await adpApi.resolveApproval(approvalId, { status, comment });
      setRefreshKey(k => k + 1);
    },
    [adpApi],
  );

  const columns: TableColumn<Approval>[] = [
    {
      title: 'Action',
      field: 'action',
      render: row => (
        <Typography variant="body2">{row.action}</Typography>
      ),
    },
    {
      title: 'Reason',
      field: 'reason',
      render: row => (
        <Typography variant="body2" noWrap style={{ maxWidth: 200 }}>
          {row.reason}
        </Typography>
      ),
    },
    {
      title: 'Session',
      field: 'session_id',
      render: row => (
        <Link to={`/adp/sessions/${row.session_id}`}>
          <code>{row.session_id.substring(0, 8)}...</code>
        </Link>
      ),
    },
    {
      title: 'Status',
      field: 'status',
      render: row => {
        switch (row.status) {
          case 'pending':
            return <StatusWarning>Pending</StatusWarning>;
          case 'approved':
            return <StatusOK>Approved</StatusOK>;
          case 'denied':
            return <StatusError>Denied</StatusError>;
          case 'expired':
            return <StatusPending>Expired</StatusPending>;
          default:
            return row.status;
        }
      },
    },
    {
      title: 'Requested',
      field: 'requested_at',
      render: row => new Date(row.requested_at).toLocaleString(),
    },
    {
      title: 'Actions',
      render: row => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSelectedApproval(row);
              setDialogOpen(true);
            }}
          >
            Review
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load approvals: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Table
        title={
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">Pending Approvals</Typography>
            {value && value.length > 0 && (
              <Chip label={value.length} color="secondary" size="small" />
            )}
          </Box>
        }
        options={{
          search: true,
          paging: true,
          pageSize: 10,
          sorting: true,
          emptyRowsWhenPaging: false,
        }}
        columns={columns}
        data={value || []}
        emptyContent={
          <Box p={4} textAlign="center">
            <Typography variant="h6" color="textSecondary">
              No pending approvals
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All escalated actions have been reviewed.
            </Typography>
          </Box>
        }
      />
      <ApprovalDialog
        approval={selectedApproval}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedApproval(null);
        }}
        onResolve={handleResolve}
      />
    </>
  );
};
