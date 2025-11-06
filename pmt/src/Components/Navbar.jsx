import React from 'react';
import { AppBar, Toolbar, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'i18n-js/react';

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>
        <Stack sx={{ display: 'flex', alignItems: 'center' }}>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            {t('nav.dashboard')}
          </Button>
          <Button color="inherit" onClick={() => navigate('/profile')}>
            {t('nav.profile')}
          </Button>
          <LanguageSwitcher />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 