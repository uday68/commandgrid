import React, { Component } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { withTranslation } from 'react-i18next';
import { WiFiOff, Error as ErrorIcon, Refresh } from '@mui/icons-material';
import { nexaflowStorage } from '../pages/meetings/supabaseClient';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: !navigator.onLine
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Store error in local storage for debugging
    nexaflowStorage.saveData('_last_error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: Date.now()
    });
    
    // Check if error is connection-related
    const isNetworkError = this.isNetworkError(error);
    if (isNetworkError) {
      this.setState({ isOffline: true });
    }
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  isNetworkError(error) {
    if (!error) return false;
    
    const networkErrorMessages = [
      'network error',
      'failed to fetch',
      'networkerror',
      'timeout',
      'abort',
      'cannot connect',
      'connection refused',
      'name not resolved',
      'err_name_not_resolved',
      'internet disconnected',
    ];
    
    const errorString = (error.message || '').toLowerCase();
    return networkErrorMessages.some(msg => errorString.includes(msg));
  }

  handleRetry = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { t } = this.props;
    const { hasError, isOffline, error } = this.state;
    
    if (isOffline && !hasError) {
      // Just show the offline message without error
      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderTop: '4px solid',
              borderColor: 'warning.main'
            }}
          >
            <WiFiOff sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {t('errors.connection.offline')}
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
              {t('errors.connection.checkConnection')}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleRetry}
              startIcon={<Refresh />}
            >
              {t('errors.tryAgain')}
            </Button>
          </Paper>
          {this.props.offlineContent}
        </Container>
      );
    }
    
    if (hasError) {
      const isConnectionError = this.isNetworkError(error);
      
      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderTop: '4px solid',
              borderColor: isConnectionError ? 'warning.main' : 'error.main'
            }}
          >
            {isConnectionError ? (
              <WiFiOff sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            )}
            
            <Typography variant="h5" gutterBottom>
              {isConnectionError 
                ? t('errors.connection.failed') 
                : t('errors.generalError')}
            </Typography>
            
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              {isConnectionError
                ? t('errors.connection.checkConnection')
                : t('errors.somethingWentWrong')}
            </Typography>
            
            {error?.message && (
              <Box sx={{ 
                bgcolor: 'background.default', 
                p: 2, 
                borderRadius: 1,
                mb: 4,
                textAlign: 'left',
                overflowX: 'auto'
              }}>
                <Typography variant="body2" component="code">
                  {error.message}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                {t('errors.tryAgain')}
              </Button>
              
              <Button 
                variant="outlined"
                onClick={this.handleGoBack}
              >
                {t('common.goBack')}
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default withTranslation(['errors', 'common'])(ErrorBoundary);
