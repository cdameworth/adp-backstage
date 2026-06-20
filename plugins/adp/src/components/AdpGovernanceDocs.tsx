import React from 'react';
import { useAsync } from 'react-use';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { InfoCard, Progress, MarkdownContent } from '@backstage/core-components';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Typography,
  Box,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { adpApiRef, AdpDoc } from '../api';

const ADP_SERVICE_ID_ANNOTATION = 'adp.io/service-id';

const categoryLabels: Record<string, string> = {
  session_summary: 'Session summary',
  risk_report: 'Risk report',
  pattern_report: 'Pattern report',
};

/**
 * TechDocs Addon panel: surfaces the ADP documentation engine's generated docs
 * (session summaries, risk/pattern reports) for the entity being viewed.
 *
 * ADP docs are session-scoped, so this resolves the entity's recent ADP
 * sessions (by the `adp.io/service-id` annotation) and lists their generated
 * documents. Renders nothing for entities without the annotation or with no
 * generated docs, so it stays unobtrusive on the TechDocs reader.
 */
export const AdpGovernanceDocs = () => {
  const { entity } = useEntity();
  const adpApi = useApi(adpApiRef);
  const serviceId = entity.metadata.annotations?.[ADP_SERVICE_ID_ANNOTATION];

  const { value, loading } = useAsync(async (): Promise<AdpDoc[]> => {
    if (!serviceId) {
      return [];
    }
    const sessions = await adpApi.getSessions({ service_id: serviceId, limit: 5 });
    const lists = await Promise.all(
      sessions.items.map(s =>
        adpApi
          .getDocs({ session_id: s.id, limit: 10 })
          .then(r => r.items)
          .catch(() => [] as AdpDoc[]),
      ),
    );
    const seen = new Set<string>();
    return lists.flat().filter(doc => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  }, [serviceId]);

  if (!serviceId) {
    return null;
  }
  if (loading) {
    return <Progress />;
  }

  const docs = value ?? [];
  if (docs.length === 0) {
    return null;
  }

  return (
    <InfoCard title="ADP governance docs">
      {docs.map(doc => (
        <Accordion key={doc.id} TransitionProps={{ unmountOnExit: true }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" flexDirection="column">
              <Typography variant="body2">{doc.title}</Typography>
              <Box mt={0.5} display="flex" alignItems="center" style={{ gap: 8 }}>
                <Chip
                  size="small"
                  label={categoryLabels[doc.category] ?? doc.category}
                />
                <Typography variant="caption" color="textSecondary">
                  {new Date(doc.created_at).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <MarkdownContent content={doc.content} />
          </AccordionDetails>
        </Accordion>
      ))}
    </InfoCard>
  );
};
