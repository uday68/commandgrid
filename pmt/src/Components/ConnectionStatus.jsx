import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Slide } from '@mui/material';
import { SignalWifiOff } from '@mui/icons-material'; // Changed from WiFiOff to SignalWifiOff
import { useTranslation } from 'react-i18next';
import { nexaflowStorage } from '../pages/meetings/supabaseClient';

const ConnectionStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleStatusChange = () => {
      const isCurrentlyOffline = !navigator.onLine;
      setIsOffline(isCurrentlyOffline);
      
      if (isCurrentlyOffline) {
        setShowStatus(true);
        nexaflowStorage.saveData('_connection_status', { 
          status: 'offline', 
          timestamp: Date.now() 
        });
      } else {
        nexaflowStorage.saveData('_connection_status', { 
          status: 'online', 
          timestamp: Date.now() 
        });
        
        // Hide after delay when coming back online
        setTimeout(() => {
          setShowStatus(false);
        }, 3000);
      }
    };

    // Set initial state
    handleStatusChange();

    // Add event listeners
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <Slide direction="up" in={showStatus} mountOnEnter unmountOnExit>
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: 2,
          backgroundColor: isOffline ? 'error.dark' : 'success.dark',
          color: 'white',
          borderRadius: 2,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <SignalWifiOff sx={{ mr: 1 }} />
        <Typography variant="body2">
          {t('connection.offline')}
        </Typography>
      </Paper>
    </Slide>
  );
};

export default ConnectionStatus;
