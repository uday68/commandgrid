import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Box, IconButton, Badge,
  Container, Avatar, useMediaQuery, useTheme, Tooltip, Button
} from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material';
import { FiBell, FiSettings, FiHelpCircle, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import UserMenu from './UserMenu';
import logo from '../../assets/logo.png'; // Add this logo image
import GroupsIcon from '@mui/icons-material/Groups';

const AdminHeader = ({ 
  onMenuToggle, 
  user, 
  theme = 'light', 
  onThemeToggle,
  unreadNotifications = 0
}) => {
  const { t } = useTranslation();
  const muiTheme = useTheme();
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <AppBar 
      position="sticky" 
      color="inherit" 
      elevation={0}
      sx={{
        bgcolor: theme === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: 1,
        borderColor: theme === 'dark' ? 'divider' : 'divider'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Left side */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              onClick={onMenuToggle}
              edge="start"
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={logo} 
                alt="Logo" 
                style={{ 
                  height: 36,
                  marginRight: 12,
                  filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none'
                }} 
              />
              
              <Typography
                variant="h6"
                component={Link}
                to="/admin/dashboard"
                sx={{ 
                  fontWeight: 700,
                  color: 'inherit',
                  textDecoration: 'none',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Project Management Tool
              </Typography>
            </Box>
          </Box>
          
          {/* Center - search */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              justifyContent: 'center',
              mx: 2,
              maxWidth: 500
            }}
          >
            {(searchOpen || !isSmallScreen) && (
              <Box 
                component="form" 
                sx={{ 
                  width: '100%',
                  display: 'flex',
                  bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 2,
                  px: 2
                }}
              >
                <IconButton sx={{ p: '10px' }} aria-label="search">
                  <FiSearch />
                </IconButton>
                <input
                  placeholder={t('search.placeholder')}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: '1rem',
                    padding: '8px 0'
                  }}
                />
              </Box>
            )}
            
            {isSmallScreen && !searchOpen && (
              <IconButton color="inherit" onClick={() => setSearchOpen(true)}>
                <FiSearch />
              </IconButton>
            )}
          </Box>
          
          {/* Right side - actions */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ThemeToggle theme={theme} onChange={onThemeToggle} />
            
            <Tooltip title={t('common.help')}>
              <IconButton color="inherit" size="small" sx={{ ml: 1 }}>
                <FiHelpCircle />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={t('common.settings')}>
              <IconButton 
                component={Link} 
                to="/admin/settings"
                color="inherit" 
                size="small"
                sx={{ ml: 1 }}
              >
                <FiSettings />
              </IconButton>
            </Tooltip>
            
            <Box sx={{ ml: 1 }}>
              <NotificationCenter
                unreadCount={unreadNotifications}
                theme={theme}
              />
            </Box>
            
            <Box sx={{ ml: 2 }}>
              <UserMenu user={user} theme={theme} />
            </Box>
            <Box sx={{ ml: 2 }}>
              <GroupsIcon />
              <IconButton
                component={Link} 
                to="/community"
                color="inherit" 
                size="small"
              >
                <Badge badgeContent={user?.teamCount || 0} color="primary">
                  <GroupsIcon />
                </Badge>
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default AdminHeader;