import React, { useState } from 'react';
import { 
  Box, Typography, Switch, FormControlLabel, Paper, 
  List, ListItem, ListItemText, Chip, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Alert, Tooltip
} from '@mui/material';
import { 
  Keyboard as KeyboardIcon, 
  Edit as EditIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const KeyboardSettings = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [newShortcut, setNewShortcut] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Default settings if props are missing
  const defaultSettings = {
    shortcuts: true,
    navigateWithArrows: true,
    submitWithEnter: true,
    customShortcuts: {}
  };

  // Use props settings or defaults if missing
  const keyboardSettings = settings || defaultSettings;
  
  // Default keyboard shortcuts for reference
  const defaultShortcuts = {
    'global.search': 'Ctrl+K',
    'global.notifications': 'Ctrl+N', 
    'global.help': 'Ctrl+H',
    'projects.new': 'Ctrl+Alt+P',
    'tasks.new': 'Ctrl+Alt+T'
  };

  // Combined shortcuts (default + custom)
  const allShortcuts = {
    ...defaultShortcuts,
    ...keyboardSettings.customShortcuts
  };

  const handleEditShortcut = (key) => {
    setEditingShortcut(key);
    setNewShortcut(allShortcuts[key]);
  };

  const handleSaveShortcut = () => {
    if (editingShortcut) {
      const updatedCustomShortcuts = {
        ...keyboardSettings.customShortcuts,
        [editingShortcut]: newShortcut
      };
      
      onChange('customShortcuts', updatedCustomShortcuts);
      setEditingShortcut(null);
    }
  };

  const handleAddCustomShortcut = () => {
    if (newCustomKey && newCustomValue) {
      const updatedCustomShortcuts = {
        ...keyboardSettings.customShortcuts,
        [newCustomKey]: newCustomValue
      };
      
      onChange('customShortcuts', updatedCustomShortcuts);
      setNewCustomKey('');
      setNewCustomValue('');
      setShowCustomDialog(false);
    }
  };

  // Function to capture keyboard combinations
  const captureKeyCombination = (e) => {
    e.preventDefault();
    
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');
    
    // Detect actual key (excluding modifier keys)
    let key = e.key;
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      // Ignore just modifier key presses
      return;
    }
    
    // Format key name
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    
    const combination = [...modifiers, key].join('+');
    setNewShortcut(combination);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <KeyboardIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6">
          {t('settings.keyboard.title')}
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('settings.keyboard.description')}
      </Typography>

      {showInfo && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setShowInfo(false)}>
          {t('settings.keyboard.infoMessage')}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {t('settings.keyboard.enableShortcuts')}
          </Typography>
          <Switch
            checked={keyboardSettings.shortcuts}
            onChange={(e) => onChange('shortcuts', e.target.checked)}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ opacity: keyboardSettings.shortcuts ? 1 : 0.5, pointerEvents: keyboardSettings.shortcuts ? 'auto' : 'none' }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('settings.keyboard.navigationOptions')}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={keyboardSettings.navigateWithArrows}
                onChange={(e) => onChange('navigateWithArrows', e.target.checked)}
              />
            }
            label={t('settings.keyboard.arrowNavigation')}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={keyboardSettings.submitWithEnter}
                onChange={(e) => onChange('submitWithEnter', e.target.checked)}
              />
            }
            label={t('settings.keyboard.enterSubmits')}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {t('settings.keyboard.shortcutReference')}
          </Typography>
          <Box>
            <Tooltip title={t('settings.keyboard.info')}>
              <IconButton size="small" onClick={() => setShowInfo(!showInfo)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowCustomDialog(true)}
              disabled={!keyboardSettings.shortcuts}
            >
              {t('settings.keyboard.addCustom')}
            </Button>
          </Box>
        </Box>

        <List dense sx={{ opacity: keyboardSettings.shortcuts ? 1 : 0.5 }}>
          {Object.entries(allShortcuts).map(([key, value]) => (
            <ListItem 
              key={key} 
              sx={{ py: 0.5 }}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleEditShortcut(key)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText 
                primary={t(`keyboard.${key}`, key)}
                secondary={
                  <Chip 
                    label={value}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      mr: 1
                    }}
                  />
                }
                primaryTypographyProps={{
                  variant: 'body2',
                }}
                secondaryTypographyProps={{
                  variant: 'body2',
                  component: 'div',
                  sx: { mt: 0.5 }
                }}
              />
            </ListItem>
          ))}
        </List>

        <Box mt={2} display="flex" justifyContent="center">
          <Button
            variant="text"
            size="small"
            startIcon={<SettingsIcon fontSize="small" />}
            onClick={() => {}}
            disabled={!keyboardSettings.shortcuts}
          >
            {t('settings.keyboard.resetToDefaults')}
          </Button>
        </Box>
      </Paper>

      {/* Edit shortcut dialog */}
      <Dialog 
        open={editingShortcut !== null} 
        onClose={() => setEditingShortcut(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('settings.keyboard.editShortcut')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {t('settings.keyboard.pressKeyCombination')}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            value={newShortcut}
            onChange={(e) => setNewShortcut(e.target.value)}
            onKeyDown={captureKeyCombination}
            placeholder="e.g. Ctrl+K"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingShortcut(null)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveShortcut} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add custom shortcut dialog */}
      <Dialog 
        open={showCustomDialog} 
        onClose={() => setShowCustomDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('settings.keyboard.addCustomShortcut')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('settings.keyboard.action')}
            fullWidth
            value={newCustomKey}
            onChange={(e) => setNewCustomKey(e.target.value)}
            placeholder="e.g. custom.action"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t('settings.keyboard.shortcut')}
            fullWidth
            value={newCustomValue}
            onChange={(e) => setNewCustomValue(e.target.value)}
            onKeyDown={captureKeyCombination}
            placeholder="e.g. Ctrl+Alt+S"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCustomDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleAddCustomShortcut} 
            variant="contained"
            disabled={!newCustomKey || !newCustomValue}
          >
            {t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default KeyboardSettings;
