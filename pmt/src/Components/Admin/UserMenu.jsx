import React, { useState } from 'react';
import {
  Avatar, IconButton, Menu, MenuItem, ListItemIcon,
  ListItemText, Divider, Typography, Box
} from '@mui/material';
import {
  FiUser, FiSettings, FiHelpCircle, FiLogOut, FiShield
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const UserMenu = ({ user, theme = 'light' }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path) => {
    handleMenuClose();
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Default user if not provided
  const defaultUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Administrator',
    profile_picture: ''
  };

  const displayUser = user || defaultUser;

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        size="small"
        aria-label="account menu"
      >
        <Avatar 
          alt={displayUser.name} 
          src={displayUser.profile_picture}
          sx={{ width: 36, height: 36, border: theme === 'dark' ? '2px solid rgba(255,255,255,0.2)' : undefined }}
        >
          {displayUser.name?.charAt(0)}
        </Avatar>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 220,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            borderRadius: 2
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {displayUser.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {displayUser.email}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'inline-block',
              px: 1, 
              py: 0.5, 
              borderRadius: 1,
              bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: 'primary.main'
            }}
          >
            {displayUser.role}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={() => handleNavigation('/profile')}>
          <ListItemIcon>
            <FiUser fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleNavigation('/admin/tools')}>
          <ListItemIcon>
            <FiSettings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleNavigation('/admin/security')}>
          <ListItemIcon>
            <FiShield fontSize="small" />
          </ListItemIcon>
          <ListItemText>Security</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleNavigation('/help')}>
          <ListItemIcon>
            <FiHelpCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <FiLogOut fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;