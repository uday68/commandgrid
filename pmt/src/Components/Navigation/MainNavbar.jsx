import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Box, IconButton, Badge, 
  Drawer, List, ListItem, ListItemIcon, ListItemText,
  Avatar, Button, Tooltip, Menu, MenuItem, Divider, useMediaQuery, CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { 
  Menu as MenuIcon, Dashboard, VideoCall, Groups, Search as SearchIcon,
  Notifications as NotificationsIcon, Settings, AccountCircle, Logout
} from '@mui/icons-material';
import { FiPlus } from 'react-icons/fi';
import NotificationCenter from '../Notifications/NotificationCenter';
import useAuth from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar';

const MainNavbar = ({ 
  onSettingsOpen, 
  unreadNotifications = 0,
  customTheme = {} 
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const navItems = [
    { name: t('navigation.dashboard'), icon: <Dashboard />, path: '/' },
    { name: t('navigation.meetings'), icon: <VideoCall />, path: '/meetings' },
    { name: t('navigation.teams'), icon: <Groups />, path: '/teams' }
  ];

  // Mock fetch navigation data function
  const fetchNavigationData = async () => {
    setLoading(true);
    try {
      // In real implementation, this would be an API call
      // const response = await axios.get('/api/navigation');
      // Handle actual data if API is implemented
      
      // For now, just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch navigation data:', error);
      setLoading(false);
      // Navigation will use default data defined in component
    }
  };

  useEffect(() => {
    fetchNavigationData();
  }, []);

  // Handle drawer toggle
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Handle start meeting
  const startImmediateMeeting = () => {
    // Implement meeting creation logic
    navigate('/meeting/create?immediate=true');
  };

  // App bar style based on custom theme
  const appBarStyle = {
    backgroundColor: customTheme.navbar?.background || theme.palette.primary.dark,
    color: customTheme.navbar?.textColor || '#ffffff',
    boxShadow: customTheme.navbar?.elevation === 0 ? 'none' : undefined,
    borderBottom: customTheme.navbar?.elevation === 0 
      ? `1px solid ${theme.palette.divider}` 
      : 'none'
  };

  // Add a loading indicator in the button if needed
  const StartMeetingButton = () => (
    <Tooltip title={t('meetings.startImmediate')}>
      <Button
        onClick={startImmediateMeeting}
        variant="contained"
        color="secondary"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <VideoCall />}
        sx={{
          mx: 2,
          textTransform: 'none',
          fontWeight: 500,
          display: { xs: 'none', md: 'flex' }
        }}
        disabled={loading}
      >
        {t('meetings.start')}
      </Button>
    </Tooltip>
  );

  return (
    <>
      <AppBar position="fixed" sx={appBarStyle}>
        <Toolbar>
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo & App name */}
          <Typography variant="h6" component="div" sx={{ 
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            color: customTheme.navbar?.logoColor || 'white'
          }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ height: 32, marginRight: 10 }}
            />
            {t('app.name')}
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ ml: 4, display: 'flex' }}>
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  color="inherit"
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    mx: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: '8px',
                    px: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ...(location.pathname === item.path ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    } : {})
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Search */}
          <IconButton color="inherit" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
          </IconButton>

          {/* Start Meeting Button */}
          <StartMeetingButton />

          {/* Notifications */}
          <NotificationCenter 
            count={unreadNotifications} 
            theme={theme.palette.mode} 
          />

          {/* Settings */}
          <IconButton color="inherit" onClick={onSettingsOpen}>
            <Settings />
          </IconButton>

          {/* User Menu */}
          <IconButton
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleUserMenuOpen}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <Avatar 
              src={user?.profile_picture}
              alt={user?.name}
              sx={{ 
                width: 32, 
                height: 32,
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer}
          onKeyDown={toggleDrawer}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ height: 32, marginRight: 10 }}
            />
            <Typography variant="h6" fontWeight="bold">
              {t('app.name')}
            </Typography>
          </Box>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItem 
                button 
                key={item.name} 
                component={Link} 
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem button onClick={onSettingsOpen}>
              <ListItemIcon><Settings /></ListItemIcon>
              <ListItemText primary={t('settings.title')} />
            </ListItem>
            <ListItem button onClick={logout}>
              <ListItemIcon><Logout /></ListItemIcon>
              <ListItemText primary={t('auth.logout')} />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={userMenuAnchor}
        keepMounted
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            mt: 1.5,
            borderRadius: 2,
            minWidth: 220,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {user?.email}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'inline-block',
              px: 1, 
              py: 0.5, 
              borderRadius: 1,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              color: 'primary.main'
            }}
          >
            {user?.role || 'User'}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleUserMenuClose(); navigate('/profile'); }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleUserMenuClose(); onSettingsOpen(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleUserMenuClose(); logout(); }}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Search Dialog */}
      <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default MainNavbar;
