import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { useNavigate, useRouteError } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const Error = () => {
  const { t } = useTranslation(['errors', 'common']);
  const error = useRouteError();
  const navigate = useNavigate();
  
  // Extract error message or code
  const errorMessage = error?.statusText || error?.message || t('errors.unexpectedError');
  const errorCode = error?.status || (error?.message?.includes('404') ? 404 : null);
  
  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          {t('errors.pageError')}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {errorMessage}
        </Typography>
        
        {errorCode && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {t(`errors.code.${errorCode}`)}
          </Typography>
        )}
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => navigate(-1)}
          >
            {t('common.goBack')}
          </Button>
          
          <Button 
            variant="outlined"
            onClick={() => navigate('/')}
          >
            {t('common.returnHome')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Error;
