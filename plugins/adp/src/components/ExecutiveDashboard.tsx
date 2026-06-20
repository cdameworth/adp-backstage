import React from 'react';
import { useAsync } from 'react-use';
import {
  Progress,
  InfoCard,
  GaugeCard,
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import TrendingDownIcon from '@material-ui/icons/TrendingDown';
import { adpApiRef } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  statCard: {
    padding: theme.spacing(3),
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  statLabel: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  statChange: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
  positive: {
    color: theme.palette.success.main,
  },
  negative: {
    color: theme.palette.error.main,
  },
  chartContainer: {
    height: 300,
    padding: theme.spacing(2),
  },
}));

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  unit?: string;
}

const StatCard = ({ title, value, change, unit }: StatCardProps) => {
  const classes = useStyles();
  const isPositive = change !== undefined && change >= 0;

  return (
    <Paper className={classes.statCard} variant="outlined">
      <Typography variant="h3" className={classes.statValue}>
        {value}{unit}
      </Typography>
      <Typography variant="body1" className={classes.statLabel}>
        {title}
      </Typography>
      {change !== undefined && (
        <Box className={`${classes.statChange} ${isPositive ? classes.positive : classes.negative}`}>
          {isPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
          <Typography variant="body2">
            {isPositive ? '+' : ''}{change.toFixed(1)}% vs last week
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

/**
 * Executive dashboard with key metrics and trends
 */
export const ExecutiveDashboard = () => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const { value: summary, loading, error } = useAsync(async () => {
    return adpApi.getReportSummary();
  }, []);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load dashboard: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No data available
        </Typography>
      </Box>
    );
  }

  // Calculate decision change percentage
  const decisionChange = summary.decisions_average_7d > 0
    ? ((summary.decisions_today - summary.decisions_average_7d) / summary.decisions_average_7d) * 100
    : 0;

  // Generate adoption trend chart data
  const adoptionData = summary.adoption_trend_30d.map((value, index) => ({
    day: `Day ${index + 1}`,
    sessions: value,
  }));

  return (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12} md={3}>
        <StatCard
          title="Active Sessions"
          value={summary.active_sessions}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Decisions Today"
          value={summary.decisions_today}
          change={decisionChange}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Pending Escalations"
          value={summary.escalation_queue_depth}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <GaugeCard
          title="Policy Health Score"
          progress={summary.policy_health_score / 100}
          description={`${summary.policy_health_score}% - ${
            summary.policy_health_score >= 80 ? 'Healthy' :
            summary.policy_health_score >= 60 ? 'Fair' : 'Needs Attention'
          }`}
        />
      </Grid>

      {/* Adoption Trend */}
      <Grid item xs={12}>
        <InfoCard title="30-Day Adoption Trend">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adoptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  interval={4}
                />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name="Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InfoCard>
      </Grid>

      {/* Quick Stats */}
      <Grid item xs={12} md={6}>
        <InfoCard title="7-Day Average">
          <Box p={3} textAlign="center">
            <Typography variant="h4" color="primary">
              {summary.decisions_average_7d.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              decisions per day
            </Typography>
          </Box>
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <InfoCard title="Escalation Queue">
          <Box p={3} textAlign="center">
            <Typography
              variant="h4"
              color={summary.escalation_queue_depth > 10 ? 'error' : 'primary'}
            >
              {summary.escalation_queue_depth}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              pending approvals
            </Typography>
            {summary.escalation_queue_depth > 10 && (
              <Typography variant="caption" color="error">
                High queue - please review
              </Typography>
            )}
          </Box>
        </InfoCard>
      </Grid>
    </Grid>
  );
};
