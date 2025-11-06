import { useState, useEffect } from 'react';
import { Stack, Typography, Button, Container, Alert } from '@mui/material';
import { CloudOff, ErrorOutline, Refresh, ArrowBack } from '@mui/icons-material';
import { useDynamicTranslate } from '../hooks/useDynamicTranslate';
import { useTranslation } from 'react-i18next';
import connectionMonitor from '../utils/connectionMonitor';

const Offline = () => {
  const { t } = useTranslation('errors');
  const { translateText, offlineTagline } = useDynamicTranslate();
  const [errorType, setErrorType] = useState('offline');
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Check the type of error that brought the user here (from URL params)
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message') || '';
    
    if (status) {
      setErrorType(status);
      
      // Translate the error message if available
      if (message) {
        translateText(message).then(translated => {
          setTranslatedMessage(translated);
        });
      }
    }
    
    // Add connection monitor listener
    const cleanup = connectionMonitor.addListener(isOnline => {
      if (isOnline && errorType === 'offline') {
        // If we're back online and this was an offline error, redirect back
        setTimeout(() => {
          window.history.back();
        }, 2000);
      }
    });
    
    return cleanup;
  }, [translateText, errorType]);

  const handleRetry = () => {
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    // Check connection and reload after a short delay
    setTimeout(() => {
      connectionMonitor.checkConnection();
      window.location.reload();
    }, 1500);
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const renderErrorContent = () => {
    // HTTP error status codes
    if (errorType.match(/^[3-5]\d\d$/)) {
      const statusCode = parseInt(errorType);
      let title, description;

      if (statusCode >= 500) {
        title = t('general.serverError');
        description = translatedMessage || t('connection.failed');
        return (
          <>
            <ErrorOutline sx={{ fontSize: 60, color: '#dc3545' }} />
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#dc3545' }}>
              {statusCode} - {t(`errors.http.${statusCode}.title`, { defaultValue: title })}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: '#721c24' }}>
              {t(`errors.http.${statusCode}.description`, { defaultValue: description })}
            </Typography>
          </>
        );
      } else if (statusCode >= 400) {
        title = t('general.validationFailed');
        description = translatedMessage || t('general.notFound');
        return (
          <>
            <ErrorOutline sx={{ fontSize: 60, color: '#ff9800' }} />
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#ff9800' }}>
              {statusCode} - {t(`errors.http.${statusCode}.title`, { defaultValue: title })}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: '#663c00' }}>
              {t(`errors.http.${statusCode}.description`, { defaultValue: description })}
            </Typography>
          </>
        );
      } else if (statusCode >= 300) {
        title = t('errors.unauthorized');
        description = translatedMessage || t('errors.forbidden');
        return (
          <>
            <ErrorOutline sx={{ fontSize: 60, color: '#0288d1' }} />
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#0288d1' }}>
              {statusCode} - {t(`errors.http.${statusCode}.title`, { defaultValue: title })}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: '#0d47a1' }}>
              {t(`errors.http.${statusCode}.description`, { defaultValue: description })}
            </Typography>
          </>
        );
      }
    }
    
    // Default offline error
    return (
      <>
        <CloudOff sx={{ fontSize: 60, color: '#f57c00' }} />
        <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#f57c00' }}>
          {t('connection.offline')}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: '#e65100' }}>
          {translatedMessage || t('connection.checkConnection')}
        </Typography>
        
        {isReconnecting && (
          <Alert severity="info" sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
            {offlineTagline === "भाषा सीमाओं को पार करें - ऑफ़लाइन भी!" ? 
              t('connection.reconnecting') : offlineTagline}
          </Alert>
        )}
      </>
    );
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 10 }}>
      <Stack 
        sx={{ 
          bgcolor: errorType.startsWith('5') ? '#f8d7da' : 
                 errorType.startsWith('4') ? '#fff3cd' : 
                 errorType.startsWith('3') ? '#d1ecf1' : '#f8d7da', 
          borderRadius: '8px', 
          padding: 4, 
          boxShadow: 3 
        }}
      >
        {renderErrorContent()}
        
        <Stack sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleRetry}
            startIcon={<Refresh />}
            disabled={isReconnecting}
            sx={{ minWidth: '120px' }}
          >
            {isReconnecting ? t('connection.reconnecting') : t('tryAgain')}
          </Button>
          
          <Button 
            variant="outlined"
            onClick={handleGoBack}
            startIcon={<ArrowBack />}
            sx={{ minWidth: '120px' }}
          >
            {t('goBack')}
          </Button>
        </Stack>
        
        {reconnectAttempts > 2 && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            {t('connection.persistentOffline')}
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default Offline;