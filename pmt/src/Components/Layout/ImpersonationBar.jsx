import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Chip } from '@mui/material';
import { FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import useImpersonation from '../../hooks/useImpersonation';

const ImpersonationBar = () => {
  const { isImpersonating, impersonatedUser, isEnding, endImpersonation } = useImpersonation();
  
  if (!isImpersonating) {
    return null;
  }
  
  return (
    <AppBar 
      position="fixed" 
      color="warning" 
      sx={{ 
        top: 0, 
        zIndex: (theme) => theme.zIndex.drawer + 2 
      }}
      component={motion.div}
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <Toolbar variant="dense">
        <FiAlertTriangle style={{ marginRight: 12, fontSize: 20 }} />
        <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 500 }}>
          You are impersonating: 
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
          <Avatar 
            src={impersonatedUser?.profile_picture} 
            alt={impersonatedUser?.name}
            sx={{ width: 24, height: 24, mr: 1 }}
          >
            {impersonatedUser?.name?.[0] || '?'}
          </Avatar>
          <Typography sx={{ mr: 1 }}>
            {impersonatedUser?.name}
          </Typography>
          <Chip 
            label={impersonatedUser?.role} 
            size="small" 
            color="default"
            variant="outlined"
          />
        </Box>
        
        <Button 
          color="inherit" 
          variant="outlined"
          startIcon={<FiXCircle />}
          onClick={endImpersonation}
          disabled={isEnding}
          sx={{ borderRadius: 2, px: 2 }}
        >
          {isEnding ? 'Ending...' : 'End Impersonation'}
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default ImpersonationBar;
