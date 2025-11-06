import React, { useState, useEffect } from 'react';
import { FiX, FiHome, FiUsers, FiSettings, FiFileText, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

const AdminSidebar = ({
  activeItem = 'dashboard',
  onItemClick = () => {},
  theme = 'light',
  menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'reports', label: 'Reports', icon: FiFileText },
    { id: 'messages', label: 'Messages', icon: FiMessageSquare },
    { id: 'settings', label: 'Settings', icon: FiSettings }
  ],
  isMobile = false,
  onClose = () => {},
  unreadNotifications = 0
}) => {
  // Theme configuration
  const themeConfig = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-800',
      active: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      hover: 'hover:bg-gray-50',
      border: 'border-gray-200',
      overlay: 'bg-black/30'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
      active: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white',
      hover: 'hover:bg-gray-800',
      border: 'border-gray-700',
      overlay: 'bg-black/50'
    }
  };
  
  const currentTheme = themeConfig[theme];
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate sidebar width based on state
  const sidebarWidth = isMobile ? 280 : hovered ? 220 : 64;

  // Animation variants
  const itemAnimation = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: 'spring', 
        stiffness: 500,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      x: -20,
      transition: { duration: 0.2 }
    }
  };

  // Handle hover state with debounce
  const handleHover = (isHovering) => {
    if (isMobile) return;
    setIsAnimating(true);
    setHovered(isHovering);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Semicircle clip-path style and layout improvements
  const semicircleStyle = {
    clipPath: isMobile ? 'none' : `circle(${sidebarWidth * 2.5}px at -${sidebarWidth * 0.4}px 50%)`,
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  };

  // Animation for icon-only to full text transition with enhanced styling
  const iconOnlyVariants = {
    icon: { scale: 1.2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' },
    full: { scale: 1, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
  };

  // Custom gradient background for hover state
  const gradientHover = theme === 'light' 
    ? 'linear-gradient(135deg, rgba(239,246,255,0.85), rgba(219,234,254,0.95))'
    : 'linear-gradient(135deg, rgba(17,24,39,0.85), rgba(30,41,59,0.95))';

  return (
    <LayoutGroup>
      {/* Mobile Overlay */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-30 ${currentTheme.overlay}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <motion.aside
        layout
        initial={{ width: 64 }}
        animate={{
          width: sidebarWidth,
          transition: { 
            type: 'spring', 
            stiffness: 300, 
            damping: 30,
            mass: 0.5
          }
        }}
        onHoverStart={() => handleHover(true)}
        onHoverEnd={() => handleHover(false)}
        className={`fixed top-0 left-0 z-40 h-full ${currentTheme.bg} overflow-hidden`}
        style={{
          ...semicircleStyle,
          background: theme === 'light' 
            ? 'linear-gradient(145deg, #ffffff, #f5f7fa)' 
            : 'linear-gradient(145deg, #1f2937, #111827)',
          boxShadow: theme === 'light' 
            ? '8px 0 30px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' 
            : '8px 0 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        aria-label="Admin sidebar navigation"
      >
        {/* Active tab indicator - floating marker */}
        <AnimatePresence>
          {menuItems.map((item, index) => {
            if (activeItem === item.id) {
              // Calculate position based on index
              const totalItems = menuItems.length;
              const positionY = `calc(50% + ${((index - (totalItems - 1) / 2) * 45)}px)`;
              
              return (
                <motion.div
                  key={`active-${item.id}`}
                  layoutId="activeTabIndicator"
                  className="absolute left-0 z-10 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ top: positionY }}
                >
                  {/* Active bar indicator */}
                  <div className={`w-1.5 h-8 rounded-r-full ${
                    theme === 'light' 
                      ? 'bg-gradient-to-b from-blue-500 to-purple-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
                      : 'bg-gradient-to-b from-indigo-500 to-blue-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]'
                  }`} />
                  
                  {/* Arrow indicator that appears on hover */}
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -5 }}
                    className={`ml-1 ${hovered ? 'visible' : 'invisible'} text-xs`}
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded-full ${
                      theme === 'light' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white'
                    }`}>
                      <span>›</span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
        
        <div className="relative h-full flex flex-col">
          {/* Frosted glass effect and decoration */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Glass effect background with mesh gradient */}
            <div className="absolute inset-0" 
              style={{
                background: theme === 'light'
                  ? 'radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.03), transparent 25%), radial-gradient(circle at 80% 60%, rgba(59, 130, 246, 0.05), transparent 50%)'
                  : 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.08), transparent 25%), radial-gradient(circle at 80% 60%, rgba(37, 99, 235, 0.1), transparent 50%)'
              }}
            />
            
            {/* Decorative elements */}
            <div className="absolute top-[10%] right-[20%] w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full filter blur-[80px] opacity-10" />
            <div className="absolute bottom-[20%] left-[5%] w-40 h-40 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full filter blur-[70px] opacity-10" />
            
            {/* Animated ambient background */}
            <motion.div 
              className="absolute inset-0 opacity-5"
              animate={{ 
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{ 
                duration: 20, 
                ease: "linear", 
                repeat: Infinity,
                repeatType: "reverse" 
              }}
              style={{
                backgroundSize: "400% 400%",
                backgroundImage: theme === 'light'
                  ? 'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.2), transparent)'
                  : 'linear-gradient(45deg, transparent, rgba(79, 70, 229, 0.2), transparent)'
              }}
            />
          </div>
          
          {/* Close Button (Mobile Only) */}
          {isMobile && (
            <motion.button
              onClick={onClose}
              className="p-3 self-end"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close sidebar"
            >
              <FiX className={`${currentTheme.text} text-xl`} />
            </motion.button>
          )}

          {/* Navigation Items - Semi-circular arrangement */}
          <nav className="flex-1 flex flex-col justify-center p-4">
            <ul className="space-y-6 pl-2">
              {menuItems.map((item, index) => {
                const isActive = activeItem === item.id;
                const badgeCount = item.id === 'messages' ? unreadNotifications : item.badge;
                
                // Calculate rotation angle for semi-circular arrangement
                const totalItems = menuItems.length;
                const angle = ((index - (totalItems - 1) / 2) * 10);
                
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={itemAnimation}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                    style={{ 
                      transform: isMobile ? 'none' : `translateX(${angle}px)`,
                      marginLeft: isMobile ? '0' : `${Math.abs(angle) * 0.4}px` 
                    }}
                  >
                    <motion.button
                      layout
                      onClick={() => {
                        onItemClick(item.id);
                        isMobile && onClose();
                      }}
                      className={`w-full flex items-center p-3 rounded-xl transition-all duration-200
                        ${isActive 
                          ? `${currentTheme.active} shadow-lg`
                          : `${currentTheme.text} ${currentTheme.hover}`
                        }`}
                      whileHover={{ 
                        scale: isAnimating ? 1 : 1.02,
                        backgroundColor: isActive 
                          ? undefined 
                          : gradientHover
                      }}
                      whileTap={{ scale: 0.98 }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="text-2xl min-w-[40px]" />
                      
                      <AnimatePresence>
                        {(hovered || isMobile) && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ 
                              opacity: 1, 
                              x: 0,
                              transition: { delay: 0.1 }
                            }}
                            exit={{ opacity: 0, x: -10 }}
                            className="ml-3 font-medium whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      
                      {badgeCount > 0 && (
                        <motion.span
                          layout
                          className={`ml-auto px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center
                            ${isActive 
                              ? 'bg-white text-blue-600' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                        >
                          {badgeCount}
                        </motion.span>
                      )}
                    </motion.button>
                  </motion.li>
                );
              })}
            </ul>
          </nav>
          
          {/* Enhanced haptic feedback indicator */}
          {!isMobile && (
            <motion.div 
              className={`absolute top-1/2 right-0 transform -translate-y-1/2 ${!hovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}
              animate={{ x: hovered ? 10 : 0 }}
            >
              <motion.div
                className={`flex items-center justify-center w-8 h-16 bg-gradient-to-r 
                  ${theme === 'light' ? 'from-blue-500 to-purple-500' : 'from-indigo-600 to-blue-600'} 
                  rounded-l-full cursor-pointer shadow-lg`}
                whileHover={{ 
                  scale: [1, 1.05, 0.95, 1.02, 1],
                  x: [0, 2, -2, 1, 0],
                  transition: { duration: 0.5 } 
                }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </motion.div>
          )}
          
          {/* Footer section with better spacing */}
          <div className={`p-4 mt-auto border-t ${currentTheme.border}`}>
            <div className="flex items-center justify-center">
              <AnimatePresence mode="wait">
                {(hovered || isMobile) ? (
                  <motion.p 
                    key="expanded"
                    initial={{ opacity: 0 }} 
                    animate={{ 
                      opacity: 1,
                      transition: { delay: 0.1 }
                    }} 
                    exit={{ opacity: 0 }}
                    className={`text-xs text-center ${currentTheme.text} opacity-60`}
                  >
                    Admin Dashboard v1.0
                  </motion.p>
                ) : (
                  <motion.div 
                    key="collapsed"
                    initial={{ scale: 0.8 }} 
                    animate={{ scale: 1 }}
                    className={`w-6 h-1 rounded-full ${currentTheme.active}`}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.aside>
    </LayoutGroup>
  );
};

export default AdminSidebar;