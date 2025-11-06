import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import apiService from '../utils/api';
import socketService from '../utils/socketService';

const ChatRoom = ({ 
  roomId: propRoomId, 
  isModal = false, 
  onClose, 
  onNewMessage,
  className = ""
}) => {
  const { roomId: paramRoomId } = useParams();
  const roomId = propRoomId || paramRoomId || 'default';
  const { t } = (() => ({ t: (key) => key.split('.').pop() }))(); // Simple fallback
  
  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageMenu, setMessageMenu] = useState(null); // Track which message menu is open
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // User data
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = userData.user_id;
  const userName = userData.name || 'Anonymous';
  const userAvatar = userData.profile_picture || '';

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.chat.getMessages(roomId);
      
      if (response.data?.success) {
        setMessages(response.data.messages || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Could not load messages. Please try again later.');
      if (error.response?.status !== 403) {
        toast.error('Failed to load chat messages');
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Event handlers
  const handleMessageHistory = useCallback((messages) => {
    setMessages(messages);
    setLoading(false);
  }, []);
  
  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    if (!document.hasFocus() || isMinimized || isScrolledUp) {
      setUnreadCount(prev => prev + 1);
      setHasNewMessages(true);
    }
    if (onNewMessage) onNewMessage(message);
  }, [onNewMessage, isMinimized, isScrolledUp]);
  
  const handleActiveUsers = useCallback((users) => {
    setActiveUsers(users);
  }, []);
  
  const handleTyping = useCallback((users) => {
    setTypingUsers(users);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers([]);
    }, 3000);
  }, []);

  // Initialize socket connection and fetch messages
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Connect socket
        await socketService.connect();
        setConnectionStatus('connected');
        
        // Join chat room
        socketService.joinRoom({ 
          roomId, 
          userId,
          userName
        });
        
        // Register event handlers
        socketService.on('messageHistory', handleMessageHistory);
        socketService.on('newMessage', handleNewMessage);
        socketService.on('activeUsers', handleActiveUsers);
        socketService.on('typing', handleTyping);
        socketService.on('connect', () => setConnectionStatus('connected'));
        socketService.on('disconnect', () => setConnectionStatus('disconnected'));
        
        // Fetch initial messages
        await fetchMessages();
        
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setError('Failed to connect to chat. Please refresh and try again.');
        setConnectionStatus('error');
      }
    };

    initializeChat();
    
    // Cleanup on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      socketService.leaveRoom(roomId);
      socketService.off('messageHistory', handleMessageHistory);
      socketService.off('newMessage', handleNewMessage);
      socketService.off('activeUsers', handleActiveUsers);
      socketService.off('typing', handleTyping);
    };
  }, [roomId, userId, userName, fetchMessages, handleMessageHistory, handleNewMessage, handleActiveUsers, handleTyping]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom();
    }
  }, [messages, isScrolledUp]);

  // Handle scroll events
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - (scrollTop + clientHeight) < 50;
      
      setIsScrolledUp(!atBottom);
      if (atBottom) {
        setHasNewMessages(false);
        setUnreadCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset unread count when focused
  useEffect(() => {
    const handleFocus = () => {
      if (!isMinimized) {
        setUnreadCount(0);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isMinimized]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isModal && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isModal, isMinimized]);
  
  // Send a new message
  const sendMessage = useCallback((e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const message = {
      room: roomId,
      message: newMessage.trim(),
      sender_id: userId,
      sender_name: userName,
      timestamp: new Date().toISOString()
    };
    
    socketService.sendMessage(message);
    setNewMessage('');
    
    // Focus back to input
    inputRef.current?.focus();
  }, [newMessage, roomId, userId, userName]);
  
  // Handle typing indicator
  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    socketService.emitTyping();
  }, []);
  
  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }, [sendMessage]);
  
  // Scroll to the bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  // Format timestamp
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch (error) {
      return '';
    }
  }, []);

  // Format date separator
  const formatDateSeparator = useCallback((timestamp) => {
    if (!timestamp) return '';
    try {
      const messageDate = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return format(messageDate, 'MMM dd, yyyy');
      }
    } catch (error) {
      return '';
    }
  }, []);

  // Check if we need a date separator
  const shouldShowDateSeparator = useCallback((currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    return currentDate !== prevDate;
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    setError(null);
    setConnectionStatus('connecting');
    fetchMessages();
  }, [fetchMessages]);

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
    if (isMinimized) {
      setUnreadCount(0);
    }
  }, [isMinimized]);

  // Toggle message menu
  const toggleMessageMenu = useCallback((messageId) => {
    setMessageMenu(prev => prev === messageId ? null : messageId);
  }, []);

  // Handle click outside message menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (messageMenu && !e.target.closest('.message-menu-container')) {
        setMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [messageMenu]);

  // Render connection status
  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { color: 'text-yellow-500', text: 'Connecting...', icon: '🔄' },
      connected: { color: 'text-green-500', text: 'Connected', icon: '🟢' },
      disconnected: { color: 'text-red-500', text: 'Disconnected', icon: '🔴' },
      error: { color: 'text-red-500', text: 'Connection Error', icon: '⚠️' }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.disconnected;
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </div>
    );
  };

  // Render user avatar
  const renderAvatar = useCallback((user, size = 'w-8 h-8') => (
    <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium flex-shrink-0`}>
      {userAvatar ? (
        <img src={userAvatar} alt={user?.name} className={`${size} rounded-full object-cover`} />
      ) : (
        <span className="text-sm">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
      )}
    </div>
  ), [userAvatar]);

  // Render message
  const renderMessage = useCallback((msg, index) => {
    const isOwn = msg.sender_id === userId;
    const prevMsg = messages[index - 1];
    const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);
    const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
    
    return (
      <React.Fragment key={msg.message_id || index}>
        {showDateSeparator && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDateSeparator(msg.created_at)}
            </div>
          </div>
        )}
        
        <div className={`flex items-end space-x-2 mb-3 group ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {showAvatar ? renderAvatar({ name: msg.sender_name }, 'w-8 h-8') : <div className="w-8" />}
          
          <div className={`max-w-xs lg:max-w-md relative ${isOwn ? 'ml-auto' : ''}`}>
            {!isOwn && showAvatar && (
              <div className="text-xs text-gray-500 mb-1 px-2">
                {msg.sender_name || 'Unknown User'}
              </div>
            )}
            
            <div className={`relative px-4 py-2 rounded-2xl transition-all duration-200 ${
              isOwn 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {msg.message || msg.content}
              </p>
              
              <div className={`text-xs mt-1 flex items-center justify-end space-x-2 ${
                isOwn ? 'text-blue-100' : 'text-gray-400'
              }`}>
                <span>{formatTime(msg.created_at)}</span>
                {isOwn && (
                  <button 
                    onClick={() => toggleMessageMenu(msg.message_id || index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Message menu */}
            {messageMenu === (msg.message_id || index) && (
              <div className="message-menu-container absolute top-0 right-0 mt-8 bg-white shadow-lg rounded-md z-10 overflow-hidden border border-gray-200">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    // Handle edit
                    setMessageMenu(null);
                  }}
                >
                  Edit
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    // Handle delete
                    setMessageMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }, [userId, messages, shouldShowDateSeparator, formatDateSeparator, formatTime, renderAvatar, messageMenu, toggleMessageMenu]);

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingText = typingUsers.length > 2 
      ? 'Several people are typing...'
      : `${typingUsers.map(u => u.name).join(' and ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
    
    return (
      <div className="flex items-center space-x-2 px-4 py-2">
        <div className="flex space-x-1">
          {typingUsers.slice(0, 3).map((user, index) => (
            <div key={index} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <span className="text-xs text-gray-600">{(user.name || 'U').charAt(0).toUpperCase()}</span>
            </div>
          ))}
          {typingUsers.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-600">+{typingUsers.length - 3}</span>
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500">{typingText}</span>
      </div>
    );
  };

  // New messages indicator
  const renderNewMessagesIndicator = () => {
    if (!hasNewMessages || isScrolledUp === false) return null;
    
    return (
      <div 
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-600 transition-colors flex items-center space-x-2 z-10"
        onClick={() => {
          scrollToBottom();
          setHasNewMessages(false);
          setUnreadCount(0);
        }}
      >
        <span className="text-sm font-medium">New messages</span>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`${isModal ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' : 'flex items-center justify-center h-64'}`}>
        <div className={`${isModal ? 'bg-white rounded-xl p-8 shadow-2xl' : ''} flex flex-col items-center space-y-4`}>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-purple-500 animate-spin animation-delay-200"></div>
          </div>
          <span className="text-gray-700 font-medium">Loading chat...</span>
          <p className="text-gray-500 text-sm">Connecting to the conversation</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className={`${isModal ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' : 'bg-red-50 border border-red-200 rounded-lg p-4'}`}>
        <div className={`${isModal ? 'bg-white rounded-xl p-8 shadow-2xl max-w-md mx-4' : ''} text-center`}>
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Chat Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex space-x-2 justify-center">
            <button
              onClick={retryConnection}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  const chatContent = (
    <div className={`flex flex-col h-full bg-white relative ${isModal ? 'rounded-xl shadow-2xl overflow-hidden' : 'border border-gray-200 rounded-lg'} ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {renderAvatar({ name: userName }, 'w-10 h-10')}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
          </div>
          <div>
            <h2 className="font-bold text-lg">
              {roomId === 'default' ? 'General Chat' : `Room ${roomId}`}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-blue-100">
              <span>{activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} online</span>
              <span>•</span>
              {renderConnectionStatus()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          
          <button
            onClick={() => setShowUserList(!showUserList)}
            className={`p-2 rounded-lg transition-all ${showUserList ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'}`}
            title="Show users"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
          
          {isModal && (
            <>
              <button
                onClick={toggleMinimize}
                className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
                title="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* User list sidebar */}
      {showUserList && (
        <div className="bg-gray-50 border-b p-3 animate-slideDown">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Active Users ({activeUsers.length})</h4>
            <button 
              onClick={() => setShowUserList(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {activeUsers.map((user, index) => (
              <div key={user.id || index} className="flex items-center space-x-3 bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="relative">
                  {renderAvatar(user, 'w-8 h-8')}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white bg-green-400"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {typingUsers.some(u => u.id === user.id) ? 'Typing...' : 'Online'}
                  </p>
                </div>
                <button className="text-blue-500 hover:text-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMinimized && (
        <>
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-gray-50 relative"
            style={{ maxHeight: isModal ? 'calc(90vh - 200px)' : '400px' }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full opacity-20"></div>
                  <div className="absolute inset-4 bg-blue-200 rounded-full opacity-30"></div>
                  <div className="absolute inset-8 bg-blue-300 rounded-full opacity-40 flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-700">No messages yet</h3>
                <p className="text-gray-500 text-center max-w-md px-4">
                  Start the conversation by sending a message below! This is the beginning of something great.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {renderNewMessagesIndicator()}
          </div>
          
          {/* Typing indicator */}
          {renderTypingIndicator()}
          
          {/* Message input */}
          <form onSubmit={sendMessage} className="bg-white border-t p-4 sticky bottom-0">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 max-h-32"
                  rows={1}
                  disabled={loading || connectionStatus !== 'connected'}
                />
                <div className="absolute right-3 bottom-3 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                    title="Add emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || loading || connectionStatus !== 'connected'}
                className={`p-3 rounded-xl transition-all duration-200 shadow-lg ${
                  newMessage.trim() 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl transform hover:scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );

  // Return with or without modal wrapper
  return isModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl h-5/6" style={{ maxHeight: '90vh' }}>
        {chatContent}
      </div>
    </div>
  ) : (
    chatContent
  );
};

export default ChatRoom;