import React, { useState } from 'react';
import { 
  Badge, IconButton, Popover, List, ListItem, ListItemText, 
  ListItemAvatar, Avatar, Typography, Box, Button, Divider,
  Tooltip
} from '@mui/material';
import { FiBell, FiX, FiCheck, FiAlertCircle, FiInfo, FiMessageSquare } from 'react-icons/fi';
import { motion } from 'framer-motion';

const NotificationCenter = ({ notifications = [], theme = 'light' }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(notifications?.filter(n => !n.read)?.length || 3);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = () => {
    setUnreadCount(0);
    // Here you would also update the notifications in your state/database
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  // Demo notifications if none provided
  const demoNotifications = [
    {
      id: 1,
      title: 'System Update',
      message: 'A new system update is available.',
      time: '5 minutes ago',
      type: 'system',
      read: false
    },
    {
      id: 2,
      title: 'New User',
      message: 'John Doe has joined the platform.',
      time: '2 hours ago',
      type: 'user',
      read: false
    },
    {
      id: 3,
      title: 'Task Completed',
      message: 'Database migration task completed successfully.',
      time: '1 day ago',
      type: 'task',
      read: true
    }
  ];

  const displayNotifications = notifications.length > 0 ? notifications : demoNotifications;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          color="inherit"
          size="small"
        >
          <Badge badgeContent={unreadCount} color="error">
            <FiBell size={18} />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            mt: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle1" fontWeight="medium">Notifications</Typography>
          
          {unreadCount > 0 && (
            <Button
              variant="text"
              size="small"
              endIcon={<FiCheck />}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        {displayNotifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {displayNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      px: 2,
                      py: 1.5,
                      bgcolor: notification.read 
                        ? 'transparent' 
                        : theme === 'dark' 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(59, 130, 246, 0.05)',
                      borderLeft: notification.read ? 0 : 4,
                      borderLeftColor: 'primary.main',
                      '&:hover': {
                        bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: notification.type === 'system' 
                            ? 'info.main' 
                            : notification.type === 'user'
                              ? 'success.main'
                              : 'warning.main'
                        }}
                      >
                        {notification.type === 'system' && <FiInfo />}
                        {notification.type === 'user' && <FiMessageSquare />}
                        {notification.type === 'task' && <FiAlertCircle />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {notification.time}
                          </Typography>
                        </>
                      }
                    />
                    <IconButton size="small" edge="end" aria-label="dismiss">
                      <FiX size={16} />
                    </IconButton>
                  </ListItem>
                </motion.div>
                {index < displayNotifications.length - 1 && (
                  <Divider component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <FiBell size={40} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <Typography variant="body2" color="text.secondary">
              No notifications at the moment
            </Typography>
          </Box>
        )}
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Button 
            variant="text" 
            size="small"
            fullWidth
            onClick={handleClose}
          >
            View All Notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;