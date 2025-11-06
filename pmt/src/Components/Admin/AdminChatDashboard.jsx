import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { Menu as MenuIcon, Message as MessageIcon, Close as CloseIcon } from '@mui/icons-material';
import ChatManagement from '../Components/Admin/ChatManagement';
import ChatModal from '../Components/ChatModal';
import { useTranslation } from 'react-i18next';

const AdminChatDashboard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('management');

  const menuItems = [
    { id: 'management', label: 'Chat Room Management', icon: <MessageIcon /> },
    { id: 'monitor', label: 'Live Chat Monitor', icon: <MessageIcon /> },
  ];

  const renderContent = () => {
    switch (selectedView) {
      case 'management':
        return <ChatManagement />;
      case 'monitor':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Live Chat Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor active chat rooms and conversations in real-time.
            </Typography>
            {/* This would be implemented with real-time chat monitoring */}
          </Box>
        );
      default:
        return <ChatManagement />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(true)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('admin.chat.dashboard')} - Chat Administration
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setChatModalOpen(true)}
            title="Open Team Chat"
          >
            <MessageIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
            zIndex: theme.zIndex.drawer
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat Admin
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <List>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.id}
              selected={selectedView === item.id}
              onClick={() => {
                setSelectedView(item.id);
                setDrawerOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(103, 126, 234, 0.1)',
                  borderRight: '3px solid #667eea'
                }
              }}
            >
              <ListItemIcon sx={{ color: selectedView === item.id ? '#667eea' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{ 
                  '& .MuiListItemText-primary': {
                    color: selectedView === item.id ? '#667eea' : 'inherit',
                    fontWeight: selectedView === item.id ? 'bold' : 'normal'
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8, // Account for AppBar height
          position: 'relative',
          zIndex: 1,
          overflow: 'auto',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {renderContent()}
      </Box>

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        roomId="admin-team"
        title="Admin Team Chat"
      />
    </Box>
  );
};

export default AdminChatDashboard;
