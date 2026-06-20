import React, { useState } from 'react';
import {
  InfoCard,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Grid,
  Box,
  Typography,
  makeStyles,
  Theme,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  CircularProgress,
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import DescriptionIcon from '@material-ui/icons/Description';
import { adpApiRef } from '../api';

const useStyles = makeStyles((theme: Theme) => ({
  formContainer: {
    padding: theme.spacing(3),
  },
  formControl: {
    minWidth: 200,
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  dateField: {
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  buttonContainer: {
    marginTop: theme.spacing(3),
    display: 'flex',
    gap: theme.spacing(2),
  },
  metricsGroup: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  previewContainer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    maxHeight: 400,
    overflow: 'auto',
  },
  previewCode: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  templateCard: {
    padding: theme.spacing(2),
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
  },
  templateCardSelected: {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
  },
}));

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  format: 'json' | 'csv';
}

const exportTemplates: ExportTemplate[] = [
  {
    id: 'audit-complete',
    name: 'Complete Audit Trail',
    description: 'Full audit trail with all decisions and reasoning traces',
    metrics: ['decisions', 'reasoning', 'sessions', 'commits'],
    format: 'json',
  },
  {
    id: 'governance-summary',
    name: 'Governance Summary',
    description: 'Policy evaluation metrics and effectiveness data',
    metrics: ['policy_evaluations', 'false_positives', 'escalations'],
    format: 'csv',
  },
  {
    id: 'compliance-minimal',
    name: 'Minimal Compliance',
    description: 'Essential compliance metrics only',
    metrics: ['audit_completeness', 'sensitive_access', 'unverified_commits'],
    format: 'csv',
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Select specific metrics for your report',
    metrics: [],
    format: 'json',
  },
];

const availableMetrics = [
  { id: 'decisions', label: 'All Decisions' },
  { id: 'reasoning', label: 'Reasoning Traces' },
  { id: 'sessions', label: 'Session Data' },
  { id: 'commits', label: 'Commit Records' },
  { id: 'policy_evaluations', label: 'Policy Evaluations' },
  { id: 'false_positives', label: 'False Positive Data' },
  { id: 'escalations', label: 'Escalation Records' },
  { id: 'audit_completeness', label: 'Audit Completeness' },
  { id: 'sensitive_access', label: 'Sensitive Path Access' },
  { id: 'unverified_commits', label: 'Unverified Commit Attempts' },
  { id: 'off_hours_activity', label: 'Off-Hours Activity' },
  { id: 'trust_level_changes', label: 'Trust Level Changes' },
];

/**
 * Compliance export component with templates and customization
 */
export const ComplianceExport = () => {
  const classes = useStyles();
  const adpApi = useApi(adpApiRef);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('audit-complete');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['decisions', 'reasoning']);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = exportTemplates.find(t => t.id === templateId);
    if (template && template.id !== 'custom') {
      setSelectedMetrics(template.metrics);
      setFormat(template.format);
    }
  };

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
    setSelectedTemplate('custom');
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await adpApi.exportComplianceReport({
        start: new Date(startDate).toISOString(),
        end: new Date(endDate + 'T23:59:59').toISOString(),
        format: 'json',
      });
      setPreview(JSON.stringify(result, null, 2));
    } catch (error) {
      setPreview(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await adpApi.exportComplianceReport({
        start: new Date(startDate).toISOString(),
        end: new Date(endDate + 'T23:59:59').toISOString(),
        format,
      });

      // Create download
      const content = format === 'json'
        ? JSON.stringify(result, null, 2)
        : String(result);
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adp-compliance-report-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Export Templates */}
      <Grid item xs={12}>
        <InfoCard title="Export Templates">
          <Grid container spacing={2}>
            {exportTemplates.map(template => (
              <Grid item xs={12} sm={6} md={3} key={template.id}>
                <Paper
                  className={`${classes.templateCard} ${
                    selectedTemplate === template.id ? classes.templateCardSelected : ''
                  }`}
                  variant="outlined"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="subtitle1">{template.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {template.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </InfoCard>
      </Grid>

      {/* Configuration */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Report Configuration">
          <div className={classes.formContainer}>
            <Box display="flex" flexWrap="wrap">
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={classes.dateField}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={classes.dateField}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  onChange={e => setFormat(e.target.value as 'json' | 'csv')}
                  label="Format"
                >
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="subtitle2" className={classes.metricsGroup}>
              Included Metrics:
            </Typography>
            <FormGroup row>
              {availableMetrics.map(metric => (
                <FormControlLabel
                  key={metric.id}
                  control={
                    <Checkbox
                      checked={selectedMetrics.includes(metric.id)}
                      onChange={() => handleMetricToggle(metric.id)}
                      size="small"
                    />
                  }
                  label={metric.label}
                />
              ))}
            </FormGroup>

            <Box className={classes.buttonContainer}>
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={loading || selectedMetrics.length === 0}
              >
                {loading ? <CircularProgress size={20} /> : 'Preview'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<GetAppIcon />}
                onClick={handleExport}
                disabled={loading || selectedMetrics.length === 0}
              >
                {loading ? <CircularProgress size={20} /> : 'Export Report'}
              </Button>
            </Box>
          </div>
        </InfoCard>
      </Grid>

      {/* Preview */}
      <Grid item xs={12} md={6}>
        <InfoCard title="Preview">
          {preview ? (
            <div className={classes.previewContainer}>
              <pre className={classes.previewCode}>{preview}</pre>
            </div>
          ) : (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">
                Click "Preview" to see a sample of the report data
              </Typography>
            </Box>
          )}
        </InfoCard>
      </Grid>
    </Grid>
  );
};
