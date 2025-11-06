import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Stack, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Avatar, 
  ListItemText, 
  TextField, 
  IconButton, 
  Typography,
  Divider,
  Chip,
  Menu,
  MenuItem,
  ButtonGroup,
  Tooltip,
  Badge,
  CircularProgress
} from '@mui/material';
import { 
  Send, 
  InsertDriveFile, 
  Notifications as NotificationsIcon,
  MoreVert,
  Schedule,
  AddReaction,
  AttachFile,
  Mic,
  Close
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { useError } from '../../hooks/useError';
import connectionMonitor from '../../utils/connectionMonitor';
import { nexaflowStorage } from './supabaseClient';
import errorHandler from '../../utils/errorHandler';

const ChatPanel = ({ 
  roomId, 
  currentUser,
  onSendMessage,
  onSendNotification,
  onSendReminder 
}) => {
  const { t } = useTranslation(['chat', 'common']);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [predefinedAnchorEl, setPredefinedAnchorEl] = useState(null);
  const [reminderAnchorEl, setReminderAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const messagesEndRef = useRef();

  // Predefined messages
  const predefinedMessages = [
    "Can we discuss this in the next meeting?",
    "I'll follow up on this task",
    "Please review the latest changes",
    "Any updates on this?",
    "Great work on this!",
    "Let me check and get back to you",
    "We need to prioritize this",
    "Can you share more details?"
  ];

  // Fetch messages and setup real-time subscription
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(name, profile_picture, user_id)
        `)
        .eq('room', roomId)
        .order('created_at', { ascending: true });

      if (!error) setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room=eq.${roomId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        if (document.visibilityState !== 'visible') {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
        setUnreadNotifications(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    const notificationChannel = supabase
      .channel(`notifications:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `room_id=eq.${roomId}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadNotifications(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [roomId]);

  // Typing indicator
  useEffect(() => {
    let typingTimeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setUnreadCount(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(typingTimeout);
    };
  }, []);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // Send typing status to server
      supabase
        .from('typing_indicators')
        .upsert({
          room_id: roomId,
          user_id: currentUser.user_id,
          is_typing: true
        });
    }

    const timer = setTimeout(() => {
      setIsTyping(false);
      supabase
        .from('typing_indicators')
        .upsert({
          room_id: roomId,
          user_id: currentUser.user_id,
          is_typing: false
        });
    }, 3000);

    return () => clearTimeout(timer);
  }, [isTyping, roomId, currentUser.user_id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      room: roomId,
      message: newMessage,
      sender_id: currentUser.user_id,
      type: 'text'
    };

    await onSendMessage(messageData);
    setNewMessage('');
    setIsTyping(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const { t } = useTranslation('errors');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;

      // Check if we're online
      const isOnline = connectionMonitor.getStatus();
      
      if (isOnline) {
        // Online flow - upload directly
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const fileUrl = supabase.storage
          .from('chat-files')
          .getPublicUrl(fileName).data.publicUrl;

        await onSendMessage({
          room: roomId,
          sender_id: currentUser.user_id,
          type: 'file',
          file_url: fileName,
          file_name: file.name,
          message: `Shared a file: ${file.name}`
        });
      } else {
        // Offline flow - store locally and queue for upload
        // Save file to local storage as base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileData = event.target.result;
          
          // Store in Nexaflow storage
          await nexaflowStorage.saveData(`chat_file_${fileName}`, {
            data: fileData,
            name: file.name,
            type: file.type,
            size: file.size
          }, 'files');
          
          // Add to upload queue
          const uploadQueue = await nexaflowStorage.getData('upload_queue') || { data: [] };
          uploadQueue.data.push({
            fileName,
            originalName: file.name,
            timestamp: Date.now(),
            room: roomId,
            sender_id: currentUser.user_id
          });
          await nexaflowStorage.saveData('upload_queue', uploadQueue.data);
          
          // Show offline message with local data
          await onSendMessage({
            room: roomId,
            sender_id: currentUser.user_id,
            type: 'file',
            file_url: `local://${fileName}`,
            file_name: file.name,
            message: `Shared a file: ${file.name} (pending upload)`,
            offline: true
          });
        };
        
        reader.onerror = (error) => {
          throw new Error('Failed to read file');
        };
        
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      errorHandler.showError(error, 'files.uploadFailed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendNotification = async (message, recipientId = null) => {
    try {
      // Check network connection
      const isOnline = connectionMonitor.getStatus();
      
      if (isOnline) {
        // Send notification directly if online
        await onSendNotification({
          room_id: roomId,
          message,
          recipient_id: recipientId,
          sender_id: currentUser.user_id
        });
      } else {
        // Queue notification for when we're back online
        const offlineNotifications = await nexaflowStorage.getData('offline_notifications') || { data: [] };
        offlineNotifications.data.push({
          room_id: roomId,
          message,
          recipient_id: recipientId,
          sender_id: currentUser.user_id,
          timestamp: Date.now()
        });
        await nexaflowStorage.saveData('offline_notifications', offlineNotifications.data);
        
        // Show local feedback that it's queued
        toast.info(t('connection.offlineQueuedNotification'));
      }
      
      setNotificationAnchorEl(null);
    } catch (error) {
      errorHandler.handleError(error, 'ChatPanel.handleSendNotification');
      setNotificationAnchorEl(null);
    }
  };

  const handleSendReminder = async (userId, message, delayMinutes) => {
    await onSendReminder({
      room_id: roomId,
      user_id: userId,
      message,
      delay_minutes: delayMinutes,
      created_by: currentUser.user_id
    });
    setReminderAnchorEl(null);
  };

  const markNotificationsAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.notification_id);

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('notification_id', unreadIds);

      setUnreadNotifications(0);
    }
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'file':
        return (
          <Stack sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsertDriveFile color="primary" />
            <a 
              href={supabase.storage.from('chat-files').getPublicUrl(message.file_url).data.publicUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {message.file_name}
            </a>
          </Stack>
        );
      case 'system':
        return (
          <Stack sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <NotificationsIcon fontSize="small" />
            <Typography variant="body2">{message.message}</Typography>
          </Stack>
        );
      case 'notification':
        return (
          <Stack sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            color: 'warning.main',
            bgcolor: 'warning.light',
            p: 1,
            borderRadius: 1
          }}>
            <NotificationsIcon fontSize="small" />
            <Typography variant="body2">{message.message}</Typography>
          </Stack>
        );
      default:
        return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.message}</ReactMarkdown>;
    }
  };

  return (
    <Stack sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper'
    }}>
      {/* Header with notifications */}
      <Stack sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">Team Chat</Typography>
        <Stack>
          <Tooltip title="Notifications">
            <IconButton
              onClick={(e) => {
                setNotificationAnchorEl(e.currentTarget);
                markNotificationsAsRead();
              }}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationAnchorEl}
            open={Boolean(notificationAnchorEl)}
            onClose={() => setNotificationAnchorEl(null)}
            PaperProps={{
              style: {
                maxHeight: 400,
                width: 300,
              },
            }}
          >
            {notifications.length === 0 ? (
              <MenuItem disabled>No notifications</MenuItem>
            ) : (
              notifications.map(notification => (
                <MenuItem key={notification.notification_id}>
                  <ListItemText
                    primary={notification.message}
                    secondary={formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  />
                </MenuItem>
              ))
            )}
          </Menu>
        </Stack>
      </Stack>

      {/* Messages area */}
      <Stack sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2,
        bgcolor: 'background.default'
      }}>
        <List>
          {messages.map((message, index) => (
            <div key={message.message_id || index}>
              <ListItem 
                alignItems="flex-start"
                sx={{
                  flexDirection: message.sender_id === currentUser.user_id ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  px: 1
                }}
              >
                <ListItemAvatar sx={{
                  minWidth: 40,
                  order: message.sender_id === currentUser.user_id ? 1 : 0
                }}>
                  <Avatar 
                    src={message.sender?.profile_picture}
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: message.sender_id === currentUser.user_id ? 'primary.main' : undefined
                    }}
                  >
                    {message.sender?.name?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack sx={{ 
                      display: 'flex',
                      flexDirection: message.sender_id === currentUser.user_id ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 'medium',
                          color: message.sender_id === currentUser.user_id ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {message.sender_id === currentUser.user_id ? t('you', { ns: 'chatRoom' }) : message.sender?.name || t('unknown', { ns: 'common' })}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Stack
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: message.sender_id === currentUser.user_id ? 'primary.light' : 'background.paper',
                        wordBreak: 'break-word',
                        mt: 0.5,
                        display: 'inline-block',
                        maxWidth: '80%',
                        textAlign: message.sender_id === currentUser.user_id ? 'right' : 'left'
                      }}
                    >
                      {renderMessageContent(message)}
                    </Stack>
                  }
                  sx={{
                    ml: message.sender_id === currentUser.user_id ? 0 : 1,
                    mr: message.sender_id === currentUser.user_id ? 1 : 0,
                    '& .MuiListItemText-secondary': {
                      display: 'flex',
                      flexDirection: message.sender_id === currentUser.user_id ? 'row-reverse' : 'row'
                    }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </ListItem>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => {
                  navigator.clipboard.writeText(message.message);
                  setAnchorEl(null);
                }}>
                  Copy Text
                </MenuItem>
                <MenuItem onClick={() => {
                  handleSendNotification(`Please review this message: "${message.message.substring(0, 50)}..."`);
                  setAnchorEl(null);
                }}>
                  Send as Notification
                </MenuItem>
                <MenuItem onClick={() => {
                  setReminderAnchorEl(anchorEl);
                  setAnchorEl(null);
                }}>
                  Set Reminder
                </MenuItem>
              </Menu>
              <Menu
                anchorEl={reminderAnchorEl}
                open={Boolean(reminderAnchorEl)}
                onClose={() => setReminderAnchorEl(null)}
              >
                <MenuItem onClick={() => {
                  handleSendReminder(currentUser.user_id, `Reminder: ${message.message.substring(0, 50)}`, 60);
                }}>
                  In 1 hour
                </MenuItem>
                <MenuItem onClick={() => {
                  handleSendReminder(currentUser.user_id, `Reminder: ${message.message.substring(0, 50)}`, 1440);
                }}>
                  In 1 day
                </MenuItem>
                <MenuItem onClick={() => {
                  handleSendReminder(currentUser.user_id, `Reminder: ${message.message.substring(0, 50)}`, 10080);
                }}>
                  In 1 week
                </MenuItem>
              </Menu>
              {index < messages.length - 1 && (
                <Divider variant="inset" component="li" sx={{ 
                  ml: message.sender_id === currentUser.user_id ? 0 : '72px',
                  mr: message.sender_id === currentUser.user_id ? '72px' : 0
                }} />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Stack>

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <Stack sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Stack sx={{ 
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            px: 2,
            py: 1,
            borderRadius: 4
          }}>
            <CircularProgress size={12} sx={{ mr: 1 }} />
            <Typography variant="caption" color="textSecondary">
              {typingUsers.length > 1 ? 
                t('severalTyping', { ns: 'chatRoom' }) : 
                t('typing', { user: typingUsers[0]?.name, ns: 'chatRoom' })}
            </Typography>
          </Stack>
        </Stack>
      )}

      {/* Input area */}
      <Stack sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Stack sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup size="small" sx={{ mr: 1 }}>
            <Tooltip title="Send notification">
              <IconButton onClick={(e) => setNotificationAnchorEl(e.currentTarget)}>
                <NotificationsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send reminder">
              <IconButton onClick={(e) => setReminderAnchorEl(e.currentTarget)}>
                <Schedule fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Predefined messages">
              <IconButton onClick={(e) => setPredefinedAnchorEl(e.currentTarget)}>
                <AddReaction fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Attach file">
              <IconButton component="label" disabled={uploadingFile}>
                <input 
                  type="file" 
                  hidden 
                  onChange={handleFileUpload} 
                  disabled={uploadingFile}
                />
                {uploadingFile ? <CircularProgress size={20} /> : <AttachFile fontSize="small" />}
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                bgcolor: 'background.default'
              }
            }}
          />

          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{ ml: 1 }}
          >
            <Send />
          </IconButton>
        </Stack>
      </Stack>

      {/* Predefined messages menu */}
      <Menu
        anchorEl={predefinedAnchorEl}
        open={Boolean(predefinedAnchorEl)}
        onClose={() => setPredefinedAnchorEl(null)}
      >
        {predefinedMessages.map((msg, index) => (
          <MenuItem 
            key={index} 
            onClick={() => {
              setNewMessage(msg);
              setPredefinedAnchorEl(null);
            }}
          >
            {msg}
          </MenuItem>
        ))}
      </Menu>

      {/* Notification menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={() => setNotificationAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          handleSendNotification("Please check the latest messages in chat");
          setNotificationAnchorEl(null);
        }}>
          General Notification
        </MenuItem>
        <MenuItem onClick={() => {
          handleSendNotification("Urgent: Need your immediate attention");
          setNotificationAnchorEl(null);
        }}>
          Urgent Notification
        </MenuItem>
        <MenuItem onClick={() => {
          handleSendNotification("Reminder: Please respond to the chat");
          setNotificationAnchorEl(null);
        }}>
          Response Reminder
        </MenuItem>
      </Menu>

      {/* Unread messages badge */}
      {unreadCount > 0 && (
        <Stack sx={{
          position: 'absolute',
          bottom: 80,
          right: 20,
          zIndex: 1
        }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Close />}
            onClick={() => setUnreadCount(0)}
            sx={{
              borderRadius: 4,
              textTransform: 'none',
              boxShadow: 3
            }}
          >
            <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1 }}>
              <Typography variant="body2">
                {unreadCount} new message{unreadCount > 1 ? 's' : ''}
              </Typography>
            </Badge>
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

export default ChatPanel;