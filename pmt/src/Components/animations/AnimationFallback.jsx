import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * A fallback component displayed when animations can't be loaded
 */
const AnimationFallback = ({ error, height = '400px', children }) => {
  const { t } = useTranslation();
  
  if (!error) {
    return children || null;
  }
  
  return (
    <Box 
      sx={{ 
        height, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        p: 3 
      }}
    >
      <Alert severity="info" sx={{ mb: 2, maxWidth: '100%' }}>
        {t('animations.notAvailable', 'Animations are not available')}
      </Alert>
      
      <Typography variant="body2" color="text.secondary" align="center">
        {error.message || t('animations.notLoaded', 'Animation libraries could not be loaded')}
      </Typography>
    </Box>
  );
};

export default AnimationFallback;
