import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Tooltip, 
  CircularProgress, 
  Box,
  Typography,
  Fab,
  Zoom
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ExpandMore, Check, Translate } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { languageService } from '../utils/languageService';

// Styled components with professional styling
const LanguageSelectorButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: theme.spacing(0.75, 1.5),
  borderRadius: 8,
  backgroundColor: theme.palette.mode === 'dark' ? 
    theme.palette.grey[800] : theme.palette.grey[50],
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 
      theme.palette.grey[700] : theme.palette.grey[200],
  },
  '& .MuiButton-endIcon': {
    marginLeft: theme.spacing(0.5),
  },
}));

// Floating FAB styled component
const FloatingLanguageFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  zIndex: 9999, // Highest possible z-index
  boxShadow: theme.shadows[6],
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.grey[100],
  },
  transition: 'all 0.3s ease-in-out',
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 8,
    minWidth: 220,
    boxShadow: theme.shadows[3],
    marginTop: theme.spacing(1),
    zIndex: 10000, // Ensure menu is above everything
  },
  '& .MuiMenuItem-root': {
    padding: theme.spacing(1, 2),
    fontSize: '0.875rem',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.light + '20',
      '&:hover': {
        backgroundColor: theme.palette.primary.light + '30',
      },
    },
  },
}));

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृत', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
];

/**
 * A professional language selector component with flag icons
 */
const LanguageSelector = ({ currentLanguage, onLanguageChange, variant = 'normal', position = { bottom: 24, right: 24 } }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const { t, i18n } = useTranslation();
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = useCallback(async (code) => {
    if (code === i18n.language) {
      handleClose();
      return;
    }

    setIsChanging(true);

    try {
      const success = await languageService.changeLanguage(code);
      
      if (success && onLanguageChange) {
        onLanguageChange(code);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
      handleClose();
    }
  }, [i18n.language, onLanguageChange]);

  const currentLang = LANGUAGES.find(lang => 
    lang.code === (currentLanguage || i18n.language)) || LANGUAGES[0];

  if (variant === 'floating') {
    return (
      <>
        <Zoom in={true}>
          <FloatingLanguageFab
            color="primary"
            size="medium"
            onClick={handleClick}
            aria-label={t('languageSelector.tooltip')}
            aria-controls={open ? 'language-selector-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            sx={{ 
              bottom: position.bottom,
              right: position.right
            }}
          >
            {isChanging ? (
              <CircularProgress size={24} thickness={4} />
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center">
                <Typography variant="button" sx={{ mr: 0.5, fontSize: '1rem' }}>
                  {currentLang.flag}
                </Typography>
                <Translate fontSize="small" />
              </Box>
            )}
          </FloatingLanguageFab>
        </Zoom>
        <StyledMenu
          id="language-selector-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'language-selector-button',
            dense: true,
          }}
          TransitionProps={{ enterDelay: 1 }}
          sx={{ zIndex: 10000 }}
        >
          {LANGUAGES.map((language) => (
            <MenuItem
              key={language.code}
              selected={language.code === i18n.language}
              onClick={() => handleLanguageChange(language.code)}
            >
              <ListItemIcon sx={{ fontSize: '1.2rem', minWidth: 36 }}>
                {language.flag}
              </ListItemIcon>
              <ListItemText 
                primary={language.nativeName}
                secondary={language.name !== language.nativeName ? language.name : undefined}
              />
              {language.code === i18n.language && (
                <Check fontSize="small" color="primary" />
              )}
            </MenuItem>
          ))}
        </StyledMenu>
      </>
    );
  } 
  
  if (variant === 'minimal') {
    return (
      <Box display="flex" alignItems="center">
        <Tooltip title={t('languageSelector.tooltip')} arrow>
          <Button 
            onClick={handleClick}
            size="small" 
            sx={{ 
              minWidth: 0,
              p: 1,
              borderRadius: '50%',
            }}
            aria-label={t('languageSelector.tooltip')}
          >
            <Translate fontSize="small" />
          </Button>
        </Tooltip>
        <StyledMenu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          {LANGUAGES.map((language) => (
            <MenuItem
              key={language.code}
              selected={language.code === i18n.language}
              onClick={() => handleLanguageChange(language.code)}
            >
              <ListItemIcon sx={{ fontSize: '1.1rem', minWidth: 32 }}>
                {language.flag}
              </ListItemIcon>
              <ListItemText primary={language.name} />
              {language.code === i18n.language && (
                <Check fontSize="small" color="primary" />
              )}
            </MenuItem>
          ))}
        </StyledMenu>
      </Box>
    );
  }

  return (
    <div>
      <Tooltip title={t('languageSelector.tooltip')} arrow>
        <LanguageSelectorButton
          id="language-selector-button"
          aria-controls={open ? 'language-selector-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          endIcon={<ExpandMore />}
          disabled={isChanging}
          size="small"
        >
          {isChanging ? (
            <CircularProgress size={16} thickness={4} />
          ) : (
            <>
              <span style={{ marginRight: 8 }}>{currentLang.flag}</span>
              <Typography 
                variant="body2" 
                component="span"
                sx={{ fontWeight: 500 }}
              >
                {currentLang.nativeName}
              </Typography>
            </>
          )}
        </LanguageSelectorButton>
      </Tooltip>
      <StyledMenu
        id="language-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-selector-button',
          dense: true,
        }}
      >
        {LANGUAGES.map((language) => (
          <MenuItem
            key={language.code}
            selected={language.code === i18n.language}
            onClick={() => handleLanguageChange(language.code)}
          >
            <ListItemIcon sx={{ fontSize: '1.2rem', minWidth: 36 }}>
              {language.flag}
            </ListItemIcon>
            <ListItemText 
              primary={language.nativeName}
              secondary={language.name !== language.nativeName ? language.name : undefined}
            />
            {language.code === i18n.language && (
              <Check fontSize="small" color="primary" />
            )}
          </MenuItem>
        ))}
      </StyledMenu>
    </div>
  );
};

LanguageSelector.propTypes = {
  currentLanguage: PropTypes.string,
  onLanguageChange: PropTypes.func,
  variant: PropTypes.oneOf(['normal', 'minimal', 'floating']),
  position: PropTypes.shape({
    bottom: PropTypes.number,
    right: PropTypes.number
  })
};

export default LanguageSelector;