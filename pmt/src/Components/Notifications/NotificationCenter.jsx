import React, { useState, useEffect } from 'react';
import { 
  Badge, IconButton, Popover, List, ListItem, ListItemText, 
  ListItemAvatar, Avatar, Typography, Box, Button, Divider,
  Tooltip, CircularProgress
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDistance } from 'date-fns';
import useAuth from '../../hooks/useAuth';
import axios from 'axios';

const NotificationCenter = ({ count = 0, theme = 'light' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(count);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real application, replace with actual API endpoint
      // const response = await axios.get('/api/notifications');
      // setNotifications(response.data);
      // setUnreadCount(response.data.filter(n => !n.read).length);
      
      // Static fallback data in case of API failure
      const staticNotifications = [
        {
          id: '1',
          title: 'New Task Assignment',
          message: 'You have been assigned a new task "Complete API Documentation"',
          time: new Date(Date.now() - 1000 * 60 * 10),
          type: 'task',
          read: false,
          link: '/tasks/123'
        },
        {
          id: '2',
          title: 'Meeting Reminder',
          message: 'Weekly team meeting starts in 15 minutes',
          time: new Date(Date.now() - 1000 * 60 * 30),
          type: 'meeting',
          read: false,
          link: '/meetings/456'
        },
        {
          id: '3',
          title: 'Project Status Update',
          message: 'Website Redesign project is now 75% complete',
          time: new Date(Date.now() - 1000 * 60 * 60 * 2),
          type: 'project',
          read: true,
          link: '/projects/789'
        },
        {
          id: '4',
          title: 'Comment on Task',
          message: 'John commented on task "Fix login issue"',
          time: new Date(Date.now() - 1000 * 60 * 60 * 5),
          type: 'comment',
          read: true,
          link: '/tasks/101'
        },
        {
          id: '5',
          title: 'System Update',
          message: 'The system will undergo maintenance tonight at 2:00 AM',
          time: new Date(Date.now() - 1000 * 60 * 60 * 24),
          type: 'system',
          read: true,
          link: null
        }
      ];
      
      // For demo, simulate API response
      setTimeout(() => {
        setNotifications(staticNotifications);
        setUnreadCount(staticNotifications.filter(n => !n.read).length);
        setLoading(false);
      }, 800);
      
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(t('notifications.fetchError'));
      
      // Use static data as fallback in case of error
      const fallbackNotifications = [
        {
          id: 'fallback1',
          title: 'Connection Error',
          message: 'Could not connect to notification service. Using offline data.',
          time: new Date(),
          type: 'system',
          read: false,
          link: null
        },
        // Add some basic fallback notifications
        {
          id: 'fallback2',
          title: 'Fallback Notification',
          message: 'This is a fallback notification while the system is offline',
          time: new Date(Date.now() - 1000 * 60 * 30),
          type: 'system',
          read: false,
          link: null
        }
      ];
      
      setNotifications(fallbackNotifications);
      setUnreadCount(fallbackNotifications.filter(n => !n.read).length);
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // In real app, call API to mark all as read
      // await axios.put('/api/notifications/mark-all-read');
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };
  
  const handleMarkAsRead = async (id) => {
    try {
      // In real app, call API to mark as read
      // await axios.put(`/api/notifications/${id}/mark-read`);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };
  
  const handleDeleteNotification = async (id) => {
    try {
      // In real app, call API to delete notification
      // await axios.delete(`/api/notifications/${id}`);
      
      const wasUnread = notifications.find(n => n.id === id)?.read === false;
      
      setNotifications(prev => 
        prev.filter(n => n.id !== id)
      );
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };
  
  const handleClickNotification = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate to the link if available
    if (notification.link) {
      window.location.href = notification.link;
    }
    
    handleClose();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task': return <TaskIcon />;
      case 'meeting': return <MeetingIcon />;
      case 'project': return <ProjectIcon />;
      case 'comment': return <CommentIcon />;
      case 'system': return <SystemIcon />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'success': return <CheckCircleIcon color="success" />;
      default: return <InfoIcon color="primary" />;
    }
  };

  return (
    <>
      <Tooltip title={t('notifications.title')}>
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          color="inherit"
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
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
            width: 360,
            maxHeight: 480,
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
          alignItems: 'center',
          bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {t('notifications.title')}
            {unreadCount > 0 && (
              <Typography 
                component="span"
                sx={{ 
                  ml: 1, 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: 10, 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: 'error.main',
                  color: 'white'
                }}
              >
                {unreadCount}
              </Typography>
            )}
          </Typography>
          
          {unreadCount > 0 && (
            <Button
              variant="text"
              size="small"
              endIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ErrorIcon color="error" sx={{ fontSize: 40, mb: 2 }} />
            <Typography color="error">{error}</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={fetchNotifications}
            >
              {t('common.retry')}
            </Button>
          </Box>
        ) : notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
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
                    onClick={() => handleClickNotification(notification)}
                    secondaryAction={
                      <Box>
                        {!notification.read && (
                          <Tooltip title={t('notifications.markRead')}>
                            <IconButton 
                              edge="end" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              size="small"
                            >
                              <DoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t('common.delete')}>
                          <IconButton 
                            edge="end" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            size="small"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: getNotificationColor(notification.type),
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'inline', wordBreak: 'break-word' }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {formatDistance(
                              new Date(notification.time),
                              new Date(),
                              { addSuffix: true }
                            )}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider component="li" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
            <Typography variant="body1" color="text.secondary" mt={2}>
              {t('notifications.empty')}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Button 
            variant="text" 
            fullWidth
            onClick={() => {
              handleClose();
              window.location.href = '/notifications';
            }}
          >
            {t('notifications.viewAll')}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

// Helper components for icons
const TaskIcon = () => <span role="img" aria-label="task">📝</span>;
const MeetingIcon = () => <span role="img" aria-label="meeting">📅</span>;
const ProjectIcon = () => <span role="img" aria-label="project">📊</span>;
const CommentIcon = () => <span role="img" aria-label="comment">💬</span>;
const SystemIcon = () => <span role="img" aria-label="system">⚙️</span>;

// Helper function to get color based on notification type
const getNotificationColor = (type) => {
  switch (type) {
    case 'task': return '#4f46e5'; // indigo
    case 'meeting': return '#0891b2'; // cyan
    case 'project': return '#7c3aed'; // violet
    case 'comment': return '#2563eb'; // blue
    case 'system': return '#475569'; // slate
    case 'warning': return '#f59e0b'; // amber
    case 'error': return '#ef4444'; // red
    case 'success': return '#22c55e'; // green
    default: return '#3b82f6'; // blue
  }
};

export default NotificationCenter;
