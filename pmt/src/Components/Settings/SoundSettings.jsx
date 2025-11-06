import React, { useState } from 'react';
import { 
  Box, Typography, Slider, FormControlLabel, Switch,
  FormControl, Select, MenuItem, InputLabel, Button, Divider,
  Paper, Alert
} from '@mui/material';
import { VolumeUp, VolumeOff, PlayArrow } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SoundSettings = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const [playingSound, setPlayingSound] = useState(null);
  const [soundError, setSoundError] = useState(false);

  // Default settings if props are missing
  const defaultSettings = {
    volume: 80,
    notificationSound: 'default',
    messageSound: 'subtle',
    callSound: 'ring1',
    mute: false
  };

  // Use props settings or defaults if missing
  const soundSettings = settings || defaultSettings;

  const handleVolumeChange = (event, newValue) => {
    onChange('volume', newValue);
  };

  const handleMuteToggle = (event) => {
    onChange('mute', event.target.checked);
  };

  const playSound = (soundType) => {
    setPlayingSound(soundType);
    
    // In a real app, we would play an actual sound file here
    try {
      // const audio = new Audio(`/sounds/${soundSettings[soundType]}.mp3`);
      // audio.volume = soundSettings.mute ? 0 : soundSettings.volume / 100;
      // audio.play();
      
      // Simulate sound playing with a timeout
      setTimeout(() => {
        setPlayingSound(null);
      }, 1000);
    } catch (error) {
      console.error('Error playing sound:', error);
      setSoundError(true);
      setTimeout(() => setSoundError(false), 3000);
      setPlayingSound(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Typography variant="h6" gutterBottom>
        {t('settings.sound.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('settings.sound.description')}
      </Typography>

      {soundError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('settings.sound.playError')}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {t('settings.sound.masterVolume')}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={!soundSettings.mute}
                onChange={(e) => onChange('mute', !e.target.checked)}
              />
            }
            label={t('settings.sound.enabled')}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, mb: 3 }}>
          <VolumeOff color={soundSettings.mute ? "disabled" : "inherit"} />
          <Slider
            value={soundSettings.volume}
            min={0}
            max={100}
            step={1}
            disabled={soundSettings.mute}
            marks={[
              { value: 0, label: '0' },
              { value: 50, label: '50' },
              { value: 100, label: '100' }
            ]}
            valueLabelDisplay="auto"
            onChange={handleVolumeChange}
            sx={{ mx: 2, flexGrow: 1 }}
          />
          <VolumeUp color={soundSettings.mute ? "disabled" : "inherit"} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={playingSound === 'masterVolume' ? null : <PlayArrow />}
            disabled={soundSettings.mute || playingSound !== null}
            onClick={() => playSound('masterVolume')}
          >
            {playingSound === 'masterVolume' ? t('settings.sound.playing') : t('settings.sound.testVolume')}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          {t('settings.sound.notificationSounds')}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" gutterBottom>
              {t('settings.sound.notificationSound')}
            </Typography>
            <Button 
              size="small"
              startIcon={<PlayArrow />}
              disabled={soundSettings.mute || playingSound !== null}
              onClick={() => playSound('notificationSound')}
            >
              {playingSound === 'notificationSound' ? t('settings.sound.playing') : t('settings.sound.test')}
            </Button>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              value={soundSettings.notificationSound}
              onChange={(e) => onChange('notificationSound', e.target.value)}
              disabled={soundSettings.mute}
            >
              <MenuItem value="default">{t('settings.sound.defaultSound')}</MenuItem>
              <MenuItem value="bell">{t('settings.sound.bell')}</MenuItem>
              <MenuItem value="chime">{t('settings.sound.chime')}</MenuItem>
              <MenuItem value="subtle">{t('settings.sound.subtle')}</MenuItem>
              <MenuItem value="none">{t('settings.sound.none')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" gutterBottom>
              {t('settings.sound.messageSound')}
            </Typography>
            <Button 
              size="small"
              startIcon={<PlayArrow />}
              disabled={soundSettings.mute || playingSound !== null}
              onClick={() => playSound('messageSound')}
            >
              {playingSound === 'messageSound' ? t('settings.sound.playing') : t('settings.sound.test')}
            </Button>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              value={soundSettings.messageSound}
              onChange={(e) => onChange('messageSound', e.target.value)}
              disabled={soundSettings.mute}
            >
              <MenuItem value="default">{t('settings.sound.defaultSound')}</MenuItem>
              <MenuItem value="pop">{t('settings.sound.pop')}</MenuItem>
              <MenuItem value="subtle">{t('settings.sound.subtle')}</MenuItem>
              <MenuItem value="none">{t('settings.sound.none')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" gutterBottom>
              {t('settings.sound.callSound')}
            </Typography>
            <Button 
              size="small"
              startIcon={<PlayArrow />}
              disabled={soundSettings.mute || playingSound !== null}
              onClick={() => playSound('callSound')}
            >
              {playingSound === 'callSound' ? t('settings.sound.playing') : t('settings.sound.test')}
            </Button>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              value={soundSettings.callSound}
              onChange={(e) => onChange('callSound', e.target.value)}
              disabled={soundSettings.mute}
            >
              <MenuItem value="ring1">{t('settings.sound.ring1')}</MenuItem>
              <MenuItem value="ring2">{t('settings.sound.ring2')}</MenuItem>
              <MenuItem value="classic">{t('settings.sound.classic')}</MenuItem>
              <MenuItem value="digital">{t('settings.sound.digital')}</MenuItem>
              <MenuItem value="none">{t('settings.sound.none')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default SoundSettings;
