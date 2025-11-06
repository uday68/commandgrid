import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { 
  FiX, FiSend, FiMaximize2, FiMinimize2, 
  FiRefreshCw, FiActivity
} from "react-icons/fi";
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from '../../assets/logo.png';
import '../../styles/codeblock.css';
import './EnhancedAIChatAssistant.css';

// Particle system for the magical effect - Enhanced
const Particle = ({ index, isVisible }) => {
  const x = useSpring(0);
  const y = useSpring(0);
  const opacity = useSpring(0);
  const scale = useSpring(0);
  const rotation = useSpring(0);

  useEffect(() => {
    if (isVisible) {
      const angle = (index * 360 / 16) * (Math.PI / 180);
      const radius = 150 + Math.random() * 100;
      const delay = index * 100;
      
      setTimeout(() => {
        x.set(Math.cos(angle) * radius);
        y.set(Math.sin(angle) * radius);
        opacity.set(0.9);
        scale.set(1.2);
        rotation.set(360);
      }, delay);
      
      setTimeout(() => {
        opacity.set(0);
        scale.set(0);
        x.set(Math.cos(angle) * radius * 2);
        y.set(Math.sin(angle) * radius * 2);
      }, 3000 + Math.random() * 2000);
    }
  }, [isVisible, index, x, y, opacity, scale, rotation]);

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-full"
      style={{
        x,
        y,
        opacity,
        scale,
        rotate: rotation,
        background: `conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06ffa5, #ffbe0b, #ff006e)`,
        filter: "blur(1px)",
        boxShadow: "0 0 20px currentColor"
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent)`,
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 0.3, 0.8]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

// Enhanced loading indicator with AI consciousness effect
const AIThinkingIndicator = () => (
  <motion.div 
    className="flex items-center space-x-4 p-6 relative"
    initial={{ opacity: 0, y: 20, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.8 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    {/* Cosmic background */}
    <div className="absolute inset-0 cosmic-background rounded-2xl opacity-30" />
    
    {/* Neural connections */}
    <div className="absolute inset-0 neural-connections rounded-2xl">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="neural-line" />
      ))}
    </div>
    
    {/* AI Avatar with quantum effects */}
    <motion.div 
      className="relative z-10"
      animate={{ 
        rotate: [0, 360],
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        rotate: { duration: 8, repeat: Infinity, ease: "linear" },
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden ai-avatar">
        <img src={logo} alt="AI" className="w-full h-full object-cover" />
        <div className="ai-consciousness" />
      </div>
    </motion.div>
    
    {/* Enhanced thinking dots */}
    <div className="flex items-center space-x-2 z-10">
      <motion.span 
        className="text-sm text-gray-600 dark:text-gray-300 font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        AI is thinking
      </motion.span>
      <div className="typing-dots ml-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="typing-dot"
            style={{
              background: i === 0 ? 'linear-gradient(45deg, #ff006e, #8338ec)' :
                         i === 1 ? 'linear-gradient(45deg, #8338ec, #3a86ff)' :
                                   'linear-gradient(45deg, #3a86ff, #06ffa5)'
            }}
            animate={{
              y: [-5, -15, -5],
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
    
    {/* Data streams */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="data-stream absolute"
        style={{
          left: `${10 + i * 12}%`,
          top: '20%'
        }}
        animate={{
          y: [0, 200],
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.25,
          ease: "linear"
        }}
      />
    ))}
    
    {/* Quantum field indicator */}
    <motion.div
      className="absolute inset-0 rounded-2xl border-2 border-transparent"
      style={{
        background: 'conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06ffa5, #ffbe0b, #ff006e)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'subtract',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'subtract',
        padding: '2px'
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />
  </motion.div>
);

// Enhanced message component with typing animation
const MessageBubble = ({ message, isBot }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (isBot) {
      let i = 0;
      const timer = setInterval(() => {
        if (i < message.content.length) {
          setDisplayedText(message.content.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timer);
          setShowCursor(false);
        }
      }, 30);
      return () => clearInterval(timer);
    } else {
      setDisplayedText(message.content);
      setShowCursor(false);
    }
  }, [message.content, isBot]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        {isBot && (
          <motion.div 
            className="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={logo} alt="AI" className="w-full h-full object-cover" />
          </motion.div>
        )}
          <motion.div
          className={`p-3 rounded-2xl relative message-bubble ${
            isBot 
              ? 'bg-gradient-to-br from-blue-50/90 to-blue-100/90 dark:from-blue-900/30 dark:to-blue-800/30 text-gray-800 dark:text-gray-200' 
              : 'bg-gradient-to-br from-blue-500/90 to-blue-600/90 text-white'
          } backdrop-blur-sm reality-distortion`}
          whileHover={{ scale: 1.02, y: -2 }}
          layout
        >
          {/* Quantum field effect */}
          <div className="message-quantum-field" />
          
          <div className="text-sm relative z-10">
            {isBot ? (
              <Markdown 
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm dark:prose-invert max-w-none"
              >
                {displayedText}
              </Markdown>
            ) : (
              displayedText
            )}
            {showCursor && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-0.5 h-4 bg-blue-500 ml-1"
              />
            )}
          </div>
          
          {message.follow_up_questions && message.follow_up_questions.length > 0 && (
            <motion.div 
              className="mt-3 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {message.follow_up_questions.map((question, qIndex) => (
                <motion.button
                  key={qIndex}
                  className="block w-full text-left text-xs p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {question}
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const EnhancedAIChatAssistant = ({ isOpen, onClose, showAfterAnimation = false }) => {
  
  // Core states
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(!showAfterAnimation);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  
  // Animation states
  const [showParticles, setShowParticles] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 500 });

  // Refs
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Constants
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // Entrance animation sequence
  useEffect(() => {
    if (isOpen && !visible) {
      setIsEntering(true);
      setShowParticles(true);
      
      // Sequence of magical effects
      setTimeout(() => setVisible(true), 200);
      setTimeout(() => setPulseEffect(true), 800);
      setTimeout(() => {
        setShowParticles(false);
        setPulseEffect(false);
        setIsEntering(false);
      }, 3000);
    }
  }, [isOpen, visible]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial welcome message
  useEffect(() => {
    if (visible && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          content: "Hello! I'm your AI assistant. I'm here to help you with your projects, answer questions, and provide insights. What would you like to know?",
          is_bot: true,
          timestamp: new Date().toISOString(),
          follow_up_questions: [
            "Show me my project overview",
            "What are my pending tasks?",
            "Help me create a new project",
            "Analyze my team's performance"
          ]
        }]);
      }, 1000);
    }
  }, [visible, messages.length]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;
    
    const userMessage = {
      content: messageText,
      is_bot: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/chat`,
        { message: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: response.data.message || "I understand your request. Let me help you with that.",
          is_bot: true,
          timestamp: new Date().toISOString(),
          follow_up_questions: response.data.follow_up_questions
        }]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
          is_bot: true,
          timestamp: new Date().toISOString()
        }]);
        setIsTyping(false);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen && !isEntering) return null;

  return (
    <AnimatePresence>
      {(visible || isEntering) && (
        <>
          {/* Magical backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />          {/* Particle system */}
          <AnimatePresence>
            {showParticles && (
              <div className="fixed inset-0 z-45 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  {[...Array(16)].map((_, i) => (
                    <Particle key={i} index={i} isVisible={showParticles} />
                  ))}
                </div>
                {/* Additional cosmic dust particles */}
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={`dust-${i}`}
                    className="cosmic-dust absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      '--random-x': `${(Math.random() - 0.5) * 400}px`,
                      '--random-y': `${(Math.random() - 0.5) * 400}px`
                    }}
                    animate={{
                      x: [0, Math.random() * 200 - 100],
                      y: [0, Math.random() * 200 - 100],
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Main chat container */}
          <motion.div
            ref={containerRef}
            className={`fixed z-50 ai-chat-container ${isEntering ? 'entering' : ''} ${
              isMaximized 
                ? 'inset-4' 
                : 'rounded-2xl shadow-2xl'
            }`}
            initial={{ 
              scale: 0,
              opacity: 0,
              rotateY: -180,
              rotateX: -45,
              z: -1000
            }}
            animate={{ 
              scale: isMaximized ? [0, 1.1, 1] : [0, 1.05, 1],
              opacity: 1,
              rotateY: 0,
              rotateX: 0,
              z: 0
            }}
            exit={{
              scale: 0,
              opacity: 0,
              rotateY: 180,
              rotateX: 45,
              z: -1000
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              duration: 1.2
            }}
            style={{
              left: isMaximized ? 0 : position.x,
              top: isMaximized ? 0 : position.y,
              width: isMaximized ? 'calc(100vw - 2rem)' : size.width,
              height: isMaximized ? 'calc(100vh - 2rem)' : size.height,
            }}
          >
            {/* Cosmic background layer */}
            <div className="cosmic-background absolute inset-0 rounded-2xl" />
            
            {/* Neural connections overlay */}
            <div className="neural-connections absolute inset-0 rounded-2xl">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="neural-line" />
              ))}
            </div>

            {/* Holographic glow effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-40"
              style={{
                background: 'conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06ffa5, #ffbe0b, #ff006e)',
                filter: 'blur(20px)'
              }}
              animate={{
                rotate: 360,
                scale: pulseEffect ? [1, 1.05, 1] : 1
              }}
              transition={{ 
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: pulseEffect ? Infinity : 0 }
              }}
            />

            {/* Main content with glassmorphism */}
            <div className="relative h-full bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 dark:border-gray-700/30 holographic">
              {/* Header with quantum effects */}
              <motion.div 
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white backdrop-blur-sm reality-distortion"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="w-8 h-8 rounded-full overflow-hidden"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img src={logo} alt="AI" className="w-full h-full object-cover" />
                  </motion.div>
                  <div>
                    <motion.h3 
                      className="font-semibold text-lg"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      AI Assistant
                    </motion.h3>
                    <motion.div 
                      className="flex items-center space-x-2 text-sm opacity-90"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <FiActivity className="w-3 h-3" />
                      <span>{connectionStatus === "connected" ? "Online" : "Connecting..."}</span>
                    </motion.div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    onClick={() => setIsMaximized(!isMaximized)}
                  >
                    {isMaximized ? <FiMinimize2 /> : <FiMaximize2 />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    <FiX />
                  </motion.button>
                </div>
              </motion.div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 h-80">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={index}
                      message={message}
                      isBot={message.is_bot}
                      isTyping={false}
                    />
                  ))}
                  {isTyping && <AIThinkingIndicator />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>              {/* Input area with quantum effects */}
              <motion.div 
                className="p-4 border-t border-white/20 dark:border-gray-700/30 bg-white/5 dark:bg-gray-800/5 backdrop-blur-sm"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <div className="flex space-x-3">
                  <motion.div 
                    className="flex-1 relative"
                    whileFocus={{ scale: 1.02 }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything..."
                      className="w-full p-4 pr-12 rounded-xl border-2 border-white/20 dark:border-gray-600/30 
                               bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                               resize-none transition-all duration-300 ai-input backdrop-blur-sm"
                      rows={1}
                      style={{ minHeight: '50px', maxHeight: '120px' }}
                    />
                    {/* Quantum border effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'subtract',
                        WebkitMaskComposite: 'subtract',
                        padding: '2px'
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white 
                             rounded-xl hover:from-blue-600/90 hover:to-blue-700/90 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center transition-all duration-300 send-button
                             backdrop-blur-sm relative overflow-hidden"
                  >
                    {/* Quantum effect overlay */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.1), transparent, rgba(255, 255, 255, 0.1))',
                      }}
                      animate={{ rotate: loading ? 360 : 0 }}
                      transition={loading ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
                    />
                    
                    <motion.div
                      className="relative z-10"
                      animate={loading ? { rotate: 360 } : { rotate: 0 }}
                      transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                    >
                      {loading ? <FiRefreshCw className="w-5 h-5" /> : <FiSend className="w-5 h-5" />}
                    </motion.div>
                    
                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-0"
                      style={{
                        background: 'linear-gradient(45deg, rgba(255, 0, 110, 0.2), rgba(131, 56, 236, 0.2), rgba(58, 134, 255, 0.2))',
                      }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EnhancedAIChatAssistant;
