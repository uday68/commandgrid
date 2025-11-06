import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Tabs, Tab, Divider, Switch,
  FormControlLabel, Slider, Select, MenuItem, InputLabel,
  FormControl, Button, TextField, IconButton, Grid, Collapse,
  Alert, CircularProgress, Tooltip, Dialog, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SoundSettings from './SoundSettings';
import AccessibilitySettings from './AccessibilitySettings';
import KeyboardSettings from './KeyboardSettings';
import CloseIcon from '@mui/icons-material/Close';

const SettingsPanel = ({ open, onClose, defaultTab = 0 }) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

  const defaultSettings = {
    appearance: {
      theme: theme.palette.mode || 'light',
      primaryColor: theme.palette.primary.main,
      secondaryColor: theme.palette.secondary.main,
      fontScale: 1,
      reducedMotion: false,
      borderRadius: 8,
      customTheme: null,
    },
    notifications: {
      email: true,
      push: true,
      sounds: true,
      desktop: true,
      taskReminders: true,
      meetingReminders: true,
      mentions: true,
      updates: true,
      digest: 'daily',
      doNotDisturbStart: '22:00',
      doNotDisturbEnd: '08:00'
    },
    privacy: {
      visibility: 'team',
      activityStatus: true,
      readReceipts: true,
      dataCollection: true,
      shareUsageData: false
    },
    language: {
      appLanguage: i18n.language || 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    },
    ai: {
      enabled: true,
      voiceEnabled: false,
      suggestions: true,
      analytics: true,
      autoComplete: true,
      dataImprovement: false
    },
    sound: {
      volume: 80,
      notificationSound: 'default',
      messageSound: 'subtle',
      callSound: 'ring1',
      mute: false
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      screenReader: false,
      reducedMotion: false,
      keyboardNavigation: true
    },
    keyboard: {
      shortcuts: true,
      navigateWithArrows: true,
      submitWithEnter: true,
      customShortcuts: {}
    }
  };

  const [settings, setSettings] = useState(defaultSettings);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          
          setSettings(defaultSettings);
          setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
        } catch (apiError) {
          console.error('API error:', apiError);
          setSettings(defaultSettings);
          setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setLoadError(t('settings.loadError'));
        setLoading(false);
        setSettings(defaultSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
      }
    };
    
    fetchSettings();
  }, [t]);

  useEffect(() => {
    if (!originalSettings) return;
    
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, originalSettings]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('saving');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setOriginalSettings(JSON.parse(JSON.stringify(settings)));
        setHasChanges(false);
        
        setSaveStatus('success');
      } catch (apiError) {
        console.error('API error saving settings:', apiError);
        localStorage.setItem('userSettings', JSON.stringify(settings));
        setSaveStatus('offline');
      }
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    }
  };

  const handleResetSettings = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
    } else {
      setSettings(defaultSettings);
    }
    setHasChanges(false);
  };

  const handleRetryLoad = () => {
    setLoadError(null);
    window.location.reload();
  };

  const handleCloseWithCheck = () => {
    if (hasChanges) {
      if (window.confirm(t('settings.unsavedChangesWarning'))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (loadError) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {loadError}
          </Typography>
          <Typography variant="body2" paragraph>
            {t('settings.loadErrorDescription')}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" onClick={handleRetryLoad}>
              {t('common.retry')}
            </Button>
          </Box>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleCloseWithCheck}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: isMobile ? 0 : 2,
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
      }}>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}>
          <Typography variant="h6" fontWeight="medium">
            {t('settings.title')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {saveStatus === 'success' && (
              <Alert 
                severity="success" 
                sx={{ py: 0 }}
              >
                {t('settings.saved')}
              </Alert>
            )}
            {saveStatus === 'offline' && (
              <Alert 
                severity="warning" 
                sx={{ py: 0 }}
              >
                {t('settings.savedOffline')}
              </Alert>
            )}
            {saveStatus === 'error' && (
              <Alert 
                severity="error"
                sx={{ py: 0 }}
              >
                {t('settings.saveError')}
              </Alert>
            )}
            <Button 
              variant="outlined"
              size="small"
              onClick={handleResetSettings}
              disabled={!hasChanges || loading || saveStatus === 'saving'}
            >
              {t('settings.reset')}
            </Button>
            <Button 
              variant="contained"
              size="small"
              onClick={handleSaveSettings}
              disabled={!hasChanges || saveStatus === 'saving'}
              startIcon={saveStatus === 'saving' ? <CircularProgress size={16} /> : null}
            >
              {saveStatus === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
            <IconButton onClick={handleCloseWithCheck}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1,
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            width: isMobile ? '100%' : 200,
            borderRight: isMobile ? 0 : 1,
            borderColor: 'divider',
            display: 'flex',
          }}>
            <Tabs
              orientation={isMobile ? "horizontal" : "vertical"}
              variant={isMobile ? "scrollable" : "standard"}
              value={activeTab}
              onChange={handleTabChange}
              sx={{ 
                width: '100%',
                borderRight: 0,
                minHeight: isMobile ? 'auto' : '100%',
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  py: 2,
                  minHeight: isMobile ? 'auto' : 48
                }
              }}
            >
              <Tab 
                label={t('settings.tabs.sound')}
                sx={{ pl: 3 }}
              />
              <Tab 
                label={t('settings.tabs.accessibility')}
                sx={{ pl: 3 }}
              />
              <Tab 
                label={t('settings.tabs.keyboard')}
                sx={{ pl: 3 }}
              />
            </Tabs>
          </Box>

          <Box sx={{ 
            flexGrow: 1, 
            p: 3,
            overflowY: 'auto',
            bgcolor: 'background.paper'
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {activeTab === 0 && (
                  <SoundSettings 
                    settings={settings.sound}
                    onChange={(setting, value) => handleSettingChange('sound', setting, value)}
                  />
                )}
                {activeTab === 1 && (
                  <AccessibilitySettings 
                    settings={settings.accessibility}
                    onChange={(setting, value) => handleSettingChange('accessibility', setting, value)}
                  />
                )}
                {activeTab === 2 && (
                  <KeyboardSettings 
                    settings={settings.keyboard}
                    onChange={(setting, value) => handleSettingChange('keyboard', setting, value)}
                  />
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default SettingsPanel;