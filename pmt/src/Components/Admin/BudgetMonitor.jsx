import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Grid, Card, CardContent, Typography, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Button, Alert, CircularProgress,
  Chip, IconButton, Menu, MenuItem, Tooltip
} from '@mui/material';
import { 
  FiDollarSign, FiPieChart, FiAlertTriangle, 
  FiTrendingUp, FiTrendingDown, FiMoreVertical, FiDownload
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const BudgetMonitor = ({ projects = [], theme = 'light', highContrast = false }) => {
  const { t } = useTranslation();
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/budget', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setBudgetData(data);
      
      // Calculate summary metrics
      const totalBudgetValue = data.reduce((sum, item) => sum + parseFloat(item.total_budget || 0), 0);
      const totalSpentValue = data.reduce((sum, item) => sum + parseFloat(item.spent || 0), 0);
      const remainingValue = totalBudgetValue - totalSpentValue;
      const percentage = totalBudgetValue > 0 ? Math.round((totalSpentValue / totalBudgetValue) * 100) : 0;
      
      setTotalBudget(totalBudgetValue);
      setTotalSpent(totalSpentValue);
      setTotalRemaining(remainingValue);
      setOverallPercentage(percentage);
        } catch (err) {
      console.error('Error fetching budget data:', err);
      setError('Failed to load budget data. Please try again.');
      
      // Initialize with empty data
      setBudgetData([]);
      setTotalBudget(0);
      setTotalSpent(0);
      setTotalRemaining(0);
      setOverallPercentage(0);
    } finally {
      setLoading(false);
    }
  };
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleExportReport = () => {
    try {
      axios.post('http://localhost:5000/api/budget/report', {
        project_ids: budgetData.map(budget => budget.project_id),
        format: 'csv'
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        responseType: 'blob'
      })
      .then(response => {
        // Create a blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'budget_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
      
      setNotification({
        type: 'success',
        message: 'Budget report exported successfully'
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      setNotification({
        type: 'error',
        message: 'Failed to export budget report'
      });
    }
  };

  // Calculate percentage
  const calculatePercentage = (spent, total) => {
    return Math.min(Math.round((spent / total) * 100), 100);
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

  // Theme styles
  const themeStyles = {
    light: {
      bg: highContrast ? 'bg-white' : 'bg-gray-50',
      card: highContrast ? 'bg-white' : 'bg-white',
      text: highContrast ? 'text-black' : 'text-gray-800',
      border: highContrast ? 'border-black' : 'border-gray-200',
      button: highContrast ? 'bg-black text-white' : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white',
    },
    dark: {
      bg: highContrast ? 'bg-black' : 'bg-gray-900',
      card: highContrast ? 'bg-black' : 'bg-gray-800',
      text: highContrast ? 'text-white' : 'text-gray-100',
      border: highContrast ? 'border-white' : 'border-gray-700',
      button: highContrast ? 'bg-white text-black' : 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white',
    }
  }[theme];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (budgetData.length === 0) {
    return (
      <Alert severity="info">
        {t('budget.noProjects')}
      </Alert>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Budget Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <motion.div variants={itemVariants}>
            <Card className={`${themeStyles.card} border ${themeStyles.border}`}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      display: 'flex',
                      mr: 2
                    }}
                  >
                    <FiDollarSign size={24} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {t('budget.totalBudget')}
                  </Typography>
                </Box>
                
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {formatCurrency(totalBudget)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('budget.acrossProjects', { count: budgetData.length })}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={overallPercentage}
                  sx={{ 
                    height: 8,
                    borderRadius: 2,
                    bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: overallPercentage > 90 ? 'error.main' : 
                               overallPercentage > 70 ? 'warning.main' : 
                               'success.main'
                    }
                  }} 
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('budget.spent')}: {formatCurrency(totalSpent)} 
                    ({overallPercentage}%)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" color={totalRemaining < 0 ? 'error' : 'inherit'}>
                    {t('budget.remaining')}: {formatCurrency(totalRemaining)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={8}>
          <motion.div variants={itemVariants}>
            <Card className={`${themeStyles.card} border ${themeStyles.border} h-100`}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {t('budget.budgetStatus')}
                  </Typography>
                  
                  <Button
                    startIcon={<FiDownload />}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2 }}
                    onClick={handleExportReport}
                  >
                    {t('budget.exportReport')}
                  </Button>
                </Box>
                
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('budget.status')}</TableCell>
                        <TableCell align="right">{t('budget.count')}</TableCell>
                        <TableCell align="right">{t('budget.totalAmount')}</TableCell>
                        <TableCell align="right">{t('budget.percentage')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: 'success.main', 
                              mr: 1, 
                              display: 'inline-block' 
                            }} 
                          />
                          {t('budget.healthy')}
                        </TableCell>
                        <TableCell align="right">
                          {budgetData.filter(p => p.status === 'healthy').length}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            budgetData
                              .filter(p => p.status === 'healthy')
                              .reduce((sum, p) => sum + p.total_budget, 0)
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(
                            (budgetData.filter(p => p.status === 'healthy').length / budgetData.length) * 100
                          )}%
                        </TableCell>
                      </TableRow>
                      
                      <TableRow>
                        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: 'warning.main', 
                              mr: 1, 
                              display: 'inline-block' 
                            }} 
                          />
                          {t('budget.warning')}
                        </TableCell>
                        <TableCell align="right">
                          {budgetData.filter(p => p.status === 'warning').length}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            budgetData
                              .filter(p => p.status === 'warning')
                              .reduce((sum, p) => sum + p.total_budget, 0)
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(
                            (budgetData.filter(p => p.status === 'warning').length / budgetData.length) * 100
                          )}%
                        </TableCell>
                      </TableRow>
                      
                      <TableRow>
                        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: 'error.main', 
                              mr: 1, 
                              display: 'inline-block' 
                            }} 
                          />
                          {t('budget.overbudget')}
                        </TableCell>
                        <TableCell align="right">
                          {budgetData.filter(p => p.status === 'overbudget').length}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            budgetData
                              .filter(p => p.status === 'overbudget')
                              .reduce((sum, p) => sum + p.total_budget, 0)
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(
                            (budgetData.filter(p => p.status === 'overbudget').length / budgetData.length) * 100
                          )}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      
      {/* Project Budget List */}
      <motion.div variants={itemVariants}>
        <Card className={`${themeStyles.card} border ${themeStyles.border} mb-4`}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {t('budget.projectBudgets')}
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('budget.projectName')}</TableCell>
                    <TableCell align="right">{t('budget.budget')}</TableCell>
                    <TableCell align="right">{t('budget.spent')}</TableCell>
                    <TableCell align="right">{t('budget.remaining')}</TableCell>
                    <TableCell align="center">{t('budget.progress')}</TableCell>
                    <TableCell align="center">{t('budget.status')}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {budgetData.map((project) => {
                      const percentage = calculatePercentage(project.spent, project.total_budget);
                      const remaining = project.total_budget - project.spent;
                      
                      return (
                        <TableRow key={project.project_id}>
                          <TableCell>{project.name}</TableCell>
                          <TableCell align="right">{formatCurrency(project.total_budget)}</TableCell>
                          <TableCell align="right">{formatCurrency(project.spent)}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              {remaining < 0 ? (
                                <FiTrendingDown color="error" style={{ marginRight: 4 }} />
                              ) : (
                                <FiTrendingUp color="success" style={{ marginRight: 4 }} />
                              )}
                              <Typography 
                                color={remaining < 0 ? 'error' : 'success.main'} 
                                fontWeight={500}
                              >
                                {formatCurrency(remaining)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  sx={{
                                    height: 8,
                                    borderRadius: 2,
                                    bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: percentage > 90 ? 'error.main' : 
                                              percentage > 70 ? 'warning.main' : 
                                              'success.main'
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {percentage}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                project.status === 'overbudget' ? t('budget.overbudget') :
                                project.status === 'warning' ? t('budget.warning') :
                                t('budget.healthy')
                              }
                              color={
                                project.status === 'overbudget' ? 'error' :
                                project.status === 'warning' ? 'warning' :
                                'success'
                              }
                              size="small"
                              sx={{ borderRadius: 1 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(event) => handleMenuClick(event)}
                            >
                              <FiMoreVertical />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 200, borderRadius: 2 }
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          {t('budget.viewDetails')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          {t('budget.editBudget')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          {t('budget.downloadReport')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          {t('budget.resetBudget')}
        </MenuItem>
      </Menu>
    </motion.div>
  );
};

export default BudgetMonitor;