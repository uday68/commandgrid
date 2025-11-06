import React from 'react';
import { 
  Box, Typography, Switch, FormControlLabel, Paper, 
  Button, Link, Alert, Divider, Chip
} from '@mui/material';
import { 
  Visibility, TextFields, TouchApp, Speed, Keyboard
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const AccessibilitySettings = ({ settings, onChange }) => {
  const { t } = useTranslation();

  // Default settings if props are missing
  const defaultSettings = {
    highContrast: false,
    largeText: false,
    screenReader: false,
    reducedMotion: false,
    keyboardNavigation: true
  };

  // Use props settings or defaults if missing
  const accessibilitySettings = settings || defaultSettings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('settings.accessibility.title')}
        </Typography>
        <Chip 
          label={t('settings.accessibility.a11yCompliant')} 
          color="success" 
          size="small" 
        />
      </Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('settings.accessibility.description')}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Visibility sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="medium">
            {t('settings.accessibility.visualAdjustments')}
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={accessibilitySettings.highContrast}
              onChange={(e) => onChange('highContrast', e.target.checked)}
            />
          }
          label={t('settings.accessibility.highContrast')}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
          {t('settings.accessibility.highContrastDescription')}
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={accessibilitySettings.largeText}
              onChange={(e) => onChange('largeText', e.target.checked)}
            />
          }
          label={t('settings.accessibility.largeText')}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
          {t('settings.accessibility.largeTextDescription')}
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={accessibilitySettings.reducedMotion}
              onChange={(e) => onChange('reducedMotion', e.target.checked)}
            />
          }
          label={t('settings.accessibility.reducedMotion')}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
          {t('settings.accessibility.reducedMotionDescription')}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            color={accessibilitySettings.highContrast ? "warning" : "primary"}
            onClick={() => onChange('highContrast', !accessibilitySettings.highContrast)}
            sx={{ mx: 1 }}
          >
            {t('settings.accessibility.previewHighContrast')}
          </Button>
          <Button 
            variant="outlined"
            onClick={() => onChange('largeText', !accessibilitySettings.largeText)}
            sx={{ 
              mx: 1, 
              fontSize: accessibilitySettings.largeText ? '1.2rem' : 'inherit' 
            }}
          >
            {t('settings.accessibility.previewLargeText')}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TouchApp sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="medium">
            {t('settings.accessibility.assistiveTechnologies')}
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={accessibilitySettings.screenReader}
              onChange={(e) => onChange('screenReader', e.target.checked)}
            />
          }
          label={t('settings.accessibility.screenReader')}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
          {t('settings.accessibility.screenReaderDescription')}
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={accessibilitySettings.keyboardNavigation}
              onChange={(e) => onChange('keyboardNavigation', e.target.checked)}
            />
          }
          label={t('settings.accessibility.keyboardNavigation')}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
          {t('settings.accessibility.keyboardNavigationDescription')}
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('settings.accessibility.conformanceNotice')}
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="text" 
          component={Link}
          href="https://example.com/accessibility-guide" 
          target="_blank"
          rel="noopener"
        >
          {t('settings.accessibility.learnMore')}
        </Button>
      </Box>
    </motion.div>
  );
};

export default AccessibilitySettings;
