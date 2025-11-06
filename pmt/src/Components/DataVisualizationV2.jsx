import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  Box,
  useTheme
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Analytics,
  Dataset,
  Chat,
  AttachFile,
  Send,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
  ScatterPlot,
  BubbleChart,
  TableChart,
  Timeline,
  Download,
  Insights
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Line,
  Bar,
  Pie,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

const chartConfig = {
  line: { label: 'Line Chart', icon: <ShowChart />, color: '#8884d8', Chart: LineChart, Element: Line },
  bar: { label: 'Bar Chart', icon: <BarChartIcon />, color: '#82ca9d', Chart: BarChart, Element: Bar },
  pie: { label: 'Pie Chart', icon: <PieChartIcon />, color: '#ffc658', Chart: PieChart, Element: Pie },
  area: { label: 'Area Chart', icon: <BubbleChart />, color: '#ff8042', Chart: AreaChart, Element: Area },
  scatter: { label: 'Scatter Plot', icon: <ScatterPlot />, color: '#00C49F', Chart: ScatterChart, Element: Scatter },
};

const DataVisualizationV2 = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiConnected, setAiConnected] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);
  
  // Refs
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // AI WebSocket Connection
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('authToken');
      if (token) {
        const wsUrl = `ws://localhost:8000/ws/ai_assistant?token=${token}`;
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('AI Assistant connected');
          setAiConnected(true);
          setChatMessages(prev => [...prev, {
            text: 'AI Assistant is ready! I can help you analyze your data and suggest visualizations.',
            type: 'ai',
            timestamp: new Date().toISOString()
          }]);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'pong') return; // Ignore pong messages
            
            if (message.response) {
              setChatMessages(prev => [...prev, {
                text: message.response,
                type: 'ai',
                timestamp: message.timestamp || new Date().toISOString()
              }]);
              
              // Extract insights if present
              if (message.insights) {
                setAiInsights(prev => [...prev, ...message.insights]);
              }
            } else if (message.error) {
              setChatMessages(prev => [...prev, {
                text: `Error: ${message.error}`,
                type: 'error',
                timestamp: new Date().toISOString()
              }]);
            }
            scrollToBottom();
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setAiConnected(false);
          setChatMessages(prev => [...prev, {
            text: 'Connection error. AI features may be limited.',
            type: 'error',
            timestamp: new Date().toISOString()
          }]);
        };

        wsRef.current.onclose = () => {
          console.log('AI Assistant disconnected');
          setAiConnected(false);
        };

        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        return () => {
          clearInterval(heartbeat);
          if (wsRef.current) {
            wsRef.current.close();
          }
        };
      } else {
        setChatMessages([{
          text: 'Please log in to access AI features.',
          type: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendChatMessage = () => {
    if (newMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        query: newMessage,
        context: {
          data_summary: data.length > 0 ? {
            total_rows: data.length,
            columns: columns,
            chart_type: chartType,
            x_axis: xAxis,
            y_axis: yAxis,
            sample_data: data.slice(0, 3) // Send first 3 rows as sample
          } : null,
          file_info: selectedFile ? {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type
          } : null
        },
        conversation_id: `viz_${Date.now()}`
      };
      
      // Add user message to chat
      setChatMessages(prev => [...prev, {
        text: newMessage,
        type: 'user',
        timestamp: new Date().toISOString()
      }]);
      
      // Send to AI backend
      wsRef.current.send(JSON.stringify(message));
      setNewMessage('');
      scrollToBottom();
    }
  };

  // File processing
  const processFile = useCallback((file) => {
    setLoading(true);
    setError('');
    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target.result;
        let parsedData = [];
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          const { data: csvData } = Papa.parse(result, {
            header: true,
            skipEmptyLines: true
          });
          parsedData = csvData;
        } else if (
          file.type.includes('sheet') ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls')
        ) {
          const workbook = XLSX.read(result, { type: 'binary' });
          parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
          setError('Unsupported file type. Please upload CSV or Excel files.');
          return;
        }

        if (!parsedData.length) {
          setError('No valid data found in the file.');
          return;
        }

        // Identify numeric columns
        const allKeys = Object.keys(parsedData[0]);
        const numericCols = allKeys.filter((key) =>
          parsedData.some((item) => !isNaN(parseFloat(item[key])) && isFinite(item[key]))
        );

        if (numericCols.length < 1) {
          setError('No numeric columns found for visualization.');
          return;
        }

        // Clean data
        const cleanData = parsedData.filter((item, index) => {
          // Keep rows that have at least some numeric values
          const hasNumericData = numericCols.some(col => 
            !isNaN(parseFloat(item[col])) && isFinite(item[col])
          );
          return hasNumericData;
        }).map((item, idx) => ({ ...item, id: idx }));

        setColumns(allKeys);
        setData(cleanData);
        setXAxis(allKeys[0]);
        setYAxis(numericCols[0]);
        
        // Request AI analysis automatically
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const analysisMessage = {
            query: `Analyze this dataset: "${file.name}" with ${cleanData.length} rows. Columns: ${allKeys.join(', ')}. Numeric columns: ${numericCols.join(', ')}. Provide insights and visualization recommendations.`,
            context: {
              data_summary: {
                total_rows: cleanData.length,
                total_columns: allKeys.length,
                numeric_columns: numericCols,
                file_name: file.name,
                sample_data: cleanData.slice(0, 5)
              }
            },
            conversation_id: `auto_analysis_${Date.now()}`
          };
          wsRef.current.send(JSON.stringify(analysisMessage));
        }
        
      } catch (err) {
        console.error('File processing error:', err);
        setError(err.message || 'Error processing file');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setLoading(false);
    };

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles[0]) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    multiple: false
  });

  // Chart rendering
  const renderChart = () => {
    if (!data.length || !xAxis || !yAxis) {
      return (
        <Box sx={{ 
          height: 400, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 2
        }}>
          <Typography variant="h6" color="text.secondary">
            Upload data to see visualization
          </Typography>
        </Box>
      );
    }

    const { Chart, Element } = chartConfig[chartType];
    const isPieChart = chartType === 'pie';

    // Prepare data for different chart types
    let chartData = data;
    
    if (isPieChart) {
      // For pie charts, aggregate data by xAxis
      const aggregated = {};
      data.forEach(row => {
        const key = row[xAxis];
        const value = parseFloat(row[yAxis]) || 0;
        aggregated[key] = (aggregated[key] || 0) + value;
      });
      chartData = Object.entries(aggregated).map(([name, value]) => ({ name, value }));
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <Chart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          {!isPieChart && (
            <>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
            </>
          )}
          {isPieChart ? (
            <Element
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Element>
          ) : (
            <Element 
              dataKey={yAxis} 
              stroke={chartConfig[chartType].color}
              fill={chartConfig[chartType].color}
              strokeWidth={2}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    );
  };

  // Clear data when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setData([]);
      setSelectedFile(null);
      setChatMessages([]);
      setError('');
      setAiInsights([]);
    }
  }, [isOpen]);

  // Get numeric columns for axis selection
  const numericColumns = columns.filter(col => 
    data.some(row => !isNaN(parseFloat(row[col])) && isFinite(row[col]))
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: { display: 'flex', flexDirection: 'column' }
      }}
    >
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Data Visualization Studio
          </Typography>
          <Chip 
            icon={<Analytics />}
            label={aiConnected ? "AI Connected" : "AI Disconnected"}
            color={aiConnected ? "success" : "default"}
            size="small"
            sx={{ mr: 2 }}
          />
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Data Upload and Configuration */}
        <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', p: 2, overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Data Source
          </Typography>
          
          {/* File Upload */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <Box
                  sx={{
                    border: 2,
                    borderColor: isDragActive ? 'primary.main' : 'grey.300',
                    borderStyle: 'dashed',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragActive ? 'primary.50' : 'grey.50'
                  }}
                >
                  <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body2">
                    {isDragActive ? 'Drop files here' : 'Drag & drop CSV/Excel files or click to browse'}
                  </Typography>
                  {selectedFile && (
                    <Chip
                      label={selectedFile.name}
                      size="small"
                      sx={{ mt: 1 }}
                      color="primary"
                    />
                  )}
                </Box>
              </div>
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Chart Configuration */}
          {data.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Chart Configuration
              </Typography>
              
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Chart Type
                  </Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {Object.entries(chartConfig).map(([key, config]) => (
                      <Grid item xs={6} key={key}>
                        <Button
                          fullWidth
                          variant={chartType === key ? 'contained' : 'outlined'}
                          onClick={() => setChartType(key)}
                          startIcon={config.icon}
                          size="small"
                        >
                          {config.label}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>X-Axis</InputLabel>
                    <Select
                      value={xAxis}
                      onChange={(e) => setXAxis(e.target.value)}
                      label="X-Axis"
                    >
                      {columns.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Y-Axis</InputLabel>
                    <Select
                      value={yAxis}
                      onChange={(e) => setYAxis(e.target.value)}
                      label="Y-Axis"
                    >
                      {numericColumns.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>

              {/* Data Summary */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rows: {data.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Columns: {columns.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Numeric Columns: {numericColumns.length}
                  </Typography>
                </CardContent>
              </Card>
            </>
          )}
        </Box>

        {/* Center Panel - Visualization */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Visualization" icon={<BarChartIcon />} />
            <Tab label="AI Chat" icon={<Chat />} />
            <Tab label="Insights" icon={<Insights />} />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ p: 3, flex: 1 }}>
              <Typography variant="h5" gutterBottom>
                {chartConfig[chartType]?.label || 'Chart'}
              </Typography>
              {renderChart()}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                AI Assistant
              </Typography>
              
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1, 
                p: 2, 
                mb: 2,
                bgcolor: 'grey.50'
              }}>
                {chatMessages.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: message.type === 'user' ? 'primary.main' : 
                              message.type === 'error' ? 'error.main' : 'white',
                      color: message.type === 'user' || message.type === 'error' ? 'white' : 'text.primary',
                      ml: message.type === 'user' ? 4 : 0,
                      mr: message.type === 'user' ? 0 : 4,
                      boxShadow: 1
                    }}
                  >
                    <Typography variant="body2">{message.text}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Ask about your data..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  disabled={!aiConnected}
                />
                <Button
                  variant="contained"
                  onClick={sendChatMessage}
                  disabled={!newMessage.trim() || !aiConnected}
                  startIcon={<Send />}
                >
                  Send
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                AI Insights
              </Typography>
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary">
                        {insight.type}
                      </Typography>
                      <Typography variant="body2">
                        {insight.description}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Upload data and chat with AI to get insights.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

DataVisualizationV2.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DataVisualizationV2;
