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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import PeopleIcon from '@material-ui/icons/People';
import TimelineIcon from '@material-ui/icons/Timeline';
import BuildIcon from '@material-ui/icons/Build';
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
    color: theme.palette.primary.main,
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  metricSubtext: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
  },
}));

/**
 * Adoption metrics dashboard showing agent usage trends
 */
export const AdoptionMetrics = () => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const { value: summary, loading, error } = useAsync(async () => {
    return adpApi.getReportSummary();
  }, []);

  const { value: sessions } = useAsync(async () => {
    return adpApi.getSessions({ limit: 100 });
  }, []);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load adoption metrics: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No adoption data available
        </Typography>
      </Box>
    );
  }

  // Generate adoption trend data
  const adoptionData = summary.adoption_trend_30d.map((value, index) => ({
    day: index + 1,
    sessions: value,
    date: new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toLocaleDateString(),
  }));

  // Calculate unique users and agent tools from sessions
  const uniqueUsers = sessions ? new Set(sessions.items.map(s => s.user_id)).size : 0;
  const agentToolCounts = sessions
    ? sessions.items.reduce((acc, s) => {
        acc[s.agent_tool] = (acc[s.agent_tool] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};
  const agentToolData = Object.entries(agentToolCounts)
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate average sessions per day
  const avgSessionsPerDay = summary.adoption_trend_30d.reduce((a, b) => a + b, 0) / 30;

  return (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12} md={4}>
        <Paper className={classes.metricCard} variant="outlined">
          <PeopleIcon className={classes.metricIcon} />
          <Typography className={classes.metricValue}>
            {uniqueUsers}
          </Typography>
          <Typography className={classes.metricLabel}>Unique Users</Typography>
          <Typography className={classes.metricSubtext}>
            actively using agents
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper className={classes.metricCard} variant="outlined">
          <TimelineIcon className={classes.metricIcon} />
          <Typography className={classes.metricValue}>
            {avgSessionsPerDay.toFixed(1)}
          </Typography>
          <Typography className={classes.metricLabel}>Avg Sessions/Day</Typography>
          <Typography className={classes.metricSubtext}>
            over the last 30 days
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper className={classes.metricCard} variant="outlined">
          <BuildIcon className={classes.metricIcon} />
          <Typography className={classes.metricValue}>
            {Object.keys(agentToolCounts).length}
          </Typography>
          <Typography className={classes.metricLabel}>Agent Tools</Typography>
          <Typography className={classes.metricSubtext}>
            in active use
          </Typography>
        </Paper>
      </Grid>

      {/* Adoption Trend */}
      <Grid item xs={12}>
        <InfoCard title="30-Day Adoption Trend">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adoptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={4}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#2196f3"
                  fill="#2196f3"
                  fillOpacity={0.3}
                  name="Daily Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InfoCard>
      </Grid>

      {/* Agent Tool Distribution */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Agent Tool Distribution">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentToolData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="tool"
                  width={70}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#9c27b0" radius={[0, 4, 4, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InfoCard>
      </Grid>

      {/* Growth Insights */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Adoption Insights">
          <Box p={3}>
            <Typography variant="subtitle1" gutterBottom>
              Key Observations:
            </Typography>
            <Box component="ul" pl={2}>
              <Typography component="li" variant="body2" paragraph>
                <strong>Peak Usage:</strong> Day {adoptionData.reduce((maxIdx, item, idx, arr) =>
                  item.sessions > arr[maxIdx].sessions ? idx : maxIdx, 0) + 1} had the highest
                activity with {Math.max(...summary.adoption_trend_30d)} sessions.
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Most Popular Tool:</strong> {agentToolData[0]?.tool || 'N/A'} accounts
                for {agentToolData[0] ? ((agentToolData[0].count / (sessions?.items.length || 1)) * 100).toFixed(1) : 0}% of sessions.
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Growth Trend:</strong> {
                  summary.adoption_trend_30d.slice(-7).reduce((a, b) => a + b, 0) >
                  summary.adoption_trend_30d.slice(0, 7).reduce((a, b) => a + b, 0)
                    ? 'Increasing - More sessions in the last 7 days vs first 7 days'
                    : 'Stable or declining - Monitor for potential adoption issues'
                }
              </Typography>
            </Box>
            <Typography variant="subtitle2" color="textSecondary" style={{ marginTop: 16 }}>
              Recommendations:
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {uniqueUsers < 10
                ? 'Consider onboarding more users to increase agent adoption.'
                : uniqueUsers < 50
                ? 'Good user adoption. Focus on increasing session frequency.'
                : 'Strong adoption. Consider expanding to additional services.'}
            </Typography>
          </Box>
        </InfoCard>
      </Grid>
    </Grid>
  );
};
