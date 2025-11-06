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
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  useTheme
} from '@mui/material';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PictureAsPdf, Assessment } from '@mui/icons-material';
import {
  Close,
  InsertDriveFile,
  CloudUpload,
  Analytics,
  Dataset,
  Code,
  Settings,
  Help,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
  ScatterPlot,
  BubbleChart,
  Chat,
  SentimentSatisfied,
  AttachFile,
  Send,
  DataArray,
  TableChart,
  Timeline
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import HeatMap from '@uiw/react-heat-map';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
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
import errorHandler from '../utils/errorHandler';
import { useError } from '../hooks/useError';
import connectionMonitor from '../utils/connectionMonitor';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const Heatmap = ({ dataKey, ...props }) => (
  <Scatter dataKey={dataKey} {...props} />
);

const HeatmapChart = ({ children, ...props }) => (
  <ScatterChart {...props}>
    {children}
  </ScatterChart>
);

const HistogramChart = ({ children, ...props }) => (
  <BarChart {...props}>
    {children}
  </BarChart>
);

const Histogram = ({ dataKey, ...props }) => (
  <Bar dataKey={dataKey} {...props} />
);

const chartConfig = {
  line: { label: 'Trend', icon: <ShowChart />, color: '#8884d8', Chart: LineChart, Element: Line },
  bar: { label: 'Comparison', icon: <BarChartIcon />, color: '#82ca9d', Chart: BarChart, Element: Bar },
  pie: { label: 'Distribution', icon: <PieChartIcon />, color: '#ffc658', Chart: PieChart, Element: Pie },
  area: { label: 'Progression', icon: <BubbleChart />, color: '#ff8042', Chart: AreaChart, Element: Area },
  scatter: { label: 'Correlation', icon: <ScatterPlot />, color: '#00C49F', Chart: ScatterChart, Element: Scatter },
  heatmap: { label: 'Heatmap', icon: <HeatMap />, color: '#FF6B6B', Chart: HeatmapChart, Element: Heatmap },
  histogram: { label: 'Distribution', icon: <Timeline />, color: '#4ECDC4', Chart: HistogramChart, Element: Histogram }
};

const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    divider: '#e0e0e0',
  },
});

const DataVisualizer = ({ isOpen, onClose, theme = defaultTheme, highContrast = false }) => {
  const { t } = useTranslation();
  const muiTheme = useTheme() || theme;
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('line');
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [dataGrid, setDataGrid] = useState(false);
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // Safe access to theme properties
  const getThemeValue = (path, defaultValue) => {
    try {
      return path.split('.').reduce((obj, key) => obj[key], muiTheme) || defaultValue;
    } catch {
      return defaultValue;
    }
  };
  useEffect(() => {
    if (isOpen && showChat) {
      const token = localStorage.getItem('authToken');
      if (token) {
        wsRef.current = new WebSocket(`ws://localhost:8000/ws/ai_assistant?token=${token}`);
        
        wsRef.current.onopen = () => {
          console.log('AI Chat WebSocket connected');
          setChatMessages(prev => [...prev, {
            text: 'AI Assistant connected! You can ask questions about your data.',
            type: 'system',
            timestamp: new Date().toISOString()
          }]);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.response) {
              setChatMessages(prev => [...prev, {
                text: message.response,
                type: 'ai',
                timestamp: message.timestamp || new Date().toISOString()
              }]);
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
          setChatMessages(prev => [...prev, {
            text: 'Connection error. Please check if the AI service is running.',
            type: 'error',
            timestamp: new Date().toISOString()
          }]);
        };

        return () => {
          if (wsRef.current) {
            wsRef.current.close();
          }
        };
      }
    }
  }, [isOpen, showChat]);

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
            y_axis: yAxis
          } : null,
          file_info: selectedFile ? {
            name: selectedFile.name,
            size: selectedFile.size
          } : null
        },
        conversation_id: `viz_${Date.now()}`
      };
      
      // Add user message to chat
      setChatMessages(prev => [...prev, {
        text: newMessage,
        type: 'user',
        timestamp: new Date().toISOString(),
        attachments: selectedFile ? [selectedFile.name] : []
      }]);
      
      // Send to AI backend
      wsRef.current.send(JSON.stringify(message));
      setNewMessage('');
      scrollToBottom();
    }
  };
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
          setError(t('files.invalidFileType'));
          return;
        }

        if (!parsedData.length) {
          setError(t('dataViz.noValidData'));
          return;
        }

        const numericCols = Object.keys(parsedData[0]).filter((key) =>
          parsedData.some((item) => !isNaN(parseFloat(item[key])))
        );

        if (numericCols.length < (chartType === 'pie' ? 1 : 2)) {
          setError(`${t('dataViz.insufficientNumericalData')} ${chartType === 'pie' ? t('dataViz.atLeastOne') : t('dataViz.atLeastTwo')}`);
          return;
        }

        const cleanData = parsedData.filter((item) =>
          numericCols.every((col) => !isNaN(parseFloat(item[col])))
        );

        const dataWithIds = cleanData.map((item, idx) => ({ ...item, id: idx }));

        setColumns(numericCols);
        setData(dataWithIds);
        setXAxis(numericCols[0]);
        setYAxis(numericCols[1] || numericCols[0]);
        
        // Add AI insight for the data
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const insightMessage = {
            query: `Analyze this dataset with ${dataWithIds.length} rows and columns: ${Object.keys(parsedData[0]).join(', ')}. Provide key insights and visualization recommendations.`,
            context: {
              data_summary: {
                total_rows: dataWithIds.length,
                columns: Object.keys(parsedData[0]),
                numeric_columns: numericCols,
                file_name: file.name
              }
            },
            conversation_id: `analysis_${Date.now()}`
          };
          wsRef.current.send(JSON.stringify(insightMessage));
        }
        
      } catch (err) {
        setError(err.message || 'Error processing file');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError(t('files.readError'));
      setLoading(false);
    };

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, [chartType, t]);

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

  useEffect(() => {
    if (!isOpen) {
      setData([]);
      setSelectedFile(null);
      setChatMessages([]);
    }
  }, [isOpen]);

  const renderChart = () => {
    if (!data.length || !columns.length) return null;
    const { Chart, Element } = chartConfig[chartType];
    const isPieChart = chartType === 'pie';

    const dividerColor = getThemeValue('palette.divider', '#e0e0e0');
    const textSecondary = getThemeValue('palette.text.secondary', '#666666');
    const paperBg = getThemeValue('palette.background.paper', '#ffffff');
    const textPrimary = getThemeValue('palette.text.primary', '#000000');
    const borderRadius = getThemeValue('shape.borderRadius', 4);

    return (
      <ResponsiveContainer width="100%" height={450}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={dividerColor} />
          {!isPieChart && (
            <XAxis 
              dataKey={xAxis} 
              tick={{ fill: textSecondary }}
              axisLine={{ stroke: dividerColor }}
            />
          )}
          {!isPieChart && (
            <YAxis 
              tick={{ fill: textSecondary }}
              axisLine={{ stroke: dividerColor }}
            />
          )}
          <Tooltip 
            contentStyle={{
              background: paperBg,
              borderColor: dividerColor,
              borderRadius: borderRadius
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span style={{ color: textPrimary }}>
                {value}
              </span>
            )}
          />
          {isPieChart ? (
            <Element
              data={data}
              dataKey={yAxis}
              nameKey={xAxis}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Element>
          ) : (
            <Element 
              dataKey={yAxis} 
              stroke={chartConfig[chartType].color}
              fill={chartConfig[chartType].color + '80'}
              strokeWidth={2}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    );
  };

  const navItems = [
    { label: t('dataViz.dataExplorer'), icon: <Dataset /> },
    { label: t('dataViz.predictiveAnalytics'), icon: <Analytics /> },
    { label: t('dataViz.aiChat'), icon: <Chat /> }
  ];

  const dataAvg = (col) => data.reduce((acc, row) => acc + parseFloat(row[col] || 0), 0) / data.length;
  const dataMin = (col) => Math.min(...data.map(row => parseFloat(row[col] || 0)));
  const dataMax = (col) => Math.max(...data.map(row => parseFloat(row[col] || 0)));

  const backgroundDefault = getThemeValue('palette.background.default', '#ffffff');
  const dividerColor = getThemeValue('palette.divider', '#e0e0e0');
  const paperBg = getThemeValue('palette.background.paper', '#f5f5f5');
  const hoverBg = getThemeValue('palette.action.hover', 'rgba(0, 0, 0, 0.04)');

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: backgroundDefault,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar sx={{ gap: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mr: 4 }}>
            <Stack component="span" color="primary.main">
              Analytics
            </Stack>
            Studio
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ flexGrow: 1 }}
          >
            {navItems.map((item, index) => (
              <Tab
                key={index}
                label={item.label}
                icon={item.icon}
                iconPosition="start"
                sx={{
                  minHeight: 64,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 500
                  }
                }}
              />
            ))}
          </Tabs>

          <Button
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 4, py: 1 }}
          >
            Generate Insights
          </Button>
        </Toolbar>
      </AppBar>

      <Stack sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Stack
          sx={{
            width: 280,
            borderRight: `1px solid ${dividerColor}`,
            p: 3,
            background: paperBg
          }}
        >
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Visualization Tools
          </Typography>
          <Divider sx={{ my: 2 }} />

          {Object.entries(chartConfig).map(([key, config]) => (
            <Button
              key={key}
              fullWidth
              onClick={() => setChartType(key)}
              variant={chartType === key ? 'contained' : 'text'}
              startIcon={config.icon}
              sx={{
                justifyContent: 'flex-start',
                mb: 1,
                borderRadius: 2,
                textTransform: 'none',
                '&.MuiButton-contained': {
                  bgcolor: config.color + '20',
                  color: config.color,
                  '&:hover': { bgcolor: config.color + '30' }
                }
              }}
            >
              {config.label}
            </Button>
          ))}

          {data.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Data Configuration
              </Typography>
              <Stack sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  X-Axis
                </Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <Select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    sx={{
                      bgcolor: 'background.paper',
                      '& .MuiSelect-select': {
                        py: 1
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <MenuItem key={`x-${col}`} value={col}>
                        {col}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack>
                <Typography variant="caption" color="textSecondary">
                  Y-Axis
                </Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <Select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                    sx={{
                      bgcolor: 'background.paper',
                      '& .MuiSelect-select': {
                        py: 1
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <MenuItem key={`y-${col}`} value={col}>
                        {col}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </>
          )}
        </Stack>

        <Stack sx={{ flex: 1, p: 4, overflow: 'auto', position: 'relative' }}>
          {activeTab === 2 ? (
            <Stack sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: paperBg,
              borderRadius: 2,
              p: 2
            }}>
              <Stack sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                <List>
                  {chatMessages.map((msg, index) => (
                    <ListItem key={index} sx={{
                      flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                    }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: msg.type === 'user' ? 'primary.main' : 'secondary.main' }}>
                          {msg.type === 'user' ? 'U' : 'AI'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={msg.text}
                        secondary={new Date(msg.timestamp).toLocaleTimeString()}
                        sx={{
                          bgcolor: msg.type === 'user' ? 'primary.light' : 'secondary.light',
                          borderRadius: 4,
                          p: 2,
                          maxWidth: '70%'
                        }}
                      />
                    </ListItem>
                  ))}
                  <div ref={chatEndRef} />
                </List>
              </Stack>
              <Stack sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask me anything about your data..."
                  InputProps={{
                    startAdornment: (
                      <IconButton>
                        <AttachFile />
                      </IconButton>
                    ),
                    endAdornment: (
                      <IconButton>
                        <SentimentSatisfied />
                      </IconButton>
                    )
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={sendChatMessage}
                  endIcon={<Send />}
                  disabled={!newMessage.trim()}
                >
                  Send
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Card
              variant="outlined"
              sx={{
                border: `1px dashed ${dividerColor}`,
                borderRadius: 4,
                minHeight: '100%',
                background: paperBg
              }}
            >
              <CardContent sx={{ height: '100%' }}>
                {!data.length ? (
                  <Stack
                    {...getRootProps()}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 4,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: `2px dashed ${dividerColor}`,
                      borderRadius: 4,
                      '&:hover': {
                        borderColor: 'primary.main',
                        background: hoverBg
                      }
                    }}
                  >
                    <input {...getInputProps()} />
                    {loading ? (
                      <Stack textAlign="center">
                        <CircularProgress size={48} thickness={3} />
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                          Analyzing Dataset...
                        </Typography>
                      </Stack>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Stack textAlign="center" sx={{ maxWidth: 480 }}>
                          <CloudUpload
                            sx={{
                              fontSize: 64,
                              color: 'text.secondary',
                              mb: 2
                            }}
                          />
                          <Typography variant="h6" gutterBottom>
                            {isDragActive ? 'Drop your file here' : 'Drag & Drop your data file'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            Supported formats: CSV, Excel (XLS/XLSX)
                          </Typography>
                          <Button
                            variant="outlined"
                            size="large"
                            sx={{ mt: 2, borderRadius: 2 }}
                          >
                            Select File
                          </Button>
                        </Stack>
                      </motion.div>
                    )}
                  </Stack>
                ) : (
                  <Stack>
                    <Stack sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={selectedFile?.name}
                        variant="outlined"
                        onDelete={() => {
                          setData([]);
                          setSelectedFile(null);
                        }}
                        deleteIcon={<Close />}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {data.length} records • {columns.length} numeric columns
                      </Typography>
                      <Stack sx={{ flexGrow: 1 }} />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setData([])}
                        sx={{ borderRadius: 2 }}
                      >
                        Clear Data
                      </Button>
                    </Stack>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {renderChart()}
                    </motion.div>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>

        {data.length > 0 && (
          <Stack sx={{ 
            width: 300, 
            borderLeft: `1px solid ${dividerColor}`,
            p: 3,
            overflow: 'auto'
          }}>
            <Stack sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <ToggleButtonGroup
                value={dataGrid ? 'grid' : 'chart'}
                exclusive
                onChange={(e, val) => setDataGrid(val === 'grid')}
              >
                <ToggleButton value="grid">
                  <TableChart />
                </ToggleButton>
                <ToggleButton value="chart">
                  <BarChartIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {dataGrid ? (
              <div className="ag-theme-material" style={{ height: 400 }}>
                <AgGridReact
                  rowData={data}
                  columnDefs={columns.map(col => ({
                    field: col,
                    headerName: col,
                    type: 'numericColumn',
                    editable: true
                  }))}
                  onCellValueChanged={(event) => {
                    setData(prev => 
                      prev.map(row => 
                        row.id === event.data.id ? { ...row, [event.colDef.field]: event.newValue } : row
                      )
                    );
                  }}
                  defaultColDef={{
                    flex: 1,
                    sortable: true,
                    filter: true,
                    resizable: true
                  }}
                />
              </div>
            ) : (
              <Stack>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Data Summary
                </Typography>
                <List dense>
                  {columns.map(col => (
                    <ListItem key={col}>
                      <ListItemText
                        primary={col}
                        secondary={`Mean: ${dataAvg(col).toFixed(2)} | Min: ${dataMin(col)} | Max: ${dataMax(col)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      <DialogActions sx={{ borderTop: `1px solid ${dividerColor}`, p: 2 }}>
        <Button
          onClick={onClose}
          variant="text"
          color="inherit"
          sx={{ borderRadius: 2 }}
        >
          Close Workspace
        </Button>
      </DialogActions>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="error"
          sx={{
            background: getThemeValue('palette.error.dark', '#d32f2f'),
            color: getThemeValue('palette.error.contrastText', '#ffffff'),
            borderRadius: 2,
            boxShadow: getThemeValue('shadows.4', '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)')
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

DataVisualizer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  highContrast: PropTypes.bool,
};

export default DataVisualizer;