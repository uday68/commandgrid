import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import { 
  Close,
  Download, 
  Analytics, 
  CloudUpload,
  Assessment,
  DataArray,
  TrendingUp,
  BarChart,
  PieChart,
  Timeline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import DataVisualization from '../Data_visualization';

const EnhancedDataVisualizationDemo = ({ isOpen, onClose, theme = 'light' }) => {
  const [showViz, setShowViz] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [aiBackendStatus, setAiBackendStatus] = useState('checking');
  
  const sampleDatasets = [
    {
      name: 'Project Management Data',
      description: 'Sample project data with budgets, progress, and team metrics',
      file: 'project_data.csv',
      icon: <Assessment />,
      size: '15 rows, 14 columns',
      type: 'Business Analytics',
      aiInsights: [
        'Budget variance analysis opportunities',
        'Team efficiency correlation patterns',
        'Project completion predictive modeling'
      ],
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
      icon: <Timeline />,
      size: '12 rows, 11 columns',
      type: 'Time Series',
      aiInsights: [
        'Seasonal trend detection available',
        'Growth rate calculation opportunities',
        'Anomaly detection possibilities'
      ],
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
      icon: <TrendingUp />,
      size: '15 rows, 10 columns',
      type: 'HR Analytics',
      aiInsights: [
        'Performance correlation analysis',
        'Salary optimization insights',
        'Department comparison opportunities'
      ],
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
      icon: <BarChart />,
      size: '20 rows, 8 columns',
      type: 'Operational Data',
      aiInsights: [
        'Resolution time pattern analysis',
        'Priority vs severity correlation',
        'Team workload distribution insights'
      ],
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
      icon: <PieChart />,
      size: '8 rows, 9 columns',
      type: 'Financial Analytics',
      aiInsights: [
        'Revenue growth trajectory analysis',
        'ROI optimization opportunities',
        'Market share trend predictions'
      ],
      recommendations: [
        'Line charts for revenue and profit trends',
        'Area charts for cumulative growth',
        'Bar charts for quarterly comparisons'
      ]
    }
  ];

  // Check AI backend status
  useEffect(() => {
    const checkAIBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health/ai');
        const data = await response.json();
        setAiBackendStatus(data.status === 'healthy' ? 'online' : 'offline');
      } catch (error) {
        setAiBackendStatus('offline');
      }
    };

    if (isOpen) {
      checkAIBackend();
    }
  }, [isOpen]);

  const downloadSampleDataset = (filename) => {
    const link = document.createElement('a');
    link.href = `/sample_datasets/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'checking': return 'info';
      default: return 'warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'AI Assistant Ready';
      case 'offline': return 'AI Assistant Offline';
      case 'checking': return 'Checking AI Status...';
      default: return 'Unknown Status';
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Analytics color="primary" />
            <Typography variant="h5" component="div">
              Data Visualization Studio
            </Typography>
            <Chip 
              label={getStatusText(aiBackendStatus)}
              color={getStatusColor(aiBackendStatus)}
              variant="outlined"
              size="small"
            />
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Sample Datasets" icon={<DataArray />} />
              <Tab label="AI Features" icon={<Analytics />} />
              <Tab label="Getting Started" icon={<CloudUpload />} />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={2}>
              {sampleDatasets.map((dataset, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      elevation={3}
                      sx={{
                        height: '100%',
                        '&:hover': {
                          boxShadow: 6,
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          {dataset.icon}
                          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                            {dataset.name}
                          </Typography>
                          <Chip label={dataset.type} size="small" color="primary" variant="outlined" />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {dataset.description}
                        </Typography>
                        
                        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                          📊 {dataset.size}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                          🤖 AI Insights Available:
                        </Typography>
                        <List dense>
                          {dataset.aiInsights.map((insight, idx) => (
                            <ListItem key={idx} sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 20 }}>
                                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={insight} 
                                primaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>

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
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1">
                <strong>🚀 Advanced AI Features:</strong>
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🧠 Real-time Analysis
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Our AI automatically analyzes your data as you upload it, providing instant insights about patterns, outliers, and relationships.
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Automatic column type detection" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Statistical summary generation" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Correlation analysis" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      💬 Interactive Chat Assistant
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Ask questions about your data in natural language and get intelligent responses with actionable insights.
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Natural language queries" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Chart type recommendations" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Data interpretation help" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📈 Smart Visualization
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Get intelligent suggestions for the best chart types based on your data characteristics and analysis goals.
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Automatic chart type suggestions" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Color scheme optimization" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Interactive filtering" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🔮 Predictive Analytics
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Advanced algorithms help identify trends and make predictions based on your historical data patterns.
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Trend detection" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Anomaly identification" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Forecasting capabilities" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚀 Quick Start Guide
                </Typography>
                <Typography component="div" variant="body1">
                  <ol style={{ paddingLeft: 20 }}>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Download Sample Data:</strong> Start with one of our curated datasets from the "Sample Datasets" tab
                    </li>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Launch Visualizer:</strong> Click the "Launch Data Visualizer" button below
                    </li>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Upload Your Data:</strong> Drag and drop your CSV file or click to browse
                    </li>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Explore Visualizations:</strong> Choose chart types and configure axes
                    </li>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Chat with AI:</strong> Use the AI assistant to ask questions about your data
                    </li>
                    <li style={{ marginBottom: 10 }}>
                      <strong>Export Results:</strong> Save your visualizations and insights
                    </li>
                  </ol>
                </Typography>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> For full AI features, ensure the AI backend is running on port 8000. 
                    Current status: <strong>{getStatusText(aiBackendStatus)}</strong>
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Analytics />}
            onClick={() => setShowViz(true)}
            size="large"
          >
            Launch Data Visualizer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Data Visualization Component */}
      <DataVisualization 
        isOpen={showViz} 
        onClose={() => setShowViz(false)}
        t={(key) => key} // Simple translation fallback
      />
    </>
  );
};

export default EnhancedDataVisualizationDemo;
