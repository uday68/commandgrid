import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, CircularProgress, Grid, Paper, LinearProgress, 
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, 
  IconButton, TableContainer, Table, TableBody, TableRow, TableCell 
} from '@mui/material';
import { BarChart, Refresh, BugReport, Error, MoreVert, CheckCircle, Info } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatDistanceToNow, formatDistance } from 'date-fns';
import { alpha } from '@mui/material/styles';
import { t } from 'i18next';
import axios from 'axios';

const SystemStatus = ({ theme = 'light' }) => {
  const [systemStatus, setSystemStatus] = useState({
    uptime: '23d 4h 12m',
    lastReboot: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
    cpu: 32,
    memory: 64,
    disk: 43,
    network: { in: '12.4 MB/s', out: '3.8 MB/s' },
    services: [
      { name: 'Database', status: 'online', uptime: '23d 4h 12m' },
      { name: 'API Server', status: 'online', uptime: '23d 4h 12m' },
      { name: 'File Storage', status: 'online', uptime: '23d 4h 12m' },
      { name: 'Backup Service', status: 'online', uptime: '23d 4h 12m' }
    ],
    issues: [
      { id: 1, type: 'warning', message: 'CPU usage spike detected', time: new Date(Date.now() - 45 * 60000) },
      { id: 2, type: 'error', message: 'Database connection timeout', time: new Date(Date.now() - 120 * 60000) },
      { id: 3, type: 'info', message: 'System update available', time: new Date(Date.now() - 240 * 60000) }
    ]
  });
  const [loading, setLoading] = useState(false);

  const refreshData = () => {
    setLoading(true);
    // Simulate data fetching
    setTimeout(() => {
      setSystemStatus({
        ...systemStatus,
        cpu: Math.floor(Math.random() * 40) + 20,
        memory: Math.floor(Math.random() * 30) + 50,
        disk: Math.floor(Math.random() * 20) + 40,
        network: { 
          in: `${(Math.random() * 20).toFixed(1)} MB/s`, 
          out: `${(Math.random() * 10).toFixed(1)} MB/s` 
        }
      });
      setLoading(false);
    }, 2000);
  };

  useEffect(() => {
    refreshData();
    // Set up interval for real-time updates
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'online':
        return theme === 'dark' ? '#4ade80' : '#22c55e';
      case 'warning':
        return theme === 'dark' ? '#facc15' : '#eab308';
      case 'error':
      case 'offline':
        return theme === 'dark' ? '#f87171' : '#ef4444';
      default:
        return theme === 'dark' ? '#a3a3a3' : '#6b7280';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">System Status</Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          onClick={refreshData}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* System metrics */}
        <Grid item xs={12} md={6}>
          <motion.div variants={itemVariants}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'white' 
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>System Metrics</Typography>
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="CPU Usage" 
                    secondary={
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{systemStatus.cpu}%</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {systemStatus.cpu > 80 ? 'High' : systemStatus.cpu > 50 ? 'Moderate' : 'Normal'}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.cpu} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 2,
                            backgroundColor: alpha(theme === 'dark' ? '#334155' : '#e2e8f0', 0.8),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: systemStatus.cpu > 80 
                                ? '#ef4444' 
                                : systemStatus.cpu > 50 
                                ? '#f59e0b' 
                                : '#22c55e'
                            }
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Memory Usage" 
                    secondary={
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{systemStatus.memory}%</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {systemStatus.memory > 80 ? 'High' : systemStatus.memory > 50 ? 'Moderate' : 'Normal'}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.memory} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 2,
                            backgroundColor: alpha(theme === 'dark' ? '#334155' : '#e2e8f0', 0.8),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: systemStatus.memory > 80 
                                ? '#ef4444' 
                                : systemStatus.memory > 50 
                                ? '#f59e0b' 
                                : '#22c55e'
                            }
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Disk Usage" 
                    secondary={
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{systemStatus.disk}%</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {systemStatus.disk > 80 ? 'High' : systemStatus.disk > 50 ? 'Moderate' : 'Normal'}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.disk} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 2,
                            backgroundColor: alpha(theme === 'dark' ? '#334155' : '#e2e8f0', 0.8),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: systemStatus.disk > 80 
                                ? '#ef4444' 
                                : systemStatus.disk > 50 
                                ? '#f59e0b' 
                                : '#22c55e'
                            }
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              </List>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium">Network</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 1.5, 
                        textAlign: 'center',
                        bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Inbound</Typography>
                      <Typography variant="h6">{systemStatus.network.in}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 1.5, 
                        textAlign: 'center',
                        bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Outbound</Typography>
                      <Typography variant="h6">{systemStatus.network.out}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium">System Info</Typography>
                <TableContainer component={Paper} sx={{ mt: 1, bgcolor: 'transparent', boxShadow: 'none' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row" sx={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                          Uptime
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                          {systemStatus.uptime}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row" sx={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                          Last Reboot
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                          {formatDistanceToNow(systemStatus.lastReboot, { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>
          </motion.div>
        </Grid>
        
        {/* Services status */}
        <Grid item xs={12} md={6}>
          <motion.div variants={itemVariants}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                bgcolor: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'white',
                height: '100%'
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>Services Status</Typography>
              
              <List>
                {systemStatus.services.map((service, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: getStatusColor(service.status),
                          boxShadow: `0 0 10px ${getStatusColor(service.status)}`
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={service.name}
                      secondary={`Uptime: ${service.uptime}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small">
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>Recent Issues</Typography>
                
                {systemStatus.issues.length > 0 ? (
                  <List>
                    {systemStatus.issues.map(issue => (
                      <ListItem key={issue.id}>
                        <ListItemIcon>
                          {issue.type === 'error' && <Error color="error" />}
                          {issue.type === 'warning' && <BugReport color="warning" />}
                          {issue.type === 'info' && <Info color="info" />}
                        </ListItemIcon>
                        <ListItemText 
                          primary={issue.message}
                          secondary={formatDistanceToNow(issue.time, { addSuffix: true })}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography>No issues detected</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default SystemStatus;