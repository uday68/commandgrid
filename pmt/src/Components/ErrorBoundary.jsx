import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Paper, Stack, Container } from '@mui/material';
import { withTranslation } from 'react-i18next';
import { SignalWifiOff, ErrorOutline, Refresh, Home } from '@mui/icons-material';
import { nexaflowStorage } from '../pages/meetings/supabaseClient';
import errorHandler from '../utils/errorHandler';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: errorHandler.isOffline()
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    errorHandler.logError(error, 'ErrorBoundary');
    
    // Store error for debugging
    nexaflowStorage.saveData('_last_error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: Date.now()
    });
    
    this.setState({
      error,
      errorInfo,
      isOffline: errorHandler.isNetworkError(error) || errorHandler.isOffline()
    });
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

  handleRetry = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { t } = this.props;
    const { hasError, isOffline, error } = this.state;
    
    if (isOffline && !hasError) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8, position: 'relative', zIndex: 1100 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4,
              maxWidth: 480,
              textAlign: 'center',
              borderLeft: '4px solid',
              borderColor: 'warning.main',
              borderRadius: 2
            }}
          >
            <SignalWifiOff sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="500">
              {t('connection.offline', { ns: 'errors' })}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {t('connection.checkConnection', { ns: 'errors' })}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleRetry}
              startIcon={<Refresh />}
              sx={{ mt: 2 }}
            >
              {t('tryAgain', { ns: 'errors' })}
            </Button>
          </Paper>
        </Container>
      );
    }
    
    if (hasError) {
      const isConnectionError = errorHandler.isNetworkError(error);
      
      return (
        <Container maxWidth="sm" sx={{ mt: 8, position: 'relative', zIndex: 1100 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderTop: '4px solid',
              borderColor: isConnectionError ? 'warning.main' : 'error.main',
              borderRadius: 2
            }}
          >
            <Stack alignItems="center" mb={3}>
              {isConnectionError ? (
                <SignalWifiOff sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              ) : (
                <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              )}
              
              <Typography variant="h5" fontWeight="500" align="center">
                {isConnectionError 
                  ? t('connection.failed', { ns: 'errors' }) 
                  : t('somethingWentWrong', { ns: 'errors' })}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" align="center" mt={1}>
                {isConnectionError
                  ? t('connection.checkConnection', { ns: 'errors' })
                  : t('applicationCrashed', { ns: 'errors' })}
              </Typography>
            </Stack>
            
            {error?.message && !isConnectionError && (
              <Box sx={{ 
                bgcolor: 'background.default', 
                p: 2, 
                borderRadius: 1,
                mb: 3,
                overflowX: 'auto',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <Typography variant="body2" fontFamily="monospace" whiteSpace="pre-wrap">
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
                {t('tryAgain', { ns: 'errors' })}
              </Button>
              
              <Button 
                variant="outlined"
                onClick={this.handleGoHome}
                startIcon={<Home />}
              >
                {t('returnHome', { ns: 'errors' })}
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  t: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

export default withTranslation(['errors', 'common'])(ErrorBoundary);
