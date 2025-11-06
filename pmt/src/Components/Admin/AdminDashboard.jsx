import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Paper, 
  Chip, 
  Stack, 
  Divider, 
  CircularProgress, 
  IconButton 
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiClipboard, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiActivity, 
  FiCpu, 
  FiHardDrive, 
  FiServer, 
  FiArrowLeft, 
  FiArrowRight, 
  FiRefreshCw,
  FiLogOut 
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const AdminDashboard = ({ theme = 'light', onNavigate }) => {
  const [dashboardData, setDashboardData] = useState({
    users: { total: 1245, active: 1187, new: 42 },
    projects: { total: 87, active: 52, completed: 28 },
    tasks: { total: 1243, completed: 876, overdue: 45 },
    security: { threats: 2, vulnerabilities: 5, auditEvents: 124 },
    system: { 
      cpu: 45, 
      memory: 62, 
      disk: 38, 
      uptime: 14,
      network: { in: 24, out: 18 },
      services: { active: 12, total: 14 },
      lastReboot: '2023-05-15T08:30:00Z',
      temperature: 42
    },
    recentActivity: [
      {
        id: 1,
        user: 'John Doe',
        action: 'created',
        message: 'Created new project "Dashboard Redesign"',
        timestamp: '2023-06-01T09:15:00Z',
        actionable: true
      },
      {
        id: 2,
        user: 'Jane Smith',
        action: 'completed',
        message: 'Completed task "Implement dark mode"',
        timestamp: '2023-06-01T10:30:00Z',
        actionable: false
      },
      {
        id: 3,
        user: 'Admin',
        action: 'system',
        message: 'System backup completed successfully',
        timestamp: '2023-06-01T04:00:00Z',
        actionable: true
      }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const scrollContainerRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [
        statsRes,
        projectsRes,
        tasksRes,
        usersRes,
        securityRes,
        systemRes,
        activityRes
      ] = await Promise.all([
        axios.get(`http://localhost:5000/api/admin/stats`, config),
        axios.get(`http://localhost:5000/api/projects`, config),
        axios.get(`http://localhost:5000/api/admin/tasks`, config),
        axios.get(`http://localhost:5000/api/users`, config),
        axios.get(`http://localhost:5000/api/security/overview`, config),
        axios.get(`http://localhost:5000/api/system/metrics`, config),
        axios.get(`http://localhost:5000/api/activity`, config)
      ]);
      
      // Process the response data to match the expected format
      const projectsData = projectsRes?.data?.projects || [];
      const usersData = usersRes?.data?.users || [];
      const tasksData = tasksRes?.data?.tasks || [];
      const securityData = securityRes?.data || {};
      const systemMetrics = systemRes?.data || {};
      const activityData = activityRes?.data || [];
      
      setDashboardData({
        users: { 
          total: usersData.length, 
          active: usersData.filter(user => user?.status === 'active').length,
          new: countNewUsers(usersData)
        },
        projects: { 
          total: projectsData.length, 
          active: projectsData.filter(project => project.status === 'active').length,
          completed: projectsData.filter(project => project.status === 'completed').length
        },
        tasks: { 
          total: tasksData.length, 
          completed: tasksData.filter(task => task.status === 'Completed').length,
          overdue: countOverdueTasks(tasksData)
        },        security: { 
          threats: securityData.threats || 0, 
          vulnerabilities: securityData.vulnerabilities || 0, 
          auditEvents: securityData.auditEvents || 0
        },
        system: {
          cpu: systemMetrics.cpu || 0,
          memory: systemMetrics.memory || 0,
          disk: systemMetrics.disk || 0,
          uptime: systemMetrics.uptime || 0,
          network: {
            in: systemMetrics.network?.in || 0,
            out: systemMetrics.network?.out || 0
          },
          services: {
            active: systemMetrics.services?.active || 0,
            total: systemMetrics.services?.total || 0
          },
          lastReboot: systemMetrics.lastReboot || null,
          temperature: systemMetrics.temperature || 0
        },
        recentActivity: activityData
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions
  const countNewUsers = (users) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return users.filter(user => user?.created_at && new Date(user.created_at) > oneMonthAgo).length;
  };

  const countOverdueTasks = (tasks) => {
    const today = new Date();
    return tasks.filter(task => task.due_date && new Date(task.due_date) < today && task.status !== 'Completed').length;
  };

  const scrollToSlide = (index) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const slideWidth = container.offsetWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: 'smooth'
    });
    setCurrentSlide(index);
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const slideWidth = container.offsetWidth;
    const newSlide = Math.round(container.scrollLeft / slideWidth);
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up polling interval for real-time data updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentSlide]);

  const handleLogout = () => {
    // Clear authentication token
    localStorage.removeItem('authToken');
    // Redirect to login page
    window.location.href = '/login';
    // If using a router like react-router-dom, you could use:
    // onNavigate && onNavigate('/login');
  };

  const renderKeyMetrics = () => (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        {t('admin.dashboard.sections.keyMetrics')}
      </Typography>
      
      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        {/* Users Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'white', mr: 2 }}>
                  <FiUsers size={24} />
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {t('admin.dashboard.cards.users')}
                </Typography>
              </Box>
              
              <Typography variant="h3" fontWeight="bold" mb={0.5}>
                {dashboardData.users.total}
              </Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.active')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {dashboardData.users.active}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.new')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {dashboardData.users.new}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Projects Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.main', color: 'white', mr: 2 }}>
                  <FiClipboard size={24} />
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {t('admin.dashboard.cards.projects')}
                </Typography>
              </Box>
              
              <Typography variant="h3" fontWeight="bold" mb={0.5}>
                {dashboardData.projects.total}
              </Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.active')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {dashboardData.projects.active}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.completed')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {dashboardData.projects.completed}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Tasks Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.main', color: 'white', mr: 2 }}>
                  <FiCheckCircle size={24} />
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {t('admin.dashboard.cards.tasks')}
                </Typography>
              </Box>
              
              <Typography variant="h3" fontWeight="bold" mb={0.5}>
                {dashboardData.tasks.total}
              </Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.completed')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {dashboardData.tasks.completed}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.overdue')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color="error.main">
                    {dashboardData.tasks.overdue}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Security Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.main', color: 'white', mr: 2 }}>
                  <FiAlertCircle size={24} />
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {t('admin.dashboard.cards.security')}
                </Typography>
              </Box>
              
              <Typography variant="h3" fontWeight="bold" mb={0.5}>
                {dashboardData.security.threats + dashboardData.security.vulnerabilities}
              </Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.threats')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color={dashboardData.security.threats > 0 ? "error.main" : "inherit"}>
                    {dashboardData.security.threats}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.metrics.vulnerabilities')}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" color={dashboardData.security.vulnerabilities > 0 ? "warning.main" : "inherit"}>
                    {dashboardData.security.vulnerabilities}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  const renderActivityCharts = () => {
    const projectStatusData = [
      { name: t('admin.dashboard.charts.active'), value: dashboardData.projects.active },
      { name: t('admin.dashboard.charts.completed'), value: dashboardData.projects.completed },
      { name: t('admin.dashboard.charts.pending'), value: dashboardData.projects.total - dashboardData.projects.active - dashboardData.projects.completed }
    ];
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
    
    const taskTrendData = Array(7).fill().map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return { 
        name: date.toLocaleDateString('en-US', { weekday: 'short' }), 
        completed: Math.floor(Math.random() * 20),
        created: Math.floor(Math.random() * 30) 
      };
    });
    
    return (
      <Box sx={{ 
        width: '100vw', 
        height: '100vh', 
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Typography variant="h4" fontWeight="bold" mb={4}>
          {t('admin.dashboard.sections.activityCharts')}
        </Typography>
        
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          {/* Project Status Distribution Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  {t('admin.dashboard.charts.projectStatusDistribution')}
                </Typography>
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Task Completion Trend Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  {t('admin.dashboard.charts.taskTrend')}
                </Typography>
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskTrendData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="created" fill="#8884d8" name={t('admin.dashboard.charts.tasksCreated')} />
                      <Bar dataKey="completed" fill="#82ca9d" name={t('admin.dashboard.charts.tasksCompleted')} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  const renderSystemHealth = () => {
    // Defensive: ensure dashboardData.system and its nested properties exist
    const system = dashboardData.system || {};
    const network = system.network || { in: 0, out: 0 };
    const services = system.services || { active: 0, total: 0 };
    return (
      <Box sx={{ 
        width: '100vw', 
        height: '100vh', 
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="bold">
            {t('admin.dashboard.sections.systemHealth')}
          </Typography>
          <IconButton 
            onClick={() => setRefreshing(true)}
            disabled={refreshing}
            sx={{ bgcolor: 'background.paper', boxShadow: 1, borderRadius: 2 }}
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
          </IconButton>
        </Box>
        
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          {/* CPU Usage */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'white', mr: 2 }}>
                    <FiCpu size={24} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.dashboard.system.cpu')}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {system.cpu ?? 0}%
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          borderRadius: 4, 
                          width: `${system.cpu ?? 0}%`,
                          bgcolor: (system.cpu ?? 0) > 80 ? 'error.main' : 
                                  (system.cpu ?? 0) > 50 ? 'warning.main' : 'success.main'
                        }} 
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Memory Usage */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.main', color: 'white', mr: 2 }}>
                    <FiHardDrive size={24} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.dashboard.system.memory')}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {system.memory ?? 0}%
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          borderRadius: 4, 
                          width: `${system.memory ?? 0}%`,
                          bgcolor: (system.memory ?? 0) > 80 ? 'error.main' : 
                                  (system.memory ?? 0) > 50 ? 'warning.main' : 'success.main'
                        }} 
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Disk Usage */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.main', color: 'white', mr: 2 }}>
                    <FiServer size={24} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.dashboard.system.disk')}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {system.disk ?? 0}%
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          borderRadius: 4, 
                          width: `${system.disk ?? 0}%`,
                          bgcolor: (system.disk ?? 0) > 80 ? 'error.main' : 
                                  (system.disk ?? 0) > 50 ? 'warning.main' : 'success.main'
                        }} 
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Additional System Info */}
          <Grid item xs={12}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.dashboard.system.uptime')}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {system.uptime ?? 0} {t('admin.dashboard.system.days')}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.dashboard.system.temperature')}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {system.temperature ?? 0}°C
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.dashboard.system.services')}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {services.active ?? 0}/{services.total ?? 0}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.dashboard.system.lastReboot')}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {system.lastReboot ? new Date(system.lastReboot).toLocaleDateString() : ''}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FiArrowLeft className="text-green-500 mr-1" />
                    <Typography variant="body2" fontWeight="medium">
                      {t('admin.dashboard.system.networkIn')}: {network.in ?? 0} Mbps
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FiArrowRight className="text-blue-500 mr-1" />
                    <Typography variant="body2" fontWeight="medium">
                      {t('admin.dashboard.system.networkOut')}: {network.out ?? 0} Mbps
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  const renderActivityStream = () => (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        {t('admin.dashboard.sections.recentActivity')}
      </Typography>
      
      <Card sx={{ flexGrow: 1 }}>
        <CardContent sx={{ height: '100%' }}>
          {dashboardData.recentActivity.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FiActivity size={40} className="mx-auto mb-2 opacity-30" />
              <Typography variant="body1" color="text.secondary">
                {t('admin.dashboard.noActivity')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: '100%', overflowY: 'auto' }}>
              {dashboardData.recentActivity.map((activity, index) => (
                <Box key={activity.id} sx={{ 
                  display: 'flex', 
                  py: 2, 
                  borderBottom: index < dashboardData.recentActivity.length - 1 ? 
                    `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none' 
                }}>
                  <Box sx={{ mr: 2 }}>
                    {activity.icon || <FiActivity className="text-blue-500" />}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">
                      {activity.message || activity.action}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  {activity.actionable && (
                    <Button size="small">
                      {t('admin.dashboard.view')}
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
  
  const renderTeamEvents = () => {
    const today = new Date();
    
    const events = Array(3).fill().map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() + i);
      return { 
        id: `event-${i}`,
        title: `Team Meeting ${i + 1}`,
        date: date.toISOString(),
        attendees: Math.floor(Math.random() * 10) + 5
      };
    });
    
    return (
      <Box sx={{ 
        width: '100vw', 
        height: '100vh', 
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Typography variant="h4" fontWeight="bold" mb={4}>
          {t('admin.dashboard.sections.teamAndEvents')}
        </Typography>
        
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          {/* Upcoming Events */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  {t('admin.dashboard.upcomingEvents')}
                </Typography>
                
                {events.map((event) => (
                  <Paper
                    key={event.id}
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {event.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(event.date).toLocaleDateString()} • {event.attendees} {t('admin.dashboard.attendees')}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined">
                        {t('admin.dashboard.viewDetails')}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Team Status */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="medium" mb={3}>
                  {t('admin.dashboard.teamStatus')}
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">
                      {t('admin.dashboard.activeMembers')}
                    </Typography>
                    <Chip
                      label={`${dashboardData.users.active}/${dashboardData.users.total}`}
                      color="success"
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">
                      {t('admin.dashboard.projectProgress')}
                    </Typography>
                    <Chip
                      label={`${Math.round((dashboardData.projects.completed / dashboardData.projects.total) * 100)}%`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">
                      {t('admin.dashboard.taskCompletion')}
                    </Typography>
                    <Chip
                      label={`${Math.round((dashboardData.tasks.completed / dashboardData.tasks.total) * 100)}%`}
                      color="secondary"
                      size="small"
                    />
                  </Box>
                </Stack>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ textAlign: 'center' }}>
                  <Button 
                    variant="contained" 
                    sx={{ borderRadius: 2, mt: 1 }}
                    onClick={() => onNavigate && onNavigate('/admin/user-management')}
                  >
                    {t('admin.dashboard.manageTeam')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderNavigationDots = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      position: 'fixed', 
      bottom: 20, 
      left: 0, 
      right: 0,
      zIndex: 1000
    }}>
      {slides.map((_, index) => (
        <Box
          key={index}
          onClick={() => scrollToSlide(index)}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: currentSlide === index ? 'primary.main' : 'grey.500',
            mx: 1,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        />
      ))}
    </Box>
  );

  const slides = [
    { id: 'metrics', component: renderKeyMetrics() },
    { id: 'charts', component: renderActivityCharts() },
    { id: 'system', component: renderSystemHealth() },
    { id: 'activity', component: renderActivityStream() },
    { id: 'team', component: renderTeamEvents() }
  ];

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: theme === 'dark' ? 'background.default' : 'background.paper'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        flexDirection: 'column',
        bgcolor: theme === 'dark' ? 'background.default' : 'background.paper'
      }}>
        <Typography variant="h6" color="error" gutterBottom>
          {t('admin.dashboard.loadError')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchDashboardData();
          }}
          startIcon={<FiRefreshCw />}
        >
          {t('admin.dashboard.retry')}
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box
        ref={scrollContainerRef}
        sx={{
          width: '100vw',
          height: '100vh',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          display: 'flex',
          bgcolor: theme === 'dark' ? 'background.default' : 'background.paper',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            }
          }
        }}
      >
        {slides.map((slide) => (
          <Box 
            key={slide.id}
            sx={{ 
              width: '100vw',
              height: '100vh',
              flexShrink: 0,
              scrollSnapAlign: 'start'
            }}
          >
            {slide.component}
          </Box>
        ))}
      </Box>

      {renderNavigationDots()}

      {/* Navigation arrows */}
      <IconButton
        sx={{
          position: 'fixed',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          bgcolor: 'background.paper',
          boxShadow: 3
        }}
        onClick={() => scrollToSlide(Math.max(0, currentSlide - 1))}
        disabled={currentSlide === 0}
      >
        <FiArrowLeft />
      </IconButton>

      <IconButton
        sx={{
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          bgcolor: 'background.paper',
          boxShadow: 3
        }}
        onClick={() => scrollToSlide(Math.min(slides.length - 1, currentSlide + 1))}
        disabled={currentSlide === slides.length - 1}
      >
        <FiArrowRight />
      </IconButton>

      {/* Logout Button */}
      <Button
        variant="contained"
        color="secondary"
        startIcon={<FiLogOut />}
        onClick={handleLogout}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1100,
          boxShadow: 2
        }}
      >
        {t('common.logout') || 'Logout'}
      </Button>

      {refreshing && (
        <Box sx={{
          position: 'fixed',
          top: 16,
          right: 100, // Adjusted to not overlap with logout button
          zIndex: 9999,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: '50%',
          boxShadow: 3
        }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </>
  );
};

export default AdminDashboard;