import React, { useState, useEffect } from "react";
import {
  Stack,
  Typography,
  Grid,
  Card,
  Paper,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
  Snackbar,
  Alert,
  Box,
  Tooltip,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  CardContent
} from "@mui/material";
import {
  FiShield,
  FiAlertTriangle,
  FiLock,
  FiActivity,
  FiEye,
  FiUserX,
  FiClock,
  FiRefreshCw,
  FiExternalLink,
  FiBell,
  FiCheckCircle,
  FiBarChart
} from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, Legend } from "recharts";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from 'framer-motion';

// Define themes and default font with enhanced styles
const themes = {
  light: {
    bg: "bg-gradient-to-br from-gray-50 to-blue-50",
    card: "bg-white",
    text: "text-gray-800",
    header: "bg-white",
    border: "border-gray-200",
    button: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
    shadow: "shadow-lg shadow-blue-100",
    glassEffect: "backdrop-blur-md bg-white/70",
    highlight: "bg-blue-50"
  },
  dark: {
    bg: "bg-gradient-to-br from-gray-900 to-gray-800",
    card: "bg-gray-800",
    text: "text-blue-100",
    header: "bg-gray-800",
    border: "border-gray-700",
    button: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white",
    shadow: "shadow-lg shadow-gray-900/50",
    glassEffect: "backdrop-blur-md bg-gray-800/70",
    highlight: "bg-gray-700"
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    card: "bg-white",
    text: "text-blue-900",
    header: "bg-blue-100",
    border: "border-blue-200",
    button: "bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white",
    shadow: "shadow-lg shadow-blue-200",
    glassEffect: "backdrop-blur-md bg-white/70",
    highlight: "bg-blue-50"
  },
};

const SecurityDashboard = ({ theme = "light", font = "font-sans" }) => {
  const [securityData, setSecurityData] = useState({
    audits: [],
    threats: [],
    vulnerabilities: [],
    metrics: {},
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Determine current theme
  const currentTheme = themes[theme];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
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
  };  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const token = localStorage.getItem("authToken");
      const [auditsRes, threatsRes, vulnRes, metricsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/security/audits", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/security/threats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/security/vulnerabilities", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/security/metrics", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);      // Ensure each property is an array even if API returns different structure
      setSecurityData({
        audits: Array.isArray(auditsRes.data) ? auditsRes.data : [],
        threats: Array.isArray(threatsRes.data) ? threatsRes.data : [],
        vulnerabilities: Array.isArray(vulnRes.data) ? vulnRes.data : [],
        metrics: metricsRes.data || {},
      });
      
      setNotification({
        type: "success",
        message: "Security data updated successfully",
      });
    } catch (err) {
      console.error("Security data fetch error:", err);
      setNotification({
        type: "error",
        message: "Failed to fetch security data.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sample data generators for demo/testing
  const generateSampleAuditData = () => {
    const eventTypes = ['login_success', 'login_failed', 'role_change', 'password_change', 'file_upload', 'file_download', 'user_creation'];
    const users = ['john.doe@example.com', 'jane.smith@example.com', 'admin@example.com', 'developer@example.com'];
    const ipAddresses = ['192.168.1.1', '10.0.0.2', '172.16.0.5', '192.168.0.10'];
    
    return Array(10).fill().map((_, i) => ({
      audit_id: `audit-${i}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      user_email: users[Math.floor(Math.random() * users.length)],
      user_id: `user-${Math.floor(Math.random() * 10)}`,
      ip_address: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
      description: `Sample audit event description ${i+1}`
    }));
  };

  const generateSampleThreats = () => {
    const types = ['Brute Force Attack', 'SQL Injection Attempt', 'Cross-Site Scripting', 'Suspicious Login', 'Malware Detection'];
    const severities = ['low', 'medium', 'high'];
    const ipAddresses = ['45.227.253.72', '195.54.160.149', '103.74.19.104', '91.134.183.168'];
    
    return Array(5).fill().map((_, i) => ({
      threat_id: `threat-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      description: `Potential security threat detected from suspicious IP address`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      ip_address: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));
  };

  const generateSampleVulnerabilities = () => {
    const names = ['Outdated Dependency', 'Insecure API Endpoint', 'Weak Password Policy', 'Missing Authentication', 'Unpatched Server'];
    const severities = ['low', 'medium', 'high'];
    const statuses = ['open', 'in_progress', 'resolved'];
    
    return Array(5).fill().map((_, i) => ({
      vuln_id: `vuln-${i}`,
      name: names[Math.floor(Math.random() * names.length)],
      description: `Security vulnerability that needs to be addressed`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));
  };

  const generateSampleMetrics = () => {
    // Generate trendline data for last 7 days
    const trendData = Array(7).fill().map((_, i) => ({
      date: new Date(Date.now() - (6-i) * 86400000).toLocaleDateString(),
      threats: Math.floor(Math.random() * 5),
      vulnerabilities: Math.floor(Math.random() * 8),
      incidents: Math.floor(Math.random() * 3)
    }));

    return {
      securityScore: Math.floor(Math.random() * 30) + 70, // 70-100 range
      threats: Math.floor(Math.random() * 5) + 2,
      vulnerabilities: Math.floor(Math.random() * 10) + 5,
      incidents: Math.floor(Math.random() * 3),
      auditEvents: Math.floor(Math.random() * 50) + 30,
      lastUpdated: new Date().toISOString(),
      trendData
    };
  };

  // Handler functions for audit logs actions
  const handleViewAudit = (audit) => {
    // Call API to get detailed audit information
    const token = localStorage.getItem("authToken");
    axios.get(`http://localhost:5000/api/security/audits/${audit.audit_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(response => {
      console.log("Audit details:", response.data);
      // Implement modal or detailed view here
    })
    .catch(error => {
      console.error("Error fetching audit details:", error);
      setNotification({
        type: "error",
        message: "Failed to fetch audit details",
      });
    });
  };

  const handleBlockUser = async (userId) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `http://localhost:5000/api/security/block-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotification({
        type: "success",
        message: "User blocked successfully",
      });
      
      // Refresh data to reflect changes
      fetchSecurityData();
    } catch (error) {
      console.error("Error blocking user:", error);
      setNotification({
        type: "error",
        message: "Failed to block user",
      });
    }
  };

  // Render audit logs table
  const renderAuditLogsTable = () => (
    <TableContainer 
      component={motion.div}
      variants={itemVariants}
      className={`${currentTheme.card} ${currentTheme.shadow} rounded-xl overflow-hidden`}
    >
      <Table>
        <TableHead className={`${currentTheme.header} border-b ${currentTheme.border}`}>
          <TableRow>
            <TableCell className="font-semibold">Time</TableCell>
            <TableCell className="font-semibold">Event Type</TableCell>
            <TableCell className="font-semibold">User</TableCell>
            <TableCell className="font-semibold">IP Address</TableCell>
            <TableCell className="font-semibold">Description</TableCell>
            <TableCell className="font-semibold">Actions</TableCell>
          </TableRow>
        </TableHead>        <TableBody>
          {Array.isArray(securityData.audits) && securityData.audits.map((audit, index) => (
            <TableRow 
              key={index} 
              className={`hover:${currentTheme.highlight} transition-colors`}
            >
              <TableCell>
                <div className="flex items-center">
                  <FiClock className="mr-2 text-gray-400" />
                  {formatDistanceToNow(new Date(audit.timestamp), { addSuffix: true })}
                </div>
              </TableCell>
              <TableCell>
                <Chip 
                  label={audit.event_type} 
                  size="small"
                  sx={{ 
                    bgcolor: audit.event_type.includes('login') ? 'info.100' : 
                            audit.event_type.includes('fail') ? 'error.100' : 
                            'success.100',
                    color: audit.event_type.includes('login') ? 'info.700' : 
                           audit.event_type.includes('fail') ? 'error.700' : 
                           'success.700',
                    fontWeight: 500,
                    px: 1
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar
                    src={`https://ui-avatars.com/api/?name=${audit.user_email}&background=random`}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  />
                  {audit.user_email}
                </div>
              </TableCell>
              <TableCell>{audit.ip_address}</TableCell>
              <TableCell>{audit.description}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View details">
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewAudit(audit)}
                      sx={{ 
                        bgcolor: 'primary.50', 
                        color: 'primary.600',
                        '&:hover': { bgcolor: 'primary.100' } 
                      }}
                    >
                      <FiEye size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Block user">
                    <IconButton 
                      size="small" 
                      onClick={() => handleBlockUser(audit.user_id)}
                      sx={{ 
                        bgcolor: 'error.50', 
                        color: 'error.600',
                        '&:hover': { bgcolor: 'error.100' } 
                      }}
                    >
                      <FiUserX size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render threats table
  const renderThreatsTable = () => (
    <TableContainer 
      component={motion.div}
      variants={itemVariants}
      className={`${currentTheme.card} ${currentTheme.shadow} rounded-xl overflow-hidden`}
    >
      <Table size="small">
        <TableHead className={`${currentTheme.header} border-b ${currentTheme.border}`}>
          <TableRow>
            <TableCell className="font-semibold">Type</TableCell>
            <TableCell className="font-semibold">Description</TableCell>
            <TableCell className="font-semibold">Severity</TableCell>
            <TableCell className="font-semibold">IP Address</TableCell>
            <TableCell className="font-semibold">Time</TableCell>
          </TableRow>
        </TableHead>        <TableBody>
          {Array.isArray(securityData.threats) && securityData.threats.map((threat, index) => (
            <TableRow 
              key={index} 
              className={`hover:${currentTheme.highlight} transition-colors`}
            >
              <TableCell>
                <div className="flex items-center">
                  <FiAlertTriangle className={`mr-2 ${
                    threat.severity === 'high' ? 'text-red-500' : 
                    threat.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  {threat.type}
                </div>
              </TableCell>
              <TableCell>{threat.description}</TableCell>
              <TableCell>
                <Chip 
                  label={threat.severity} 
                  size="small"
                  color={
                    threat.severity === 'high' ? 'error' : 
                    threat.severity === 'medium' ? 'warning' : 'info'
                  }
                />
              </TableCell>
              <TableCell>{threat.ip_address}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(threat.created_at), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render vulnerabilities table
  const renderVulnerabilitiesTable = () => (
    <TableContainer 
      component={motion.div}
      variants={itemVariants}
      className={`${currentTheme.card} ${currentTheme.shadow} rounded-xl overflow-hidden`}
    >
      <Table size="small">
        <TableHead className={`${currentTheme.header} border-b ${currentTheme.border}`}>
          <TableRow>
            <TableCell className="font-semibold">Name</TableCell>
            <TableCell className="font-semibold">Description</TableCell>
            <TableCell className="font-semibold">Severity</TableCell>
            <TableCell className="font-semibold">Status</TableCell>
            <TableCell className="font-semibold">Detected</TableCell>
          </TableRow>
        </TableHead>        <TableBody>
          {Array.isArray(securityData.vulnerabilities) && securityData.vulnerabilities.map((vuln, index) => (
            <TableRow 
              key={index} 
              className={`hover:${currentTheme.highlight} transition-colors`}
            >
              <TableCell>
                <div className="flex items-center">
                  <FiShield className={`mr-2 ${
                    vuln.severity === 'high' ? 'text-red-500' : 
                    vuln.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  {vuln.name}
                </div>
              </TableCell>
              <TableCell>{vuln.description}</TableCell>
              <TableCell>
                <Chip 
                  label={vuln.severity} 
                  size="small"
                  color={
                    vuln.severity === 'high' ? 'error' : 
                    vuln.severity === 'medium' ? 'warning' : 'info'
                  }
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={vuln.status} 
                  size="small"
                  color={
                    vuln.status === 'open' ? 'error' : 
                    vuln.status === 'in_progress' ? 'warning' : 'success'
                  }
                />
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(vuln.created_at), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  // Render security metrics dashboard
  const renderSecurityMetrics = () => {
    const { metrics = {} } = securityData;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card className={`${currentTheme.card} ${currentTheme.shadow} rounded-xl p-5 h-full`}>
              <Typography variant="h6" className="flex items-center mb-4 font-bold">
                <FiActivity className="mr-2" />
                Security Score
              </Typography>

              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={200}
                    thickness={5}
                    sx={{ color: (theme) => theme.palette.grey[200], position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={metrics.securityScore || 0}
                    size={200}
                    thickness={5}                    sx={{ 
                      color: (theme) => {
                        const score = metrics.securityScore || 0;
                        return score > 75 ? theme.palette.success.main : 
                               score > 50 ? theme.palette.warning.main : 
                               theme.palette.error.main;
                      },
                      position: 'absolute'
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h3" fontWeight="bold">
                      {metrics.securityScore || 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 4 }}>
                <Typography variant="body2" className="text-center mb-4">
                  Last updated: {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'N/A'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper className={`${currentTheme.card} ${currentTheme.border} border p-3 rounded-lg`}>
                      <Typography variant="subtitle2" className="text-gray-500 mb-1">Threats</Typography>
                      <Typography variant="h6" className="font-bold">{metrics.threats || 0}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper className={`${currentTheme.card} ${currentTheme.border} border p-3 rounded-lg`}>
                      <Typography variant="subtitle2" className="text-gray-500 mb-1">Vulnerabilities</Typography>
                      <Typography variant="h6" className="font-bold">{metrics.vulnerabilities || 0}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper className={`${currentTheme.card} ${currentTheme.border} border p-3 rounded-lg`}>
                      <Typography variant="subtitle2" className="text-gray-500 mb-1">Incidents</Typography>
                      <Typography variant="h6" className="font-bold">{metrics.incidents || 0}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper className={`${currentTheme.card} ${currentTheme.border} border p-3 rounded-lg`}>
                      <Typography variant="subtitle2" className="text-gray-500 mb-1">Audit Events</Typography>
                      <Typography variant="h6" className="font-bold">{metrics.auditEvents || 0}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card className={`${currentTheme.card} ${currentTheme.shadow} rounded-xl p-5 h-full`}>
              <Typography variant="h6" className="flex items-center mb-4 font-bold">
                <FiBarChart className="mr-2" />
                Security Trends
              </Typography>
              
              <Box sx={{ height: 300 }}>
                {metrics.trendData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="threats" stroke="#FF6B6B" />
                      <Line type="monotone" dataKey="vulnerabilities" stroke="#4ECDC4" />
                      <Line type="monotone" dataKey="incidents" stroke="#FFD166" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <FiBarChart size={50} className="text-gray-300" />
                    <Typography color="text.secondary">No trend data available</Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`p-6 ${currentTheme.bg}`}
    >
      <Stack spacing={4} width="100%">
        {/* Header with refresh button */}
        <motion.div variants={itemVariants}>
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
            className={`mb-6 pb-4 border-b ${currentTheme.border}`}
          >
            <Typography variant="h4" component="h1" className="font-bold flex items-center">
              <FiShield className="mr-3" /> Security Dashboard
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={18} /> : <FiRefreshCw />}
              onClick={fetchSecurityData}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </Stack>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Content when loaded */}
        {!loading && (
          <>
            {/* Security metrics overview */}
            <motion.div variants={itemVariants}>
              {renderSecurityMetrics()}
            </motion.div>

            {/* Threats section */}
            <motion.div variants={itemVariants}>
              <Typography variant="h5" className="font-semibold flex items-center mb-3">
                <FiAlertTriangle className="mr-2" /> Security Threats
              </Typography>
              {renderThreatsTable()}
            </motion.div>

            {/* Vulnerabilities section */}
            <motion.div variants={itemVariants}>
              <Typography variant="h5" className="font-semibold flex items-center mb-3 mt-6">
                <FiShield className="mr-2" /> Vulnerabilities
              </Typography>
              {renderVulnerabilitiesTable()}
            </motion.div>

            {/* Audit logs section */}
            <motion.div variants={itemVariants}>
              <Typography variant="h5" className="font-semibold flex items-center mb-3 mt-6">
                <FiActivity className="mr-2" /> Audit Logs
              </Typography>
              {renderAuditLogsTable()}
            </motion.div>
          </>
        )}
      </Stack>

      {/* Notification snackbar */}
      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification && (
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </motion.div>
  );
};

export default SecurityDashboard;
