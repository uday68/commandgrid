import React from 'react';
import PropTypes from 'prop-types';
import ErrorBoundary from './ErrorBoundary';
import { Typography, Box, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

/**
 * A simple wrapper that provides fallback UI for components
 * that might throw errors during rendering
 */
const ErrorBoundaryWrapper = ({ 
  children,
  fallbackText = 'Something went wrong with this component.',
  showRefresh = true
}) => {
  const handleRetry = () => {
    window.location.reload();
  };

  const renderFallback = ({ error }) => (
    <Box 
      sx={{ 
        p: 2, 
        border: '1px solid rgba(255, 0, 0, 0.2)', 
        borderRadius: 1, 
        bgcolor: 'rgba(255, 0, 0, 0.05)', 
        textAlign: 'center' 
      }}
    >
      <Typography variant="body2" color="error" gutterBottom>
        {fallbackText}
      </Typography>
      
      {error?.message && (
        <Typography variant="caption" component="p" color="text.secondary" sx={{ mb: 1 }}>
          {error.message}
        </Typography>
      )}
      
      {showRefresh && (
        <Button 
          size="small" 
          startIcon={<Refresh fontSize="small" />}
          onClick={handleRetry}
        >
          Refresh
        </Button>
      )}
    </Box>
  );

  return (
    <ErrorBoundary fallbackRender={renderFallback}>
      {children}
    </ErrorBoundary>
  );
};

ErrorBoundaryWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackText: PropTypes.string,
  showRefresh: PropTypes.bool
};

export default ErrorBoundaryWrapper;
