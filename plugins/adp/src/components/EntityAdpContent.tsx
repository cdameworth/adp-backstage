import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  MissingAnnotationEmptyState,
  InfoCard,
} from '@backstage/core-components';
import { Box, Typography } from '@material-ui/core';
import { ServiceAgentActivity } from './ServiceAgentActivity';

const ADP_SERVICE_ID_ANNOTATION = 'adp.io/service-id';

/**
 * Entity content component for catalog entity pages
 *
 * Shows ADP agent activity for entities that have the adp.io/service-id annotation
 */
export const EntityAdpContent = () => {
  const { entity } = useEntity();

  const serviceId = entity.metadata.annotations?.[ADP_SERVICE_ID_ANNOTATION];

  if (!serviceId) {
    return (
      <MissingAnnotationEmptyState annotation={ADP_SERVICE_ID_ANNOTATION}>
        <Typography variant="body1" paragraph>
          To enable ADP agent activity tracking for this entity, add the following
          annotation to your entity YAML:
        </Typography>
        <InfoCard title="Example">
          <Box
            component="pre"
            p={2}
            bgcolor="grey.100"
            borderRadius={1}
            overflow="auto"
          >
            {`apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    adp.io/service-id: "your-service-id"
spec:
  type: service
  lifecycle: production
  owner: team-a`}
          </Box>
        </InfoCard>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
          The service ID can be found in the ADP dashboard under Services,
          or you can create a new service using the ADP CLI:
        </Typography>
        <Box
          component="pre"
          p={2}
          bgcolor="grey.100"
          borderRadius={1}
          overflow="auto"
          mt={1}
        >
          {`adp service create --name my-service --description "My awesome service"`}
        </Box>
      </MissingAnnotationEmptyState>
    );
  }

  return <ServiceAgentActivity serviceId={serviceId} />;
};
