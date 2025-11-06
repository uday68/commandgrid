import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import { Box, Typography, Paper, Divider, Container, Grid, Switch, FormControlLabel, 
  Select, MenuItem, Slider, TextField, Accordion, AccordionSummary, AccordionDetails,
  InputLabel, FormControl, RadioGroup, Radio, Button, Chip, Tooltip, 
  ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ExpandMore, Contrast, TextFields, FormatSize, ColorLens, Palette, 
  Animation, AspectRatio, Save, Refresh, Brightness4, Brightness7, 
  SettingsBrightness } from '@mui/icons-material';

const Settings = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [themeSettings, setThemeSettings] = useState({
    mode: localStorage.getItem('themeMode') || 'light',
    font: localStorage.getItem('themeFont') || 'font-inter',
    fontSize: parseInt(localStorage.getItem('themeFontSize')) || 16,
    contrast: localStorage.getItem('themeContrast') || 'normal',
    spacing: localStorage.getItem('themeSpacing') || 'comfortable',
    primaryColor: localStorage.getItem('themePrimaryColor') || '#1976d2',
    secondaryColor: localStorage.getItem('themeSecondaryColor') || '#9c27b0',
    animations: localStorage.getItem('themeAnimations') !== 'false',
    customBackground: localStorage.getItem('themeCustomBackground') || '',
    roundedCorners: localStorage.getItem('themeRoundedCorners') !== 'false',
    buttonVariant: localStorage.getItem('themeButtonVariant') || 'contained',
    density: localStorage.getItem('themeDensity') || 'standard',
  });
  
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  const fontOptions = [
    { value: 'font-inter', label: 'Inter' },
    { value: 'font-roboto', label: 'Roboto' },
    { value: 'font-open-sans', label: 'Open Sans' },
    { value: 'font-poppins', label: 'Poppins' },
    { value: 'font-montserrat', label: 'Montserrat' }
  ];
  
  const contrastOptions = [
    { value: 'normal', label: t('settings.theme.contrast.normal') },
    { value: 'high', label: t('settings.theme.contrast.high') },
    { value: 'very-high', label: t('settings.theme.contrast.veryHigh') }
  ];
  
  const handleThemeChange = (property) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setThemeSettings(prev => ({
      ...prev,
      [property]: value
    }));
    setUnsavedChanges(true);
  };
  
  const handleToggleButtonChange = (property) => (event, newValue) => {
    if (newValue !== null) {
      setThemeSettings(prev => ({
        ...prev,
        [property]: newValue
      }));
      setUnsavedChanges(true);
    }
  };
  
  const handleSliderChange = (property) => (event, newValue) => {
    setThemeSettings(prev => ({
      ...prev,
      [property]: newValue
    }));
    setUnsavedChanges(true);
  };
  
  const saveThemeSettings = () => {
    // Save all theme settings to localStorage
    Object.entries(themeSettings).forEach(([key, value]) => {
      localStorage.setItem(`theme${key.charAt(0).toUpperCase() + key.slice(1)}`, value);
    });
    
    // Apply theme changes (in a real app, you might dispatch to a context/redux store)
    document.documentElement.setAttribute('data-theme-mode', themeSettings.mode);
    document.documentElement.setAttribute('data-theme-contrast', themeSettings.contrast);
    
    // Don't modify document.body.className directly as it might conflict with language settings
    // Instead, add a specific theme class
    document.body.classList.forEach(cls => {
      if (cls.startsWith('font-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add(themeSettings.font);
    
    document.documentElement.style.setProperty('--font-size-base', `${themeSettings.fontSize}px`);
    
    setUnsavedChanges(false);
    
    // Show success message (in a real app)
    // enqueueSnackbar(t('settings.theme.saveSuccess'), { variant: 'success' });
  };
  
  const resetToDefaults = () => {
    const defaultSettings = {
      mode: 'light',
      font: 'font-inter',
      fontSize: 16,
      contrast: 'normal',
      spacing: 'comfortable',
      primaryColor: '#1976d2',
      secondaryColor: '#9c27b0',
      animations: true,
      customBackground: '',
      roundedCorners: true,
      buttonVariant: 'contained',
      density: 'standard',
    };
    
    setThemeSettings(defaultSettings);
    setUnsavedChanges(true);
  };
  
  // Apply theme when component mounts and when theme settings change
  useEffect(() => {
    // Don't replace body className, add/remove specific font class instead
    document.body.classList.forEach(cls => {
      if (cls.startsWith('font-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add(themeSettings.font);
  }, [themeSettings.font]);
  
  return (
    <div className="settings-page">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('settings.title')}
          </Typography>
          
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('settings.language')}
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              {t('settings.languageDescription')}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <LanguageSelector />
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('settings.notifications')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('settings.notificationsDescription')}
            </Typography>
            <Divider sx={{ my: 2 }} />
            {/* ...existing notifications settings... */}
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('settings.theme.title')}
              </Typography>
              
              <Box>
                {unsavedChanges && (
                  <Tooltip title={t('settings.theme.saveChanges')}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<Save />}
                      onClick={saveThemeSettings}
                      sx={{ mr: 1 }}
                    >
                      {t('common.save')}
                    </Button>
                  </Tooltip>
                )}
                <Tooltip title={t('settings.theme.resetDefaults')}>
                  <Button 
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={resetToDefaults}
                  >
                    {t('settings.theme.reset')}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {t('settings.theme.description')}
            </Typography>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Theme Mode Selection */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                {t('settings.theme.mode')}
              </Typography>
              
              <ToggleButtonGroup
                value={themeSettings.mode}
                exclusive
                onChange={handleToggleButtonChange('mode')}
                aria-label="theme mode"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="light" aria-label="light mode">
                  <Brightness7 sx={{ mr: 1 }} /> {t('settings.theme.modes.light')}
                </ToggleButton>
                <ToggleButton value="dark" aria-label="dark mode">
                  <Brightness4 sx={{ mr: 1 }} /> {t('settings.theme.modes.dark')}
                </ToggleButton>
                <ToggleButton value="system" aria-label="system mode">
                  <SettingsBrightness sx={{ mr: 1 }} /> {t('settings.theme.modes.system')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            {/* Font Settings */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextFields sx={{ mr: 1 }} />
                  {t('settings.theme.typography')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="font-family-label">
                        {t('settings.theme.fontFamily')}
                      </InputLabel>
                      <Select
                        labelId="font-family-label"
                        value={themeSettings.font}
                        onChange={handleThemeChange('font')}
                        label={t('settings.theme.fontFamily')}
                      >
                        {fontOptions.map(option => (
                          <MenuItem 
                            key={option.value} 
                            value={option.value}
                            className={option.value}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      {t('settings.theme.fontSize')}: {themeSettings.fontSize}px
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormatSize sx={{ mr: 2, color: 'text.secondary' }} />
                      <Slider
                        value={themeSettings.fontSize}
                        onChange={handleSliderChange('fontSize')}
                        step={1}
                        marks
                        min={12}
                        max={20}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Appearance and Contrast */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                  <Contrast sx={{ mr: 1 }} />
                  {t('settings.theme.appearance')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="contrast-label">
                        {t('settings.theme.contrastLevel')}
                      </InputLabel>
                      <Select
                        labelId="contrast-label"
                        value={themeSettings.contrast}
                        onChange={handleThemeChange('contrast')}
                        label={t('settings.theme.contrastLevel')}
                      >
                        {contrastOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="spacing-label">
                        {t('settings.theme.spacing')}
                      </InputLabel>
                      <Select
                        labelId="spacing-label"
                        value={themeSettings.spacing}
                        onChange={handleThemeChange('spacing')}
                        label={t('settings.theme.spacing')}
                      >
                        <MenuItem value="compact">{t('settings.theme.spacingOptions.compact')}</MenuItem>
                        <MenuItem value="comfortable">{t('settings.theme.spacingOptions.comfortable')}</MenuItem>
                        <MenuItem value="spacious">{t('settings.theme.spacingOptions.spacious')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="density-label">
                        {t('settings.theme.density')}
                      </InputLabel>
                      <Select
                        labelId="density-label"
                        value={themeSettings.density}
                        onChange={handleThemeChange('density')}
                        label={t('settings.theme.density')}
                      >
                        <MenuItem value="compact">{t('settings.theme.densityOptions.compact')}</MenuItem>
                        <MenuItem value="standard">{t('settings.theme.densityOptions.standard')}</MenuItem>
                        <MenuItem value="comfortable">{t('settings.theme.densityOptions.comfortable')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={themeSettings.roundedCorners}
                          onChange={handleThemeChange('roundedCorners')}
                          color="primary"
                        />
                      }
                      label={t('settings.theme.roundedCorners')}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={themeSettings.animations}
                          onChange={handleThemeChange('animations')}
                          color="primary"
                        />
                      }
                      label={t('settings.theme.enableAnimations')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Colors */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                  <Palette sx={{ mr: 1 }} />
                  {t('settings.theme.colors')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputLabel htmlFor="primary-color">
                      {t('settings.theme.primaryColor')}
                    </InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          mr: 2,
                          backgroundColor: themeSettings.primaryColor,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                      <TextField
                        id="primary-color"
                        type="color"
                        value={themeSettings.primaryColor}
                        onChange={handleThemeChange('primaryColor')}
                        sx={{ width: 100 }}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <InputLabel htmlFor="secondary-color">
                      {t('settings.theme.secondaryColor')}
                    </InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          mr: 2,
                          backgroundColor: themeSettings.secondaryColor,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                      <TextField
                        id="secondary-color"
                        type="color"
                        value={themeSettings.secondaryColor}
                        onChange={handleThemeChange('secondaryColor')}
                        sx={{ width: 100 }}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="button-variant-label">
                        {t('settings.theme.buttonStyle')}
                      </InputLabel>
                      <Select
                        labelId="button-variant-label"
                        value={themeSettings.buttonVariant}
                        onChange={handleThemeChange('buttonVariant')}
                        label={t('settings.theme.buttonStyle')}
                      >
                        <MenuItem value="text">{t('settings.theme.buttonStyles.text')}</MenuItem>
                        <MenuItem value="contained">{t('settings.theme.buttonStyles.contained')}</MenuItem>
                        <MenuItem value="outlined">{t('settings.theme.buttonStyles.outlined')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('settings.theme.customBackground')}
                      value={themeSettings.customBackground}
                      onChange={handleThemeChange('customBackground')}
                      placeholder="URL or gradient (e.g., linear-gradient(to right, #4880EC, #019CAD))"
                      helperText={t('settings.theme.customBackgroundHelp')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Preview */}
            <Box sx={{ mt: 4, p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.theme.preview')}
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: themeSettings.mode === 'dark' ? 'grey.900' : 'background.paper',
                color: themeSettings.mode === 'dark' ? 'common.white' : 'text.primary',
                borderRadius: themeSettings.roundedCorners ? 2 : 0,
                className: themeSettings.font
              }}>
                <Typography variant="body1" gutterBottom style={{ fontSize: `${themeSettings.fontSize}px` }}>
                  {t('settings.theme.previewText')}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button 
                    variant={themeSettings.buttonVariant} 
                    color="primary" 
                    style={{ backgroundColor: themeSettings.buttonVariant === 'contained' ? themeSettings.primaryColor : undefined }}
                  >
                    {t('common.save')}
                  </Button>
                  <Button 
                    variant={themeSettings.buttonVariant} 
                    color="secondary"
                    style={{ backgroundColor: themeSettings.buttonVariant === 'contained' ? themeSettings.secondaryColor : undefined }}
                  >
                    {t('common.cancel')}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </div>
  );
};

export default Settings;
