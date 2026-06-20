import React from 'react';
import { useAsync } from 'react-use';
import {
  Progress,
  InfoCard,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Grid,
  Box,
  Typography,
  makeStyles,
  Theme,
  Paper,
} from '@material-ui/core';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import { adpApiRef } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  chartContainer: {
    height: 300,
    padding: theme.spacing(2),
  },
  metricCard: {
    padding: theme.spacing(3),
    textAlign: 'center',
    height: '100%',
  },
  metricIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(1),
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  approvalIcon: {
    color: theme.palette.success.main,
  },
  rejectionIcon: {
    color: theme.palette.error.main,
  },
  timeIcon: {
    color: theme.palette.info.main,
  },
}));

/**
 * Escalation analytics dashboard
 */
export const EscalationAnalytics = () => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const { value: report, loading, error } = useAsync(async () => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return adpApi.getEscalationReport({ start, end });
  }, []);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load escalation report: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No escalation data available
        </Typography>
      </Box>
    );
  }

  // Prepare resolution rate data
  const resolutionData = [
    { name: 'Approved', value: report.approval_rate, color: '#4caf50' },
    { name: 'Rejected', value: report.rejection_rate, color: '#f44336' },
  ].filter(d => d.value > 0);

  // Format resolution time
  const formatResolutionTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    } else {
      return `${(hours / 24).toFixed(1)} days`;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12} md={3}>
        <Paper className={classes.metricCard} variant="outlined">
          <Typography className={classes.metricValue} color="primary">
            {report.total_escalations.toLocaleString()}
          </Typography>
          <Typography className={classes.metricLabel}>
            Total Escalations (30 days)
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={3}>
        <Paper className={classes.metricCard} variant="outlined">
          <CheckCircleIcon className={`${classes.metricIcon} ${classes.approvalIcon}`} />
          <Typography className={classes.metricValue} style={{ color: '#4caf50' }}>
            {report.approval_rate.toFixed(1)}%
          </Typography>
          <Typography className={classes.metricLabel}>Approval Rate</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={3}>
        <Paper className={classes.metricCard} variant="outlined">
          <CancelIcon className={`${classes.metricIcon} ${classes.rejectionIcon}`} />
          <Typography className={classes.metricValue} style={{ color: '#f44336' }}>
            {report.rejection_rate.toFixed(1)}%
          </Typography>
          <Typography className={classes.metricLabel}>Rejection Rate</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={3}>
        <Paper className={classes.metricCard} variant="outlined">
          <AccessTimeIcon className={`${classes.metricIcon} ${classes.timeIcon}`} />
          <Typography className={classes.metricValue} style={{ color: '#2196f3' }}>
            {formatResolutionTime(report.average_resolution_time_hours)}
          </Typography>
          <Typography className={classes.metricLabel}>Avg Resolution Time</Typography>
        </Paper>
      </Grid>

      {/* Resolution Breakdown */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Resolution Breakdown">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resolutionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {resolutionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Box p={2}>
            <Typography variant="body2" color="textSecondary">
              A high approval rate ({'>'}80%) may indicate policies are too strict.
              Consider reviewing and adjusting policy thresholds.
            </Typography>
          </Box>
        </InfoCard>
      </Grid>

      {/* Escalations by Policy */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Escalations by Policy">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.escalations_by_policy.slice(0, 10)}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="policy_name"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#ff9800" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Box p={2}>
            <Typography variant="body2" color="textSecondary">
              Policies triggering the most escalations. Consider:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="ul">
              <li>Adjusting thresholds for high-volume policies</li>
              <li>Increasing trust levels for reliable agents</li>
              <li>Creating exemptions for specific services</li>
            </Typography>
          </Box>
        </InfoCard>
      </Grid>
    </Grid>
  );
};
