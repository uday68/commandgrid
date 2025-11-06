import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FiX, FiMaximize2, FiMinimize2, FiMove, FiSend, FiActivity, FiRefreshCw } from 'react-icons/fi';
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from '../assets/logo.png';

// Backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AIChatAssistant = ({ 
  isOpen = true, 
  onClose, 
  initialPosition = { x: window.innerWidth / 2 - 300, y: 100 },
  theme = 'light' 
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dragging and resizing states
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [prevSize, setPrevSize] = useState(null);
  const [prevPosition, setPrevPosition] = useState(null);
    // Refs
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  
  // Constants
  const MIN_WIDTH = 400;
  const MIN_HEIGHT = 300;
  const MAX_WIDTH = window.innerWidth - 40;
  const MAX_HEIGHT = window.innerHeight - 40;
  // Load chat history when component mounts
  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('aiAssistantSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setIsMaximized(settings.isMaximized || false);
        setPosition(settings.position || initialPosition);
        setSize(settings.size || { width: 600, height: 400 });
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('aiAssistantSettings', JSON.stringify({
      isMaximized,
      position,
      size
    }));
  }, [isMaximized, position, size]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      } else if (e.key === 'm' && e.altKey) {
        toggleMaximize();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`${API_BASE_URL}/api/chat-proxy/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      content: userMessage,
      is_bot: false,
      timestamp: new Date().toISOString(),
      conversation_id: 'current'
    }]);
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Send message using proxy endpoint in Node.js backend
      const response = await axios.post(
        `${API_BASE_URL}/api/chat-proxy/message`, 
        { message: userMessage },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Add AI response to chat
      if (response.data) {
        setMessages(prev => [...prev, {
          content: response.data.message || 'I received your message.',
          is_bot: true,
          timestamp: new Date().toISOString(),
          conversation_id: 'current',
          follow_up_questions: response.data.follow_up_questions
        }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        is_bot: true,
        error: true,
        timestamp: new Date().toISOString(),
        conversation_id: 'current'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpQuestion = (question) => {
    setInput(question);
  };
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  // Drag and resize handlers
  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setSize(prevSize || { width: 600, height: 400 });
      setPosition(prevPosition || initialPosition);
    } else {
      setPrevSize(size);
      setPrevPosition(position);
      setIsMaximized(true);
      setSize({ width: MAX_WIDTH, height: MAX_HEIGHT });
      setPosition({ x: 20, y: 20 });
    }
  };
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag') || isMaximized) return;
    setIsDragging(true);
    
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      
      // Keep within window bounds with improved calculations
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(newY, window.innerHeight - size.height))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(MIN_WIDTH, Math.min(e.clientX - position.x, MAX_WIDTH));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(e.clientY - position.y, MAX_HEIGHT));
      setSize({ width: newWidth, height: newHeight });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: 1000
      }}
      className={`rounded-lg shadow-2xl border transition-all duration-300 flex flex-col ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Draggable Header */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className={`px-4 py-3 flex justify-between items-center border-b select-none rounded-t-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-600 border-gray-200'
        }`}
        style={{ cursor: isMaximized ? 'default' : 'grab' }}
      >
        <div className="flex items-center space-x-2">
          <FiMove className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-white'}`} />
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
            AI Assistant
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMaximize}
            className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition no-drag ${
              theme === 'dark' ? 'text-gray-300' : 'text-white'
            }`}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition no-drag ${
                theme === 'dark' ? 'text-gray-300' : 'text-white'
              }`}
              title="Close"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>
      
      {/* Messages Container */}
      <div className={`flex-1 p-4 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        {loading && messages.length === 0 && (
          <div className="flex justify-center my-4">
            <div className={`animate-pulse ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading conversation...
            </div>
          </div>
        )}
        
        {error && messages.length === 0 && (
          <div className={`p-3 rounded-md ${
            theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}
          {messages.map((msg, index) => (
          <div 
            key={index}
            className={`mb-4 ${msg.is_bot ? 'items-start' : 'items-end'} flex flex-col`}
          >
            <div 
              className={`px-4 py-2 rounded-lg max-w-3/4 ${
                msg.is_bot 
                  ? theme === 'dark' 
                    ? 'bg-gray-800 text-gray-200' 
                    : 'bg-gray-100 text-gray-800'
                  : theme === 'dark'
                    ? 'bg-blue-800 text-white ml-auto'
                    : 'bg-blue-600 text-white ml-auto'
              } ${msg.error ? 
                theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600' 
                : ''}`}
            >
              {msg.is_bot ? (
                <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none text-sm`}>
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </Markdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            
            {/* Follow-up suggestions */}
            {msg.is_bot && msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.follow_up_questions.map((question, qIndex) => (
                  <button
                    key={qIndex}
                    onClick={() => handleFollowUpQuestion(question)}
                    className={`text-xs px-2 py-1 rounded transition no-drag ${
                      theme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            
            <span className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      {/* Input Section */}
      <div className={`border-t p-4 relative ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <form onSubmit={sendMessage} className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className={`flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 transition no-drag ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
            }`}
            disabled={loading}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-r-lg transition disabled:opacity-50 no-drag ${
              theme === 'dark'
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <span className="inline-block animate-spin">↻</span>
            ) : (
              <FiSend />
            )}
          </button>
        </form>
        
        {/* Resize Handle */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`}
            title="Resize"
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-current opacity-50" />
          </div>
        )}
      </div>
      
      {/* Status Bar with keyboard shortcuts */}
      <div className={`px-4 py-2 text-xs border-t ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700 text-gray-400' 
          : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}>
        <div className="flex justify-between items-center">
          <span>Drag header to move • Drag corner to resize</span>
          <div className="flex items-center space-x-2">
            <kbd className={`px-1 py-0.5 rounded text-xs ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}>Alt+M</kbd>
            <span>maximize</span>
            {onClose && (
              <>
                <kbd className={`px-1 py-0.5 rounded text-xs ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>Esc</kbd>
                <span>close</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatAssistant;
