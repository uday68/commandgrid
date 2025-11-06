import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Alert,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Download, Analytics, Assessment } from '@mui/icons-material';
import DataVisualization from '../Components/Data_visualization';

const DataVisualizationDemo = () => {
  const [showViz, setShowViz] = useState(false);
  
  const sampleDatasets = [
    {
      name: 'Project Management Data',
      description: 'Sample project data with budgets, progress, and team metrics',
      file: 'project_data.csv',
      recommendations: [
        'Use bar charts to compare budgets vs actual costs',
        'Create scatter plots to analyze team size vs progress',
        'Pie charts work well for status distribution'
      ]
    },
    {
      name: 'Monthly Metrics',
      description: 'Time series data showing monthly performance indicators',
      file: 'monthly_metrics.csv',
      recommendations: [
        'Line charts are perfect for time series trends',
        'Compare multiple metrics over time',
        'Use area charts to show cumulative values'
      ]
    },
    {
      name: 'Employee Performance',
      description: 'Individual employee metrics and performance data',
      file: 'employee_performance.csv',
      recommendations: [
        'Bar charts for comparing individual performance',
        'Scatter plots for salary vs performance correlation',
        'Group by department for comparative analysis'
      ]
    },
    {
      name: 'Issue Tracking',
      description: 'Bug reports and feature requests with resolution times',
      file: 'issues_tracking.csv',
      recommendations: [
        'Pie charts for issue type distribution',
        'Bar charts for resolution times by severity',
        'Timeline charts for issue trends'
      ]
    },
    {
      name: 'Financial Data',
      description: 'Quarterly financial performance and growth metrics',
      file: 'financial_data.csv',
      recommendations: [
        'Line charts for revenue and profit trends',
        'Area charts for cumulative growth',
        'Bar charts for quarterly comparisons'
      ]
    }
  ];

  const downloadSampleDataset = (filename) => {
    const link = document.createElement('a');
    link.href = `/sample_datasets/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            Data Visualization Demo
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Experience powerful data visualization with AI-powered insights
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<Analytics />}
            onClick={() => setShowViz(true)}
            sx={{ mt: 2 }}
          >
            Launch Data Visualizer
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body1">
            <strong>AI Features Available:</strong>
            <br />
            • Real-time data analysis and insights
            <br />
            • Automatic visualization recommendations
            <br />
            • Interactive chat assistant for data exploration
            <br />
            • Smart column detection and chart type suggestions
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Sample Datasets
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Download these sample datasets to test the visualization features:
        </Typography>

        <Grid container spacing={3}>
          {sampleDatasets.map((dataset, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {dataset.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {dataset.description}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Visualization Tips:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    {dataset.recommendations.map((tip, tipIndex) => (
                      <Typography component="li" variant="body2" key={tipIndex}>
                        {tip}
                      </Typography>
                    ))}
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => downloadSampleDataset(dataset.file)}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    Download {dataset.file}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            How to Use:
          </Typography>
          <Typography component="div" variant="body1">
            <ol>
              <li>Download one of the sample datasets above</li>
              <li>Click "Launch Data Visualizer" to open the tool</li>
              <li>Drag and drop your CSV file or click to browse</li>
              <li>Choose your chart type and configure axes</li>
              <li>Use the AI chat to ask questions about your data</li>
              <li>Export your visualizations as needed</li>
            </ol>
          </Typography>
        </Box>
      </Paper>

      {/* Data Visualization Component */}
      <DataVisualization 
        isOpen={showViz} 
        onClose={() => setShowViz(false)}
        t={(key) => key} // Simple translation fallback
      />
    </Container>
  );
};

export default DataVisualizationDemo;
