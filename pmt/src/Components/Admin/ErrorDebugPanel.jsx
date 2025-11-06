import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Button, List, ListItem, 
  ListItemText, Accordion, AccordionSummary, AccordionDetails,
  Chip, Divider, Stack, Alert, CircularProgress, Tooltip, IconButton
} from '@mui/material';
import { 
  ExpandMore, BugReport, RefreshCw, 
  Download, Delete, Memory, Code, ContentCopy as ContentCopyIcon, OpenInNew as OpenInNewIcon, Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import errorLogger from '../../utils/errorLogger';
import { formatDistanceToNow } from 'date-fns';
import useError from '../../hooks/useError';
import { useTranslation } from 'react-i18next';

/**
 * Admin panel for debugging errors in the application
 */
const ErrorDebugPanel = ({ theme = 'light', font = 'font-mono' }) => {
  const [errorLogs, setErrorLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedAccordion, setExpandedAccordion] = useState(null);
  const { error, setError, clearError } = useError({ context: 'ErrorDebugPanel' });
  const { t } = useTranslation();
  
  const currentTheme = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-800',
      card: 'bg-white',
      border: 'border-gray-200',
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/20',
      buttonSecondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      shadow: 'shadow-lg shadow-blue-500/10',
      accent: 'bg-blue-500',
      overlay: 'bg-blue-50'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
      card: 'bg-gray-800',
      border: 'border-gray-700',
      button: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-900/30',
      buttonSecondary: 'bg-gray-700 text-gray-100 hover:bg-gray-600',
      shadow: 'shadow-lg shadow-indigo-900/20',
      accent: 'bg-indigo-500',
      overlay: 'bg-indigo-900/20'
    }
  }[theme] || {
    bg: 'bg-white',
    text: 'text-gray-800',
    card: 'bg-white',
    border: 'border-gray-200',
    button: 'bg-blue-500 text-white hover:bg-blue-600',
    buttonSecondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    shadow: 'shadow-lg',
    accent: 'bg-blue-500',
    overlay: 'bg-blue-50'
  };

  // Load error logs
  useEffect(() => {
    loadErrorLogs();
    collectSystemInfo();
  }, []);
  
  const loadErrorLogs = () => {
    try {
      setLoading(true);
      clearError();
      const logs = errorLogger.getErrorLogs();
      setErrorLogs(logs);
    } catch (err) {
      setError(t('errorDebug.failedToLoadLogs'));
    } finally {
      setLoading(false);
    }
  };
  
  const collectSystemInfo = () => {
    try {
      setSystemInfo({
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        online: navigator.onLine ? t('common.yes') : t('common.no'),
        memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : t('common.unknown'),
        cores: navigator.hardwareConcurrency || t('common.unknown'),
      });
    } catch (err) {
      console.error(t('errorDebug.failedToCollectSystemInfo'), err);
    }
  };
  
  const clearLogs = () => {
    try {
      errorLogger.clearErrorLogs();
      setErrorLogs([]);
    } catch (err) {
      setError(t('errorDebug.failedToClearLogs'));
    }
  };
  
  const downloadLogs = () => {
    try {
      const jsonData = JSON.stringify(errorLogs, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `error_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(t('errorDebug.failedToDownloadLogs'));
    }
  };

  const getFilteredLogs = () => {
    let filtered = [...errorLogs];
    
    // Apply context filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.context === filter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message?.toLowerCase().includes(query) || 
        log.stack?.toLowerCase().includes(query) ||
        log.context?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleAccordionChange = (id) => {
    setExpandedAccordion(expandedAccordion === id ? null : id);
  };

  const getUniqueContexts = () => {
    const contexts = errorLogs.map(log => log.context).filter(Boolean);
    return ['all', ...new Set(contexts)];
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`${currentTheme.card} ${font} rounded-xl ${currentTheme.shadow} p-6 border ${currentTheme.border}`}
      style={{ width: '100%' }}
    >
      <motion.div 
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h2 className={`text-2xl font-bold flex items-center ${currentTheme.text}`}>
          <BugReport className="mr-2" /> {t('errorDebug.title')}
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('errorDebug.searchErrors')}
              className={`pl-8 pr-4 py-2 rounded-md border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text} w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            />
            <SearchIcon className="absolute left-2 top-2.5 text-gray-400" fontSize="small" />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`pl-3 pr-8 py-2 rounded-md border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text} focus:ring-2 focus:ring-blue-500 focus:outline-none`}
          >
            {getUniqueContexts().map(context => (
              <option key={context} value={context}>
                {context === 'all' ? t('errorDebug.allContexts') : context}
              </option>
            ))}
          </select>
        </div>
      </motion.div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-red-100 text-red-700"
        >
          <span>{error}</span>
          <button 
            onClick={clearError} 
            className="p-1 rounded-full hover:bg-red-200"
          >
            ×
          </button>
        </motion.div>
      )}
      
      <div className="flex flex-wrap gap-4 mb-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadErrorLogs}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentTheme.buttonSecondary} transition-all duration-200`}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={16} thickness={4} className="text-blue-500" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('errorDebug.refresh')}
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadLogs}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentTheme.buttonSecondary} transition-all duration-200`}
          disabled={errorLogs.length === 0 || loading}
        >
          <Download className="w-4 h-4" /> {t('errorDebug.downloadLogs')}
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearLogs}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 transition-all duration-200`}
          disabled={errorLogs.length === 0 || loading}
        >
          <Delete className="w-4 h-4" /> {t('errorDebug.clearLogs')}
        </motion.button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* System Info */}
        <div className="col-span-1 lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-lg border ${currentTheme.border} ${currentTheme.card} ${currentTheme.shadow}`}
          >
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${currentTheme.text}`}>
              <Memory className="mr-2" /> {t('errorDebug.systemInfo')}
            </h3>
            
            <div className="space-y-2">
              {Object.entries(systemInfo).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700">
                  <span className={`font-medium ${currentTheme.text}`}>{t(`errorDebug.${key}`)}</span>
                  <span className="text-gray-500">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Error Logs */}
        <div className="col-span-1 lg:col-span-3">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-lg border ${currentTheme.border} ${currentTheme.card} ${currentTheme.shadow}`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold flex items-center ${currentTheme.text}`}>
                <Code className="mr-2" /> {t('errorDebug.errorLogs')} 
                <Chip 
                  label={getFilteredLogs().length} 
                  size="small" 
                  color={getFilteredLogs().length > 0 ? "error" : "default"} 
                  sx={{ ml: 2 }}
                />
              </h3>
              
              <Typography variant="body2" color="textSecondary">
                {searchQuery && getFilteredLogs().length !== errorLogs.length && 
                  `${getFilteredLogs().length} of ${errorLogs.length} errors`
                }
              </Typography>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <CircularProgress />
              </div>
            ) : getFilteredLogs().length === 0 ? (
              <Alert severity="info">{searchQuery ? t('errorDebug.noMatchingLogs') : t('errorDebug.noLogs')}</Alert>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {getFilteredLogs().map((log, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Accordion 
                        expanded={expandedAccordion === index}
                        onChange={() => handleAccordionChange(index)}
                        className={`mb-2 rounded-xl overflow-hidden ${currentTheme.shadow} border ${currentTheme.border}`}
                        sx={{ 
                          '&:before': { display: 'none' },
                          bgcolor: expandedAccordion === index ? `${currentTheme.overlay}` : 'transparent'
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <div className="flex flex-col sm:flex-row sm:items-center w-full pr-4">
                            <div className="flex-1">
                              <Typography className="font-medium line-clamp-1">{log.message}</Typography>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-2 mt-1 sm:mt-0">
                              <Chip 
                                label={log.context || t('common.unknown')} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0.5, fontSize: '0.7rem' } }}
                              />
                              <Typography variant="caption" className="text-gray-500 whitespace-nowrap">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                              </Typography>
                            </div>
                          </div>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={2}>
                            {log.stack && (
                              <Box>
                                <Typography variant="subtitle2" gutterBottom>{t('errorDebug.stackTrace')}:</Typography>
                                <Paper 
                                  variant="outlined" 
                                  sx={{ 
                                    p: 2, 
                                    maxHeight: 200, 
                                    overflow: 'auto', 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.8rem',
                                    bgcolor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
                                  }}
                                >
                                  <pre>{log.stack}</pre>
                                </Paper>
                              </Box>
                            )}
                            
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>{t('errorDebug.metadata')}:</Typography>
                              <List dense sx={{ bgcolor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderRadius: 1, p: 1 }}>
                                {Object.entries(log.metadata || {}).length > 0 ? (
                                  Object.entries(log.metadata || {}).map(([key, value]) => (
                                    <ListItem key={key} sx={{ px: 1, py: 0.5 }}>
                                      <ListItemText 
                                        primary={
                                          <Typography variant="body2">
                                            <span className="font-bold">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : value}
                                          </Typography>
                                        }
                                      />
                                    </ListItem>
                                  ))
                                ) : (
                                  <ListItem sx={{ px: 1, py: 0.5 }}>
                                    <ListItemText primary="No metadata available" />
                                  </ListItem>
                                )}
                              </List>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Tooltip title="Copy error details">
                                <IconButton size="small" onClick={() => navigator.clipboard.writeText(JSON.stringify(log, null, 2))}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View full details">
                                <IconButton size="small">
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorDebugPanel;
