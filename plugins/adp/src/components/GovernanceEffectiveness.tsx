import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { adpApiRef } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  chartContainer: {
    height: 300,
    padding: theme.spacing(2),
  },
  controls: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  formControl: {
    minWidth: 150,
  },
  funnelStats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: theme.spacing(2),
    textAlign: 'center',
  },
  funnelItem: {
    padding: theme.spacing(2),
  },
  funnelValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  funnelLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
}));

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#9c27b0'];

/**
 * Governance effectiveness analytics dashboard
 */
export const GovernanceEffectiveness = () => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const { value: report, loading, error } = useAsync(async () => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return adpApi.getGovernanceReport({ start, end, granularity });
  }, [granularity]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load governance report: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No governance data available
        </Typography>
      </Box>
    );
  }

  // Prepare pie chart data
  const pieData = [
    { name: 'Allowed', value: report.policy_evaluations.allowed, color: '#4caf50' },
    { name: 'Denied', value: report.policy_evaluations.denied, color: '#f44336' },
    { name: 'Escalated', value: report.policy_evaluations.escalated, color: '#ff9800' },
  ].filter(d => d.value > 0);

  // Calculate percentages
  const total = report.policy_evaluations.total || 1;
  const allowedPct = ((report.policy_evaluations.allowed / total) * 100).toFixed(1);
  const deniedPct = ((report.policy_evaluations.denied / total) * 100).toFixed(1);
  const escalatedPct = ((report.policy_evaluations.escalated / total) * 100).toFixed(1);

  return (
    <Grid container spacing={3}>
      {/* Controls */}
      <Grid item xs={12}>
        <Box className={classes.controls}>
          <FormControl variant="outlined" className={classes.formControl}>
            <InputLabel>Granularity</InputLabel>
            <Select
              value={granularity}
              onChange={e => setGranularity(e.target.value as typeof granularity)}
              label="Granularity"
            >
              <MenuItem value="hour">Hourly</MenuItem>
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Grid>

      {/* Policy Evaluation Funnel */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Policy Evaluation Breakdown">
          <Box className={classes.funnelStats}>
            <Box className={classes.funnelItem}>
              <Typography className={classes.funnelValue} style={{ color: '#2196f3' }}>
                {report.policy_evaluations.total.toLocaleString()}
              </Typography>
              <Typography className={classes.funnelLabel}>Total Evaluations</Typography>
            </Box>
            <Box className={classes.funnelItem}>
              <Typography className={classes.funnelValue} style={{ color: '#4caf50' }}>
                {allowedPct}%
              </Typography>
              <Typography className={classes.funnelLabel}>Allowed</Typography>
            </Box>
            <Box className={classes.funnelItem}>
              <Typography className={classes.funnelValue} style={{ color: '#f44336' }}>
                {deniedPct}%
              </Typography>
              <Typography className={classes.funnelLabel}>Denied</Typography>
            </Box>
            <Box className={classes.funnelItem}>
              <Typography className={classes.funnelValue} style={{ color: '#ff9800' }}>
                {escalatedPct}%
              </Typography>
              <Typography className={classes.funnelLabel}>Escalated</Typography>
            </Box>
          </Box>
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </InfoCard>
      </Grid>

      {/* Top Policies by Denial Rate */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Policies by Denial Rate">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.policies_by_denial_rate.slice(0, 10)}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis
                  type="category"
                  dataKey="policy_name"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Denial Rate']}
                />
                <Bar
                  dataKey="denial_rate"
                  fill="#f44336"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InfoCard>
      </Grid>

      {/* False Positive Trend */}
      <Grid item xs={12}>
        <InfoCard title="False Positive Rate Trend">
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.false_positive_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'False Positive Rate']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={false}
                  name="False Positive Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Box p={2}>
            <Typography variant="body2" color="textSecondary">
              False positive rate = % of denials that were later approved on escalation.
              A high rate suggests policies may be too strict.
            </Typography>
          </Box>
        </InfoCard>
      </Grid>
    </Grid>
  );
};
