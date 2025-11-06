import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  Tabs,
  Tab,
  Badge,
  Switch,
  FormControlLabel,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import { ThemeProvider, createTheme, alpha, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Task as TaskIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Forum,
  Add,
  Workspaces,
  GitHub,
  Notifications,
  ArrowForward,
  CheckCircleOutline,
  Schedule,
  CalendarToday,
  Work,
  DonutLarge,
  Assignment,
  LightMode,
  DarkMode,
  Search,
  Comment,
  ThumbUp,
  Reply,
  Public,
  FilterList,
  PersonAdd,
  Save,
  PlayCircleOutline,
  AttachFile,
  MoreVert,
  Palette,
  TextFields,
  FormatColorFill,
  CloudUpload,
  Logout,
  Stars,
  Email,
  Language,
  NotificationsActive,
  Close as CloseIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import {
  FiPlus,
  FiUser,
  FiSettings,
  FiLogOut,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiFolder,
  FiHome,
  FiMessageSquare,
  FiHelpCircle,
  FiUsers,
  FiGlobe,
  FiMenu
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import AuthContext from '../../context/AuthContext.jsx'; // Changed from named import to default import
import useSettings from '../../hooks/useSettings.js'; // Changed from named import to default import

// Import AI service
import AIService from '../../services/AIService.js';

// Import AI components
import AIAssistant from '../../Components/AI/AIAssistant.jsx';
import AIChatBot from '../AiChatAssistant.jsx'; 
import AIRecommendations from '../../Components/AI/AIRecommendations.jsx';

// Import utility components
import NotificationCenter from '../../Components/Notifications/NotificationCenter.jsx';
import Navigation from '../../Components/Navigation/MainNavbar.jsx';
import SettingsPanel from '../../Components/Settings/SettingsPanel.jsx'; // Corrected path

// Create local fallback component for UserIntegrations
const UserIntegrations = () => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Available Integrations</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GitHub sx={{ mr: 1 }} />
                <Typography variant="subtitle1">GitHub</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sync your projects with GitHub repositories
              </Typography>
              <Button variant="outlined" size="small">Connect</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarToday sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Google Calendar</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sync tasks with your Google Calendar
              </Typography>
              <Button variant="outlined" size="small">Connect</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Email sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Email</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Send and receive updates via email
              </Typography>
              <Button variant="outlined" size="small">Configure</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

// Lazy load components to improve performance
const CommunityPost = lazy(() => import('../../Components/Community/CommunityPost.jsx'));

// Sample Dashboard component
const Dashboard = ({ activeItem, onNavigate, children }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const theme = useTheme();

  const handleNavigate = (item) => {
    setIsDrawerOpen(false);
    onNavigate(item);
  };

  // Fetch AI recommendations on component mount
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setAiLoading(true);
        const recommendations = await AIService.getRecommendations();
        setAiRecommendations(recommendations);
      } catch (error) {
        console.error("Error fetching AI recommendations:", error);
      } finally {
        setAiLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const menuItems = [
    { icon: <FiHome />, label: 'Workspaces' },
    { icon: <FiCalendar />, label: 'Tasks' },
    { icon: <FiUsers />, label: 'Team' },
    { icon: <FiGlobe />, label: 'Community' },
    { icon: <FiSettings />, label: 'Settings' }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Use imported Navigation component */}
      <Navigation 
        activeItem={activeItem} 
        menuItems={menuItems}
        onNavigate={handleNavigate}
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        onLogout={() => {
          if(window.confirm('Are you sure you want to logout?')) {
            logout();
          }
        }}
      />

      {/* Main Content with header */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >
        {/* Add header with notification center */}
        <Box sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10, 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1
        }}>
          <IconButton 
            color="inherit" 
            edge="start" 
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            sx={{ display: { sm: 'none' } }}
          >
            <FiMenu />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <NotificationCenter notifications={[]} />
          <IconButton 
            color="primary" 
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            sx={{ ml: 1 }}
          >
            <Tooltip title="AI Assistant">
              <Stars />
            </Tooltip>
          </IconButton>
        </Box>

        {/* Main content (children) */}
        {children}
        
        {/* AI Assistant floating panel */}
        <Dialog
          open={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            AI Assistant
            <IconButton
              aria-label="close"
              onClick={() => setShowAIAssistant(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Suspense fallback={<CircularProgress />}>
              <AIChatBot 
                isOpen={showAIAssistant}
                onClose={() => setShowAIAssistant(false)}
              />
            </Suspense>
          </DialogContent>
        </Dialog>

        {/* AI Insights/Recommendations dialog */}
        <Dialog
          open={showAIRecommendations}
          onClose={() => setShowAIRecommendations(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            AI Insights & Recommendations
            <IconButton
              aria-label="close"
              onClick={() => setShowAIRecommendations(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {aiLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : aiRecommendations.length > 0 ? (
              <List>
                {aiRecommendations.map((rec) => (
                  <ListItem key={rec.recommendation_id}>
                    <ListItemIcon>
                      <LightbulbIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={rec.content}
                      secondary={`Confidence: ${Math.round(rec.confidence_score * 100)}% • Type: ${rec.recommendation_type}`}
                    />
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        AIService.updateRecommendationStatus(rec.recommendation_id, { viewed: true, actedUpon: true });
                        // Handle action based on recommendation type
                        setShowAIRecommendations(false);
                      }}
                    >
                      Apply
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No recommendations available at this time.
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Insights floating button */}
        <Box sx={{ position: 'fixed', bottom: 90, right: 32 }}>
          <Tooltip title="AI Insights">
            <IconButton
              color="primary"
              sx={{ 
                bgcolor: 'background.paper', 
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper'
                }
              }}
              onClick={() => setShowAIRecommendations(true)}
            >
              <LightbulbIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

const UserDashboard = () => {
  const { t = (key) => key } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState([]);
  const [taskData, setTaskData] = useState([]);
  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', type: 'personal' });
  const [workspaces, setWorkspaces] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Theme settings
  const themePref = localStorage.getItem('theme') || 'light';
  const accentColor = localStorage.getItem('accentColor') || '#3f51b5';
  const theme = createTheme({
    palette: {
      mode: themePref,
      primary: {
        main: accentColor,
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: themePref === 'dark' ? '#121212' : '#f5f5f5',
        paper: themePref === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontSize: {
        'small': 12,
        'medium': 14,
        'large': 16
      }[localStorage.getItem('fontSize') || 'medium'],
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: themePref === 'dark' 
              ? '0 4px 20px 0 rgba(0,0,0,0.5)'
              : '0 4px 20px 0 rgba(0,0,0,0.05)',
          },
        },
      },
    },
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const headers = {
        Authorization: `Bearer ${token}`
      };
      
      // Fetch projects
      const projectsResponse = await axios.get('http://localhost:5000/api/projectdetails', { headers });
      
      // Fetch tasks
      const tasksResponse = await axios.get('http://localhost:5000/api/member/tasks', { headers });
      
      // Fetch workspaces (mocked for now)
      const workspacesData = [
        { id: 'w1', name: 'Personal Projects', description: 'For my own projects and ideas', members: 1, type: 'personal' },
        { id: 'w2', name: 'Client Work', description: 'Client projects and deliverables', members: 3, type: 'team' },
        { id: 'w3', name: 'Learning', description: 'Educational projects and experiments', members: 1, type: 'personal' }
      ];
      
      // Fetch team members
      const teamResponse = await axios.get('http://localhost:5000/api/member/team', { headers });
      
      // Fetch activity logs
      const activityResponse = await axios.get(`http://localhost:5000/api/activity`, { headers });
      
      // Fetch community posts
      const communitResponse = await axios.get('http://localhost:5000/api/community/posts', { 
        headers,
        params: { limit: 10 }
      }).catch(() => ({ data: [] })); // Fallback if API doesn't exist yet
      
      // Fetch notifications
      const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', { headers });

      setProjectData(projectsResponse.data.projects || []);
      setTaskData(tasksResponse.data.tasks || []);
      setWorkspaces(workspacesData || []);
      setTeamMembers(teamResponse.data.team_members || []);
      setActivities(activityResponse.data || []);
      setCommunityPosts(communitResponse.data || []);
      setNotifications(notificationsResponse.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime updates
    const ws = new WebSocket('ws://localhost:5000');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.notification, ...prev]);
      } else if (data.type === 'activity') {
        setActivities(prev => [data.activity, ...prev]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const createWorkspace = async () => {
    try {
      // This would be an API call in a real app
      if (!newWorkspace.name) {
        alert('Please enter a workspace name');
        return;
      }
      
      setLoading(true);
      
      // API call to create workspace
      const response = await axios.post(
        'http://localhost:5000/api/workspaces',
        newWorkspace,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      const newWorkspaceData = response.data;
      setWorkspaces([...workspaces, newWorkspaceData]);
      setShowNewWorkspaceDialog(false);
      setNewWorkspace({ name: '', description: '', type: 'personal' });
      setSuccessMessage('Workspace created successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const inviteTeamMember = async (email) => {
    try {
      // Send invitation API call
      await axios.post(
        'http://localhost:5000/api/invitations',
        { email },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      setSuccessMessage(`Invitation sent to ${email}!`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error inviting team member:', error);
      alert('Failed to send invitation: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const createCommunityPost = async (post) => {
    try {
      const formData = new FormData();
      formData.append('content', post.content);
      
      if (post.attachments.length > 0) {
        post.attachments.forEach(file => {
          formData.append('files', file);
        });
      }
      
      const response = await axios.post(
        'http://localhost:5000/api/community/posts',
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setCommunityPosts([response.data, ...communityPosts]);
      setSuccessMessage('Post created successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const saveUserSettings = async (newSettings) => {
    try {
      await axios.put(
        'http://localhost:5000/api/user/settings',
        newSettings,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      // Update i18n language if changed
      if (newSettings.language !== localStorage.getItem('i18nextLng')?.split('-')[0]) {
        i18n.changeLanguage(newSettings.language);
      }
      
      // Force reload to apply theme changes if needed
      if (newSettings.theme !== localStorage.getItem('theme')) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  // Fallback tab labels if translations aren't available
  const defaultTabLabels = {
    workspaces: 'Workspaces',
    tasks: 'Tasks',
    team: 'Team',
    community: 'Community',
    settings: 'Settings'
  };

  const tabs = [
    { label: t('dashboard.workspaces', defaultTabLabels.workspaces), icon: <FiFolder /> },
    { label: t('dashboard.tasks', defaultTabLabels.tasks), icon: <FiCalendar /> },
    { label: t('dashboard.team', defaultTabLabels.team), icon: <FiUsers /> },
    { label: t('dashboard.community', defaultTabLabels.community), icon: <FiGlobe /> },
    { label: t('dashboard.settings', defaultTabLabels.settings), icon: <FiSettings /> }
  ];

  // Error boundary UI
  if (error) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 3 }}
        >
          {t('errors.tryAgain', 'Try Again')}
        </Button>
      </Box>
    );
  }

  // Loading state UI
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Dashboard activeItem="home" onNavigate={(tab) => {
      try {
        const index = tabs.findIndex(t => t.label === tab);
        setActiveTab(index >= 0 ? index : 0);
      } catch (error) {
        console.error('Navigation error:', error);
        setActiveTab(0);
      }
    }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          {/* Main content header with tabs */}
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: '0 0 16px 16px', 
              mb: 3, 
              overflow: 'hidden',
              bgcolor: 'background.paper'
            }}
          >
            <Box 
              sx={{ 
                p: 3, 
                backgroundImage: themePref === 'dark' 
                  ? 'linear-gradient(to right, #1a237e, #303f9f)' 
                  : 'linear-gradient(to right, #3949ab, #5c6bc0)', 
                color: 'white' 
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {t('dashboard.welcome', 'Welcome')}, {user?.name || 'User'}!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                {t('dashboard.dashboardDescription', 'Manage your projects, tasks and team in one place')}
              </Typography>
            </Box>
            
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ px: 2 }}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabs.map((tab, index) => (
                <Tab 
                  key={index} 
                  icon={tab.icon} 
                  label={tab.label} 
                  iconPosition="start"
                  sx={{ minHeight: 64 }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* Success message */}
          {successMessage && (
            <Snackbar
              open={!!successMessage}
              autoHideDuration={6000}
              onClose={() => setSuccessMessage('')}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert severity="success" variant="filled">{successMessage}</Alert>
            </Snackbar>
          )}

          {/* Main content from original UserDashboard */}
          <Box sx={{ p: 3 }}>
            <AnimatePresence mode="wait">
              {activeTab === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Workspace Management */}
                  <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <FiFolder style={{ marginRight: '10px' }} /> Your Workspaces
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<FiPlus />}
                      onClick={() => setShowNewWorkspaceDialog(true)}
                    >
                      New Workspace
                    </Button>
                  </Box>

                  {workspaces && workspaces.length > 0 ? (
                    <Grid container spacing={3}>
                      {workspaces.map(workspace => (
                        <Grid item xs={12} md={6} lg={4} key={workspace.id || `workspace-${Math.random()}`}>
                          <Card>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <FiFolder style={{ fontSize: 40, color: 'primary.main' }} />
                                <Box>
                                  <Typography variant="h6">{workspace.name || 'Untitled Workspace'}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {workspace.description || 'No description available'}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label={`Members: ${workspace.members || 0}`} size="small" />
                                <Chip label={workspace.type || 'personal'} color="primary" size="small" />
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                      <Typography variant="body1" color="text.secondary">
                        You don't have any workspaces yet. Create one to get started.
                      </Typography>
                    </Box>
                  )}

                  {/* Recent Projects */}
                  <Box sx={{ mt: 5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center' }}>
                      <FiBarChart2 style={{ marginRight: '10px' }} /> Recent Projects
                    </Typography>
                    
                    {projectData && projectData.length > 0 ? (
                      <Grid container spacing={3}>
                        {projectData.map(project => (
                          <Grid item xs={12} md={6} lg={4} key={project.id || `project-${Math.random()}`}>
                            <Card>
                              <CardContent>
                                <Typography variant="h6">{project.name || 'Untitled Project'}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  {project.description || 'No description available'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                                    <Box
                                      sx={{
                                        height: '100%',
                                        borderRadius: 1,
                                        bgcolor: 'primary.main',
                                        width: `${project.progress || 0}%`,
                                      }}
                                    />
                                  </Box>
                                  <Typography variant="body2">{project.progress || 0}%</Typography>
                                </Box>
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Chip 
                                    label={project.status === 'completed' ? 'Completed' : 'In Progress'} 
                                    color={project.status === 'completed' ? 'success' : 'primary'} 
                                    size="small" 
                                  />
                                  <Button 
                                    endIcon={<ArrowForward />} 
                                    size="small"
                                    onClick={() => {
                                      try {
                                        navigate(`/projects/${project.id}`);
                                      } catch (error) {
                                        console.error('Navigation error:', error);
                                      }
                                    }}
                                  >
                                    View
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          No projects found. Create a project to get started.
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Activity Feed */}
                  <Box sx={{ mt: 5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center' }}>
                      <FiClock style={{ marginRight: '10px' }} /> Recent Activity
                    </Typography>
                    
                    {activities && activities.length > 0 ? (
                      <Card>
                        <List>
                          {activities.map((activity) => (
                            <React.Fragment key={activity.id || `activity-${Math.random()}`}>
                              <ListItem>
                                <ListItemIcon>
                                  {activity.type === 'task_completed' ? <CheckCircleOutline color="success" /> : 
                                   activity.type === 'comment_added' ? <Forum color="info" /> : <Work color="primary" />}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={activity.message || 'Activity'} 
                                  secondary={activity.time || formatDistanceToNow(new Date(activity.timestamp || Date.now()), { addSuffix: true })} 
                                />
                              </ListItem>
                              <Divider component="li" />
                            </React.Fragment>
                          ))}
                        </List>
                      </Card>
                    ) : (
                      <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          No recent activity to show.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </motion.div>
              )}

              {activeTab === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Tasks Management */}
                  <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <FiCalendar style={{ marginRight: '10px' }} /> Your Tasks
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<FiPlus />}
                    >
                      Create Task
                    </Button>
                  </Box>

                  {taskData && taskData.length > 0 ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <DonutLarge color="error" sx={{ mr: 1 }} />
                            To Do
                          </Typography>
                          {taskData
                            .filter(task => task.status === 'todo')
                            .map(task => (
                              <Card key={task.id || `todo-${Math.random()}`} sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                <CardContent>
                                  <Typography variant="subtitle1">{task.title || 'Untitled Task'}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Project: {task.project || 'General'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                    <Chip 
                                      label={task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'} 
                                      size="small"
                                      color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'info'}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Schedule fontSize="small" sx={{ mr: 0.5 }} />
                                      <Typography variant="caption">{task.dueDate || 'No deadline'}</Typography>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          
                          {taskData.filter(task => task.status === 'todo').length === 0 && (
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                No tasks to do.
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <DonutLarge color="warning" sx={{ mr: 1 }} />
                            In Progress
                          </Typography>
                          {taskData
                            .filter(task => task.status === 'in_progress')
                            .map(task => (
                              <Card key={task.id || `inprogress-${Math.random()}`} sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
                                <CardContent>
                                  <Typography variant="subtitle1">{task.title || 'Untitled Task'}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Project: {task.project || 'General'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                    <Chip 
                                      label={task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'} 
                                      size="small"
                                      color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'info'}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Schedule fontSize="small" sx={{ mr: 0.5 }} />
                                      <Typography variant="caption">{task.dueDate || 'No deadline'}</Typography>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                            
                          {taskData.filter(task => task.status === 'in_progress').length === 0 && (
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                No tasks in progress.
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <DonutLarge color="success" sx={{ mr: 1 }} />
                            Completed
                          </Typography>
                          {taskData
                            .filter(task => task.status === 'completed')
                            .map(task => (
                              <Card key={task.id || `completed-${Math.random()}`} sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'success.main' }}>
                                <CardContent>
                                  <Typography variant="subtitle1">{task.title || 'Untitled Task'}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Project: {task.project || 'General'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                    <Chip 
                                      label={task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'} 
                                      size="small"
                                      color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'info'}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Schedule fontSize="small" sx={{ mr: 0.5 }} />
                                      <Typography variant="caption">{task.dueDate || 'No deadline'}</Typography>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                            
                          {taskData.filter(task => task.status === 'completed').length === 0 && (
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                No completed tasks.
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                      <Typography variant="body1" color="text.secondary">
                        No tasks found. Create a task to get started.
                      </Typography>
                    </Box>
                  )}
                </motion.div>
              )}

              {activeTab === 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Team Management */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <FiUsers style={{ marginRight: '10px' }} /> Team Management
                    </Typography>
                  </Box>
                  
                  {teamMembers && teamMembers.length > 0 ? (
                    <TeamManagement
                      members={teamMembers}
                      onInvite={inviteTeamMember}
                      onRemove={(memberId) => {
                        try {
                          setTeamMembers(teamMembers.filter(m => m.id !== memberId));
                        } catch (error) {
                          console.error('Error removing team member:', error);
                        }
                      }}
                    />
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                      <Typography variant="body1" color="text.secondary">
                        No team members found. Invite team members to collaborate.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<FiPlus />}
                        sx={{ mt: 2 }}
                        onClick={() => {
                          const email = prompt('Enter email address to invite:');
                          if (email) inviteTeamMember(email);
                        }}
                      >
                        Invite Team Member
                      </Button>
                    </Box>
                  )}
                </motion.div>
              )}

              {/* Community Tab */}
              {activeTab === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                      <FiGlobe style={{ marginRight: '10px' }} /> Community
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Connect with your teammates, share ideas, and collaborate in real-time.
                    </Typography>
                  </Box>
                  
                  {/* Create new post section */}
                  <CreatePost onSubmit={createCommunityPost} />
                  
                  {/* Posts feed */}
                  <Box>
                    {communityPosts && communityPosts.length > 0 ? (
                      communityPosts.map(post => (
                        <Suspense key={post.id || `post-${Math.random()}`} fallback={<CircularProgress />}>
                          <CommunityPost
                            post={post}
                            currentUser={user}
                            onLike={(postId) => {
                              const updatedPosts = communityPosts.map(p => 
                                p.id === postId 
                                  ? {...p, likes: (p.likes || 0) + 1, liked: true} 
                                  : p
                              );
                              setCommunityPosts(updatedPosts);
                            }}
                            onComment={(postId, comment) => {
                              const updatedPosts = communityPosts.map(p => {
                                if (p.id === postId) {
                                  const comments = p.comments || [];
                                  return {
                                    ...p,
                                    comments: [...comments, {
                                      id: `comment-${Date.now()}`,
                                      content: comment,
                                      author: user,
                                      created_at: new Date().toISOString()
                                    }]
                                  };
                                }
                                return p;
                              });
                              setCommunityPosts(updatedPosts);
                            }}
                            onShare={(postId) => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/community/posts/${postId}`
                              );
                              setSuccessMessage('Link copied to clipboard!');
                            }}
                            onDelete={(postId) => {
                              setCommunityPosts(communityPosts.filter(p => p.id !== postId));
                              setSuccessMessage('Post deleted successfully!');
                            }}
                            onSavePost={(postId, saved) => {
                              const updatedPosts = communityPosts.map(p => 
                                p.id === postId ? {...p, saved} : p
                              );
                              setCommunityPosts(updatedPosts);
                              setSuccessMessage(saved ? 'Post saved!' : 'Post unsaved');
                            }}
                            onReport={(postId) => {
                              // Report post logic would go here
                              setSuccessMessage('Post reported. Thank you for keeping our community safe.');
                            }}
                          />
                        </Suspense>
                      ))
                    ) : (
                      <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          No posts yet. Be the first to share something with your team!
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </motion.div>
              )}

              {activeTab === 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <FiSettings style={{ marginRight: '10px' }} /> Settings
                    </Typography>
                  </Box>
                  
                  {/* User Settings */}
                  <SettingsPanel 
                    user={user}
                    onSave={saveUserSettings}
                  />
                  
                  {/* Integrations */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Integrations</Typography>
                    
                    <UserIntegrations /> {/* Use the local component instead of Suspense */}
                  </Box>

                  {/* Notifications section with FiBell icon */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <FiBell style={{ marginRight: '10px' }} /> Notifications
                    </Typography>
                    
                    <Card sx={{ p: 2 }}>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Email Notifications"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Push Notifications"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="Desktop Notifications"
                      />
                    </Card>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
          
          {/* New Workspace Dialog */}
          <Dialog open={showNewWorkspaceDialog} onClose={() => setShowNewWorkspaceDialog(false)}>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Workspace Name"
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                value={newWorkspace.name || ''}
                onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
              />
              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                value={newWorkspace.description || ''}
                onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Workspace Type</InputLabel>
                <Select
                  value={newWorkspace.type || 'personal'}
                  label="Workspace Type"
                  onChange={(e) => setNewWorkspace({...newWorkspace, type: e.target.value})}
                >
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="team">Team</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowNewWorkspaceDialog(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={createWorkspace}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Create
              </Button>
            </DialogActions>
          </Dialog>

          {/* Community Support Floating Button */}
          <Box sx={{ position: 'fixed', bottom: 32, right: 32 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<FiMessageSquare />}
              sx={{ borderRadius: 4, boxShadow: 3 }}
              onClick={() => {
                try {
                  window.open('https://community.worksuitepro.com');
                } catch (error) {
                  console.error('Error opening community website:', error);
                }
              }}
            >
              Community Support
            </Button>
          </Box>

          {/* Help button with FiHelpCircle icon */}
          <Box sx={{ position: 'fixed', bottom: 32, right: 240 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FiHelpCircle />}
              sx={{ borderRadius: 4, boxShadow: 2 }}
              onClick={() => {
                // Add help functionality
                setSuccessMessage('Help documentation will open in a new tab');
              }}
            >
              Help
            </Button>
          </Box>
        </Box>
      </ThemeProvider>
    </Dashboard>
  );
};

export default UserDashboard;
