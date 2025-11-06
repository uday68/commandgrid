import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, TextField, IconButton, Typography, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Divider,
  Button, CircularProgress, Tooltip, Chip, Fade
} from '@mui/material';
import { 
  Send as SendIcon,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
  History as HistoryIcon,
  SettingsOutlined as SettingsIcon,
  QueryStats as QueryStatsIcon,
  LightbulbOutlined as LightbulbIcon,
  DynamicFeed as DynamicFeedIcon
} from '@mui/icons-material';
import { Resizable } from 're-resizable';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';

const AIAssistant = ({ 
  isOpen = false, 
  onClose, 
  initialMessage,
  theme = 'light',
  userData = {}
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 520 });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [position, setPosition] = useState({ x: 'auto', y: 'auto' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const suggestions = [
    "Help me create a project plan",
    "Analyze my team performance",
    "Summarize today's meetings",
    "Generate a report template",
    "How to improve team productivity?"
  ];

  useEffect(() => {
    if (initialMessage) {
      setMessages([{
        id: '0',
        sender: 'ai',
        text: initialMessage,
        timestamp: new Date()
      }]);
    } else {
      setMessages([{
        id: '0',
        sender: 'ai',
        text: `Hello${userData.name ? ` ${userData.name}` : ''}! How can I assist you today?`,
        timestamp: new Date()
      }]);
    }
  }, [initialMessage, userData.name]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setShowSuggestions(false);
    setIsTyping(true);
    setConnectionError(false);
    
    try {
      // Simulate AI response with a delay
      const aiResponse = await simulateAIResponse(userInput);
      
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error("AI Response Error:", error);
      setIsTyping(false);
      setConnectionError(true);
      
      // Send a fallback message when connection fails
      const fallbackMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "I'm having trouble connecting to my knowledge base right now. Please try again in a moment or contact support if the issue persists.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    }
  };

  const simulateAIResponse = (query) => {
    return new Promise((resolve, reject) => {
      // Chance to simulate a network error (10%)
      if (Math.random() < 0.1) {
        // Simulate connection failure for testing
        setTimeout(() => reject(new Error("Network error")), 500);
        return;
      }
      
      // Simulated AI response logic
      const responses = [
        "I can help you with that! Here's what you need to know...",
        "Great question. Based on my analysis...",
        "I've looked at your team's data and found the following insights...",
        "Here's a step-by-step approach to solve this problem:\n\n1. First, identify the key metrics\n2. Analyze trends over time\n3. Implement suggested actions",
        "Let me generate some recommendations for you:\n\n- Consider restructuring the team workflow\n- Implement daily stand-ups\n- Use our analytics dashboard for better insights"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setTimeout(() => resolve(randomResponse), 500);
    });
  };

  // Show connection error message
  useEffect(() => {
    if (connectionError) {
      // Show an error message that fades out after 5 seconds
      const timer = setTimeout(() => {
        setConnectionError(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
    inputRef.current.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Save current size before expanding
      setSize(prev => ({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      }));
    } else {
      // Restore to default size
      setSize({ width: 360, height: 520 });
    }
  };

  const handleMouseDown = (e) => {
    if (!dragRef.current.contains(e.target)) return;
    
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = position.x;
    const startTop = position.y;
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = startLeft + (e.clientX - startX);
      const newY = startTop + (e.clientY - startY);
      
      // Keep within window bounds
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(newY, window.innerHeight - size.height))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;
  
  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            pl: 2,
            borderRadius: '20px',
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#1e293b',
            cursor: 'pointer',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }
          }}
          onClick={toggleMinimize}
        >
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main',
              width: 32, 
              height: 32 
            }}
          >
            AI
          </Avatar>
          <Typography variant="body2" sx={{ ml: 1, mr: 2, fontWeight: 500 }}>
            {t('ai.minimizedTitle')}
          </Typography>
          <IconButton size="small" color="inherit">
            <MaximizeIcon fontSize="small" />
          </IconButton>
        </Paper>
      </motion.div>
    );
  }

  return (
    <Fade in={isOpen}>
      <Resizable
        size={size}
        onResizeStop={(e, direction, ref, d) => {
          setSize(prev => ({
            width: prev.width + d.width,
            height: prev.height + d.height
          }));
        }}
        enable={!isExpanded && {
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true
        }}
        minWidth={300}
        minHeight={400}
        maxWidth={window.innerWidth - 40}
        maxHeight={window.innerHeight - 40}
        style={{
          position: 'fixed',
          bottom: position.y === 'auto' ? '20px' : 'auto',
          right: position.x === 'auto' ? '20px' : 'auto',
          top: position.y !== 'auto' ? `${position.y}px` : 'auto',
          left: position.x !== 'auto' ? `${position.x}px` : 'auto',
          zIndex: 1000,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '12px',
            bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : 'inherit',
          }}
        >
          {/* Header */}
          <Box
            ref={dragRef}
            onMouseDown={handleMouseDown}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              pl: 2,
              borderBottom: 1,
              borderColor: 'divider',
              cursor: 'move',
              bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main',
                  width: 32, 
                  height: 32,
                  color: 'white'
                }}
              >
                AI
              </Avatar>
              <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 500 }}>
                {t('ai.assistant')}
              </Typography>
              <Chip 
                label="Beta" 
                size="small" 
                color="primary" 
                variant="outlined" 
                sx={{ ml: 1, height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.6rem' } }}
              />
            </Box>
            <Box>
              <IconButton size="small" onClick={toggleMinimize}>
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={toggleExpand}>
                {isExpanded ? <MinimizeIcon fontSize="small" /> : <MaximizeIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" onClick={onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Connection Error Notification */}
          {connectionError && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 60, 
                left: 0, 
                right: 0, 
                p: 1,
                bgcolor: 'error.main', 
                color: 'white',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <Typography variant="body2">
                {t('ai.connectionError')}
              </Typography>
            </Box>
          )}

          {/* Chat container */}
          <Box
            ref={chatContainerRef}
            sx={{
              flexGrow: 1,
              p: 2,
              overflowY: 'auto',
              bgcolor: theme === 'dark' ? '#111827' : '#f9fafb',
            }}
          >
            <List>
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                        mb: 1,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: message.sender === 'user' ? 'secondary.main' : 'primary.main',
                            width: 36,
                            height: 36
                          }}
                        >
                          {message.sender === 'user' ? userData.name?.charAt(0) || 'U' : 'AI'}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <StyledListItemText
                        primary={message.sender === 'user' ? 'You' : 'AI Assistant'}
                        sender={message.sender}
                        secondary={
                          <MarkdownWrapper theme={theme}>
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </MarkdownWrapper>
                        }
                        secondarySx={{
                          mt: 1,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: message.sender === 'user'
                            ? theme === 'dark' ? 'primary.dark' : 'primary.light'
                            : theme === 'dark' ? 'background.paper' : 'grey.100',
                          color: message.sender === 'user' && theme !== 'dark' ? 'white' : 'inherit',
                        }}
                        primarySx={{
                          textAlign: message.sender === 'user' ? 'right' : 'left',
                          color: theme === 'dark' ? 'grey.300' : 'grey.700',
                          fontWeight: 500,
                          fontSize: '0.875rem'
                        }}
                      />
                    </ListItem>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* AI Typing Indicator */}
              {isTyping && (
                <ListItem alignItems="flex-start" sx={{ mb: 1 }}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}
                    >
                      AI
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: theme === 'dark' ? 'background.paper' : 'grey.100',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 0.2 }}
                        style={{ margin: '0 2px' }}
                      >
                        •
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.2, repeatDelay: 0.2 }}
                        style={{ margin: '0 2px' }}
                      >
                        •
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.4, repeatDelay: 0.2 }}
                        style={{ margin: '0 2px' }}
                      >
                        •
                      </motion.div>
                    </Box>
                  </Paper>
                </ListItem>
              )}
              
              {/* Auto-suggestions */}
              {showSuggestions && messages.length < 2 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                    {t('ai.suggestions')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {suggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        label={suggestion}
                        size="small"
                        onClick={() => handleSuggestionClick(suggestion)}
                        clickable
                        sx={{
                          px: 1,
                          borderRadius: '16px',
                          '&:hover': {
                            bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Input area */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'white',
            }}
          >
            <Box sx={{ display: 'flex' }}>
              <TextField
                ref={inputRef}
                fullWidth
                placeholder={t('ai.inputPlaceholder')}
                variant="outlined"
                size="small"
                multiline
                maxRows={4}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '20px',
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={isTyping || !userInput.trim()}
                    >
                      <SendIcon />
                    </IconButton>
                  )
                }}
              />
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 1,
              px: 1,
              fontSize: '0.75rem',
              color: 'text.secondary'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Tooltip title={t('ai.history')}>
                  <IconButton size="small" color="inherit">
                    <HistoryIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('ai.insights')}>
                  <IconButton size="small" color="inherit">
                    <QueryStatsIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('ai.suggestions')}>
                  <IconButton 
                    size="small" 
                    color="inherit"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                  >
                    <LightbulbIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Box>
                <Typography variant="caption">
                  {t('ai.poweredBy')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Resizable>
    </Fade>
  );
};

// Custom styled components
const StyledListItemText = styled(ListItemText)(({ theme, sender, primarySx, secondarySx }) => ({
  margin: 0,
  '& .MuiListItemText-primary': {
    ...primarySx
  },
  '& .MuiListItemText-secondary': {
    ...secondarySx
  }
}));

const MarkdownWrapper = styled('div')(({ theme }) => ({
  '& p': {
    margin: 0,
    marginBottom: theme.spacing(1),
  },
  '& p:last-child': {
    marginBottom: 0,
  },
  '& ul, & ol': {
    paddingLeft: theme.spacing(2),
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  '& code': {
    fontFamily: 'monospace',
    padding: '2px 4px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
  },
  '& pre': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(1),
    borderRadius: 4,
    overflowX: 'auto',
  },
}));

export default AIAssistant;
