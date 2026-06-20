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
} from '@material-ui/core';
import { SessionsTable } from './SessionsTable';
import { DecisionTimeline } from './DecisionTimeline';
import { adpApiRef } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  statsContainer: {
    display: 'flex',
    gap: theme.spacing(4),
    padding: theme.spacing(2),
    flexWrap: 'wrap',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
}));

interface ServiceAgentActivityProps {
  serviceId: string;
}

/**
 * Service-specific agent activity component for entity pages
 */
export const ServiceAgentActivity = ({ serviceId }: ServiceAgentActivityProps) => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const { value: sessions, loading: sessionsLoading } = useAsync(async () => {
    return adpApi.getSessions({ limit: 100, service_id: serviceId });
  }, [serviceId]);

  const { value: service, loading: serviceLoading } = useAsync(async () => {
    return adpApi.getService(serviceId);
  }, [serviceId]);

  if (sessionsLoading || serviceLoading) {
    return <Progress />;
  }

  const activeSessions = sessions?.items.filter(s => s.status === 'active').length || 0;
  const totalSessions = sessions?.total || 0;

  // Calculate decision stats from sessions
  const recentDecisions = sessions?.items
    .filter(s => s.status === 'active' || new Date(s.ended_at || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .length || 0;

  return (
    <Grid container spacing={3}>
      {/* Quick Stats */}
      <Grid item xs={12}>
        <InfoCard title="Agent Activity Overview">
          <div className={classes.statsContainer}>
            <div className={classes.statItem}>
              <Typography className={classes.statValue}>{activeSessions}</Typography>
              <Typography className={classes.statLabel}>Active Sessions</Typography>
            </div>
            <div className={classes.statItem}>
              <Typography className={classes.statValue}>{totalSessions}</Typography>
              <Typography className={classes.statLabel}>Total Sessions</Typography>
            </div>
            <div className={classes.statItem}>
              <Typography className={classes.statValue}>{recentDecisions}</Typography>
              <Typography className={classes.statLabel}>Recent Activity (7d)</Typography>
            </div>
            {service?.context_config?.token_budget && (
              <div className={classes.statItem}>
                <Typography className={classes.statValue}>
                  {(service.context_config.token_budget.essential || 0) +
                   (service.context_config.token_budget.task_relevant || 0) +
                   (service.context_config.token_budget.supporting || 0)}
                </Typography>
                <Typography className={classes.statLabel}>Token Budget</Typography>
              </div>
            )}
          </div>
        </InfoCard>
      </Grid>

      {/* Sessions Table */}
      <Grid item xs={12}>
        <InfoCard title="Sessions for This Service">
          {sessions && sessions.items.length > 0 ? (
            <SessionsTable serviceId={serviceId} />
          ) : (
            <Box p={4} textAlign="center">
              <Typography variant="h6" color="textSecondary">
                No agent sessions for this service
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Agent activity will appear here once agents start working with this service.
              </Typography>
            </Box>
          )}
        </InfoCard>
      </Grid>

      {/* Service Configuration */}
      {service && (
        <Grid item xs={12} md={6}>
          <InfoCard title="Context Configuration">
            <Box p={2}>
              {service.context_config ? (
                <>
                  {service.context_config.essential_paths && service.context_config.essential_paths.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2">Essential Paths:</Typography>
                      <Typography variant="body2" color="textSecondary" component="ul">
                        {service.context_config.essential_paths.map((path, i) => (
                          <li key={i}><code>{path}</code></li>
                        ))}
                      </Typography>
                    </Box>
                  )}
                  {service.context_config.excluded_patterns && service.context_config.excluded_patterns.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2">Excluded Patterns:</Typography>
                      <Typography variant="body2" color="textSecondary" component="ul">
                        {service.context_config.excluded_patterns.map((pattern, i) => (
                          <li key={i}><code>{pattern}</code></li>
                        ))}
                      </Typography>
                    </Box>
                  )}
                  {service.context_config.token_budget && (
                    <Box>
                      <Typography variant="subtitle2">Token Budget:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Essential: {service.context_config.token_budget.essential || 4000}<br />
                        Task-Relevant: {service.context_config.token_budget.task_relevant || 12000}<br />
                        Supporting: {service.context_config.token_budget.supporting || 8000}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Using default context configuration
                </Typography>
              )}
            </Box>
          </InfoCard>
        </Grid>
      )}

      {/* Escalation Configuration */}
      {service && (
        <Grid item xs={12} md={6}>
          <InfoCard title="Escalation Configuration">
            <Box p={2}>
              {service.escalation_config ? (
                <>
                  {service.escalation_config.default_approvers && service.escalation_config.default_approvers.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2">Default Approvers:</Typography>
                      <Typography variant="body2" color="textSecondary" component="ul">
                        {service.escalation_config.default_approvers.map((approver, i) => (
                          <li key={i}>{approver}</li>
                        ))}
                      </Typography>
                    </Box>
                  )}
                  {service.escalation_config.approval_timeout_hours && (
                    <Box>
                      <Typography variant="subtitle2">Approval Timeout:</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {service.escalation_config.approval_timeout_hours} hours
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Using default escalation configuration
                </Typography>
              )}
            </Box>
          </InfoCard>
        </Grid>
      )}
    </Grid>
  );
};
