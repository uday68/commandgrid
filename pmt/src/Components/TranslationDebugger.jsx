import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, List, ListItem, ListItemText, Typography,
  Accordion, AccordionSummary, AccordionDetails,
  LinearProgress, Box, Chip, Tab, Tabs, TextField,
  IconButton, Alert, Paper, Grid
} from '@mui/material';
import { 
  ExpandMore, Translate, BugReport, Download,
  Search, FilterList, CheckCircle, Error, Warning
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { languageService } from '../utils/languageService';

/**
 * TranslationDebugger component helps identify and fix missing translations
 * This should only be used in development environments
 */
const TranslationDebugger = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, missing, present
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [registeredMissingKeys, setRegisteredMissingKeys] = useState(null);

  // Get all translation stats on first render
  useEffect(() => {
    setStats(languageService.generateTranslationStats());
    setRegisteredMissingKeys(languageService.getRegisteredMissingKeys());
  }, []);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Generate a template with missing keys for the selected language
  const generateTemplate = () => {
    setIsGeneratingTemplate(true);
    
    try {
      const template = languageService.exportMissingKeysTemplate(selectedLanguage);
      setGeneratedTemplate(JSON.stringify(template, null, 2));
    } catch (error) {
      console.error('Error generating template:', error);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };
  
  // Download the generated template
  const downloadTemplate = () => {
    if (!generatedTemplate) return;
    
    const blob = new Blob([generatedTemplate], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `missing_translations_${selectedLanguage}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Extract missing keys that match search term
  const getFilteredMissingKeys = () => {
    if (!stats || !stats[selectedLanguage]) return [];
    
    const allMissingKeys = Object.entries(stats[selectedLanguage].namespaces)
      .flatMap(([ns, nsStats]) => 
        (nsStats.missingKeys || []).map(key => ({ namespace: ns, key }))
      );
      
    return allMissingKeys
      .filter(item => 
        (filter === 'all' || filter === 'missing') && 
        item.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.key.localeCompare(b.key));
  };
  
  // Extract keys that have been registered as missing during runtime
  const getRegisteredMissingKeys = () => {
    if (!registeredMissingKeys) return [];
    
    const result = [];
    
    Object.entries(registeredMissingKeys).forEach(([namespace, keys]) => {
      Object.entries(keys).forEach(([key, count]) => {
        result.push({ namespace, key, count });
      });
    });
    
    return result
      .filter(item => item.key.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  };
  
  // Clear all registered missing keys
  const clearRegisteredMissingKeys = () => {
    languageService.clearRegisteredMissingKeys();
    setRegisteredMissingKeys({});
  };
  
  // Try to automatically fix common pattern keys
  const fixCommonPatternKeys = () => {
    const report = languageService.fixCommonPatternKeys();
    // Refresh stats after fixing
    setStats(languageService.generateTranslationStats());
    return report;
  };
  
  // Synchronize keys across namespaces
  const synchronizeNamespaces = () => {
    const report = languageService.synchronizeNamespaces();
    // Refresh stats after synchronizing
    setStats(languageService.generateTranslationStats());
    return report;
  };

  if (!stats) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Translation Debugger</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <LinearProgress sx={{ width: '80%' }} />
          </Box>
          <Typography variant="body1" align="center">
            Analyzing translation coverage...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <Translate sx={{ mr: 1 }} /> Translation Debugger 
        <Chip 
          label="Development Only" 
          color="warning" 
          size="small" 
          sx={{ ml: 2 }} 
        />
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Translation Coverage" />
          <Tab label="Missing Keys" />
          <Tab label="Runtime Missing Keys" />
          <Tab label="Key Generator" />
          <Tab label="Auto-Fix" />
        </Tabs>
        
        {/* Tab 1: Translation Coverage */}
        {activeTab === 0 && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Overall Translation Coverage
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {languageService.getSupportedLanguages().map(lang => (
                  <Grid item xs={12} sm={6} md={4} key={lang}>
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        height: '100%',
                        borderLeft: `4px solid ${
                          stats[lang]?.percentage >= 90 ? 'green' :
                          stats[lang]?.percentage >= 70 ? 'orange' : 'red'
                        }`
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">
                          {languageService.getLanguageName(lang)} ({lang})
                        </Typography>
                        <Chip 
                          label={`${stats[lang]?.percentage || 0}%`} 
                          color={
                            stats[lang]?.percentage >= 90 ? 'success' :
                            stats[lang]?.percentage >= 70 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={stats[lang]?.percentage || 0} 
                          sx={{ height: 8, borderRadius: 4 }}
                          color={
                            stats[lang]?.percentage >= 90 ? 'success' :
                            stats[lang]?.percentage >= 70 ? 'warning' : 'error'
                          }
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          {stats[lang]?.translatedKeys || 0} / {stats[lang]?.total || 0} keys
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stats[lang]?.missing || 0} missing
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Coverage by Namespace
            </Typography>
            
            {languageService.getSupportedLanguages().map(lang => (
              <Accordion key={lang}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>
                    {languageService.getLanguageName(lang)} ({lang}) - {stats[lang]?.percentage || 0}% Coverage
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {Object.entries(stats[lang]?.namespaces || {}).map(([ns, nsStats]) => (
                      <ListItem key={ns}>
                        <ListItemText 
                          primary={`${ns}: ${nsStats.percentage}% (${nsStats.translated}/${nsStats.total})`}
                          secondary={
                            nsStats.missing > 0 ? `${nsStats.missing} missing keys` : 'Complete'
                          }
                        />
                        <Box sx={{ width: '50%', mr: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={nsStats.percentage} 
                            color={
                              nsStats.percentage >= 90 ? 'success' :
                              nsStats.percentage >= 70 ? 'warning' : 'error'
                            }
                          />
                        </Box>
                        {nsStats.percentage < 100 && (
                          <Chip 
                            size="small" 
                            label={`${nsStats.missing} missing`} 
                            color={
                              nsStats.percentage >= 90 ? 'success' :
                              nsStats.percentage >= 70 ? 'warning' : 'error'
                            }
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
        
        {/* Tab 2: Missing Keys */}
        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label="Search keys"
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
              
              <Box sx={{ ml: 2, minWidth: 200 }}>
                <TextField
                  select
                  label="Language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                  size="small"
                >
                  {languageService.getSupportedLanguages().filter(lang => lang !== 'en').map(lang => (
                    <option key={lang} value={lang}>
                      {languageService.getLanguageName(lang)} ({lang})
                    </option>
                  ))}
                </TextField>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Missing Keys for {languageService.getLanguageName(selectedLanguage)} ({selectedLanguage})
              </Typography>
              
              {stats[selectedLanguage]?.missing === 0 ? (
                <Alert severity="success">
                  No missing keys found for {languageService.getLanguageName(selectedLanguage)}!
                </Alert>
              ) : (
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <List dense>
                    {getFilteredMissingKeys().map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={item.key}
                          secondary={`Namespace: ${item.namespace}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                startIcon={<Download />}
                variant="outlined"
                onClick={generateTemplate}
                disabled={stats[selectedLanguage]?.missing === 0}
              >
                Generate Missing Keys Template
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                {stats[selectedLanguage]?.missing} missing keys out of {stats[selectedLanguage]?.total} total
              </Typography>
            </Box>
            
            {isGeneratingTemplate && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
            
            {generatedTemplate && (
              <Box sx={{ mt: 2 }}>
                <Paper 
                  variant="outlined" 
                  sx={{ p: 2, maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5' }}
                >
                  <pre>{generatedTemplate}</pre>
                </Paper>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button startIcon={<Download />} onClick={downloadTemplate}>
                    Download Template
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        {/* Tab 3: Runtime Missing Keys */}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">
                Keys Missing During Runtime
              </Typography>
              
              <Button 
                variant="outlined" 
                color="warning" 
                size="small"
                onClick={clearRegisteredMissingKeys}
                disabled={!registeredMissingKeys || Object.keys(registeredMissingKeys).length === 0}
              >
                Clear Missing Keys Log
              </Button>
            </Box>
            
            {(!registeredMissingKeys || Object.keys(registeredMissingKeys).length === 0) ? (
              <Alert severity="info">
                No missing keys have been detected during runtime. This list will populate as users encounter missing translations while using the application.
              </Alert>
            ) : (
              <>
                <TextField
                  label="Search keys"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{ mb: 2 }}
                />
                
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <List dense>
                    {getRegisteredMissingKeys().map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <span>{item.key}</span>
                              <Chip 
                                size="small" 
                                label={item.count} 
                                color="error" 
                                sx={{ ml: 1, minWidth: 30 }} 
                              />
                            </Box>
                          }
                          secondary={`Namespace: ${item.namespace}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </>
            )}
          </Box>
        )}
        
        {/* Tab 4: Key Generator */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Translation Key Generator Helper
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              This tool helps you generate consistent translation keys for common UI elements.
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Feature or section name"
                  fullWidth
                  margin="normal"
                  placeholder="e.g. projects, dashboard, userProfile"
                  helperText="Usually a noun that describes a feature or section"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Element type"
                  fullWidth
                  margin="normal"
                  placeholder="e.g. title, button, error, description"
                  helperText="The type of UI element this text belongs to"
                />
              </Grid>
            </Grid>
            
            <TextField
              label="English text"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              placeholder="Enter the English text that needs translation"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Generated Key Suggestions:
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" fontFamily="monospace">
                  feature.element.camelCaseText
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}
        
        {/* Tab 5: Auto-Fix */}
        {activeTab === 4 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Automatic Translation Fixes
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              These tools attempt to automatically fix translation issues. Always review changes after running automatic fixes.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Fix Common Pattern Keys
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This tool identifies missing keys that follow common patterns (like title/description pairs) and attempts to generate them based on existing translations.
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={fixCommonPatternKeys}
                    startIcon={<CheckCircle />}
                    color="primary"
                    fullWidth
                  >
                    Auto-Fix Pattern Keys
                  </Button>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Synchronize Keys Across Namespaces
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This tool finds keys that exist in one namespace but are missing in another and copies them over, helping ensure consistency.
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={synchronizeNamespaces}
                    startIcon={<CheckCircle />}
                    color="secondary"
                    fullWidth
                  >
                    Synchronize Namespaces
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TranslationDebugger;
