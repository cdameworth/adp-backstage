import React, { useEffect, useRef } from 'react';
import { useAsync } from 'react-use';
import {
  Progress,
  InfoCard,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Typography,
  makeStyles,
  Theme,
  Chip,
  Paper,
} from '@material-ui/core';
import * as d3 from 'd3';
import { adpApiRef, LineageGraph, LineageNode, LineageEdge } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    width: '100%',
    height: 600,
    overflow: 'hidden',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  tooltip: {
    position: 'absolute',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[4],
    pointerEvents: 'none',
    zIndex: 1000,
  },
  legend: {
    display: 'flex',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
}));

const nodeColors: Record<string, string> = {
  decision: '#4caf50',
  session: '#2196f3',
  commit: '#ff9800',
  service: '#9c27b0',
  policy: '#f44336',
};

interface DecisionLineageGraphProps {
  decisionId: string;
  depth?: number;
}

/**
 * D3-based force-directed graph visualization for decision lineage
 */
export const DecisionLineageGraph = ({ decisionId, depth = 5 }: DecisionLineageGraphProps) => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { value: lineage, loading, error } = useAsync(async () => {
    return adpApi.getDecisionLineage(decisionId, depth);
  }, [decisionId, depth]);

  useEffect(() => {
    if (!lineage || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create simulation
    const simulation = d3.forceSimulation<LineageNode>(lineage.nodes)
      .force('link', d3.forceLink<LineageNode, LineageEdge>(lineage.edges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(lineage.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Draw edge labels
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(lineage.edges)
      .enter()
      .append('text')
      .attr('font-size', 10)
      .attr('fill', '#666')
      .text(d => d.relationship);

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(lineage.nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, LineageNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('circle')
      .attr('r', 15)
      .attr('fill', d => nodeColors[d.type] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(d => d.label.length > 20 ? d.label.substring(0, 17) + '...' : d.label);

    // Tooltip
    node.append('title')
      .text(d => `${d.type}: ${d.label}\n${d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}`);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      linkLabels
        .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Center on the target decision node
    const targetNode = lineage.nodes.find(n => n.id === decisionId);
    if (targetNode) {
      const initialTransform = d3.zoomIdentity
        .translate(width / 2 - (targetNode.x || width / 2), height / 2 - (targetNode.y || height / 2));
      svg.call(zoom.transform, initialTransform);
    }

    return () => {
      simulation.stop();
    };
  }, [lineage, decisionId]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Failed to load lineage: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!lineage || lineage.nodes.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No lineage data available
        </Typography>
      </Box>
    );
  }

  return (
    <InfoCard title="Decision Lineage Graph">
      <Paper className={classes.legend} variant="outlined">
        {Object.entries(nodeColors).map(([type, color]) => (
          <div key={type} className={classes.legendItem}>
            <div
              className={classes.legendDot}
              style={{ backgroundColor: color }}
            />
            <Typography variant="caption">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
          </div>
        ))}
      </Paper>
      <div ref={containerRef} className={classes.container}>
        <svg ref={svgRef} className={classes.svg} />
      </div>
      <Box p={2}>
        <Typography variant="body2" color="textSecondary">
          Drag nodes to reposition. Scroll to zoom. Pan by dragging the background.
        </Typography>
      </Box>
    </InfoCard>
  );
};
