import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useMediaQuery, useTheme, Fab, Drawer, Zoom } from '@mui/material';
import { KeyboardArrowUp as KeyboardArrowUpIcon } from '@mui/icons-material';
import { FiDatabase, FiUsers, FiSettings, FiPieChart, FiBox, FiCalendar, FiGrid, FiClock, FiServer, FiMessageSquare } from 'react-icons/fi';
import AdminHeader from '../../Components/Admin/AdminHeader';
import AdminFooter from '../../Components/Admin/AdminFooter';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import FloatingChatButton from '../../Components/FloatingChatButton';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

// Define menu items
const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: FiPieChart },
  { id: 'users', label: 'User Management', icon: FiUsers },
  { id: 'projects', label: 'Projects', icon: FiGrid, badge: 5 },
  { id: 'tasks', label: 'Tasks', icon: FiBox },
  { id: 'calendar', label: 'Calendar', icon: FiCalendar },
  { id: 'time', label: 'Time Tracking', icon: FiClock },
  { id: 'chat', label: 'Chat Management', icon: FiMessageSquare },
  { id: 'data', label: 'Data & Reports', icon: FiDatabase },
  { id: 'system', label: 'System Status', icon: FiServer },
  { id: 'settings', label: 'Settings', icon: FiSettings }
];

const AdminLayout = ({ children }) => {
  const { t } = useTranslation();
  const muiTheme = useTheme();
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState('light');
  
  // Get theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Add scroll listener
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle theme toggle
  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Add any additional theme handling logic here
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  // Handle menu toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle menu item click
  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    if (isSmallScreen) {
      setMobileOpen(false);
    }
  };
  
  // Handle scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Mock user for header
  const user = {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Administrator',
    profile_picture: ''
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        bgcolor: theme === 'dark' ? '#111827' : '#f9fafb'
      }}
    >
      <AdminHeader 
        onMenuToggle={handleDrawerToggle}
        user={user}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        unreadNotifications={3}
      />
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' },
          }}
        >
          <AdminSidebar
            activeItem={activeMenu}
            onItemClick={handleMenuClick}
            onClose={handleDrawerToggle}
            onLogout={() => console.log('Logout')}
            menuItems={menuItems}
            theme={theme}
            isMobile={true}
          />
        </Drawer>
        
        {/* Desktop sidebar */}
        <Box
          sx={{
            flexShrink: 0,
            width: { md: 280 },
            display: { xs: 'none', md: 'block' },
            p: 3,
          }}
        >
          <AdminSidebar
            activeItem={activeMenu}
            onItemClick={handleMenuClick}
            onLogout={() => console.log('Logout')}
            menuItems={menuItems}
            theme={theme}
          />
        </Box>
        
        {/* Main content */}
        <Box 
          component="main"
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            width: { xs: '100%', md: `calc(100% - 280px)` },
            transition: 'all 0.3s'
          }}
        >
          <Container maxWidth="xl" sx={{ mb: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children || <Outlet />}
            </motion.div>
          </Container>
          
          <AdminFooter theme={theme} />
        </Box>
      </Box>
      
      {/* Scroll to top button */}
      <Zoom in={scrolled}>
        <Box
          role="presentation"
          sx={{
            position: 'fixed',            bottom: 32,
            right: 32,
            zIndex: 2,
          }}
        >
          <Fab
            color="primary"
            size="small"
            aria-label="scroll back to top"
            onClick={scrollToTop}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Box>
      </Zoom>

      {/* Floating Chat Button */}
      <FloatingChatButton 
        roomId="admin-general" 
        position="bottom-left"
      />
    </Box>
  );
};

export default AdminLayout;
