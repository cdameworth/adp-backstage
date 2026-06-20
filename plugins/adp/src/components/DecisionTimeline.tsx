import React from 'react';
import { useAsync } from 'react-use';
import {
  Progress,
  StatusOK,
  StatusWarning,
  StatusError,
  Link,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  makeStyles,
  Theme,
  Collapse,
  IconButton,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { adpApiRef, Decision } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  timeline: {
    position: 'relative',
    paddingLeft: theme.spacing(4),
    '&::before': {
      content: '""',
      position: 'absolute',
      left: theme.spacing(1.5),
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: theme.palette.divider,
    },
  },
  timelineItem: {
    position: 'relative',
    marginBottom: theme.spacing(2),
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -theme.spacing(4) + theme.spacing(1),
      top: theme.spacing(2),
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: theme.palette.primary.main,
      border: `2px solid ${theme.palette.background.paper}`,
    },
  },
  timelineItemAllowed: {
    '&::before': {
      backgroundColor: theme.palette.success.main,
    },
  },
  timelineItemDenied: {
    '&::before': {
      backgroundColor: theme.palette.error.main,
    },
  },
  timelineItemEscalated: {
    '&::before': {
      backgroundColor: theme.palette.warning.main,
    },
  },
  card: {
    marginBottom: 0,
  },
  reasoning: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  metadata: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },
}));

interface DecisionCardProps {
  decision: Decision;
}

const DecisionCard = ({ decision }: DecisionCardProps) => {
  const classes = useStyles();
  const [expanded, setExpanded] = React.useState(false);

  const resultClass = {
    allowed: classes.timelineItemAllowed,
    denied: classes.timelineItemDenied,
    escalated: classes.timelineItemEscalated,
  }[decision.result] || '';

  const statusComponent = () => {
    switch (decision.result) {
      case 'allowed':
        return <StatusOK>Allowed</StatusOK>;
      case 'denied':
        return <StatusError>Denied</StatusError>;
      case 'escalated':
        return <StatusWarning>Escalated</StatusWarning>;
      default:
        return decision.result;
    }
  };

  return (
    <div className={`${classes.timelineItem} ${resultClass}`}>
      <Card className={classes.card} variant="outlined">
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="subtitle1">
                <strong>{decision.action_type}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {decision.target}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
              {statusComponent()}
              {decision.reasoning && (
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Box>
          </Box>

          <Box className={classes.metadata}>
            <Typography variant="caption" color="textSecondary">
              {new Date(decision.created_at).toLocaleString()}
            </Typography>
            {decision.confidence_score !== undefined && (
              <Chip
                label={`Confidence: ${(decision.confidence_score * 100).toFixed(0)}%`}
                size="small"
                variant="outlined"
              />
            )}
            {decision.policy_names?.map(policy => (
              <Chip
                key={policy}
                label={policy}
                size="small"
                variant="outlined"
              />
            ))}
            <Link to={`/adp/lineage/${decision.id}`}>
              <Chip
                label="View Lineage"
                size="small"
                color="primary"
                clickable
              />
            </Link>
          </Box>

          <Collapse in={expanded}>
            {decision.reasoning && (
              <div className={classes.reasoning}>
                {decision.reasoning}
              </div>
            )}
          </Collapse>
        </CardContent>
      </Card>
    </div>
  );
};

interface DecisionTimelineProps {
  sessionId?: string;
  limit?: number;
}

/**
 * Timeline component showing decision history
 */
export const DecisionTimeline = ({ sessionId, limit = 20 }: DecisionTimelineProps) => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const { value, loading, error } = useAsync(async () => {
    const response = await adpApi.getDecisions({
      limit,
      session_id: sessionId,
    });
    return response.items;
  }, [sessionId, limit]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load decisions: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!value || value.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No decisions recorded
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Agent decisions will appear here as they are logged.
        </Typography>
      </Box>
    );
  }

  return (
    <div className={classes.timeline}>
      {value.map(decision => (
        <DecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  );
};
