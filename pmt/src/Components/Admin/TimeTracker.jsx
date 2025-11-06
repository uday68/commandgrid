import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select,
  MenuItem, Divider, Stack, Chip, Alert
} from '@mui/material';
import {
  FiClock, FiPlay, FiPause, FiStopCircle, FiPlus,
  FiEdit2, FiTrash2, FiBarChart2, FiCalendar, FiDownload
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, addDays, addHours, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DatePickerProvider } from '../../utils/datePickerUtils';

const TimeTracker = ({ projects = [], theme = 'light', highContrast = false }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [totalTimeToday, setTotalTimeToday] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // Track active timer state
  const [activeTimer, setActiveTimer] = useState({
    startTime: null,
    elapsedTime: 0,
    projectId: '',
    description: ''
  });
  
  // Form state for new time entry
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    date: new Date(),
    hours: 0,
    description: ''
  });
  
  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      const mockTimeEntries = [];
      const now = new Date();
      
      // Generate some mock time entries for the past week
      for (let i = 0; i < 10; i++) {
        const date = addDays(now, -Math.floor(Math.random() * 7));
        const hours = Math.floor(Math.random() * 8) + 1;
        const projectIndex = Math.floor(Math.random() * projects.length);
        
        mockTimeEntries.push({
          id: `time-${i}`,
          project_id: projects[projectIndex]?.project_id || 'project-1',
          project_name: projects[projectIndex]?.name || `Project ${i + 1}`,
          date: format(date, 'yyyy-MM-dd'),
          start_time: format(date, 'HH:mm'),
          end_time: format(addHours(date, hours), 'HH:mm'),
          hours,
          description: `Work on ${['documentation', 'development', 'design', 'meetings', 'testing'][Math.floor(Math.random() * 5)]}`
        });
      }
      
      setTimeEntries(mockTimeEntries);
      
      // Calculate totals
      const total = mockTimeEntries.reduce((acc, entry) => acc + entry.hours, 0);
      setTotalTime(total);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayTotal = mockTimeEntries
        .filter(entry => entry.date === today)
        .reduce((acc, entry) => acc + entry.hours, 0);
      setTotalTimeToday(todayTotal);
      
      setLoading(false);
    }, 1000);
  }, [projects]);

  // Format duration (e.g., 2.5 -> "2h 30m")
  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };
  
  const handleStartTimer = () => {
    setIsTracking(true);
    setActiveTimer({
      ...activeTimer,
      startTime: new Date(),
      elapsedTime: 0
    });
    
    // Start timer interval
  };
  
  const handleStopTimer = () => {
    setIsTracking(false);
    
    // Calculate elapsed time and add a new entry
    const elapsed = activeTimer.elapsedTime / 3600; // convert seconds to hours
    
    // Add the new entry
    const newTimeEntry = {
      id: `time-${Date.now()}`,
      project_id: activeTimer.projectId,
      project_name: projects.find(p => p.project_id === activeTimer.projectId)?.name || 'Unknown Project',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: format(activeTimer.startTime, 'HH:mm'),
      end_time: format(new Date(), 'HH:mm'),
      hours: elapsed,
      description: activeTimer.description
    };
    
    setTimeEntries([newTimeEntry, ...timeEntries]);
    setTotalTime(totalTime + elapsed);
    setTotalTimeToday(totalTimeToday + elapsed);
    
    // Reset the timer
    setActiveTimer({
      startTime: null,
      elapsedTime: 0,
      projectId: '',
      description: ''
    });
    
    // Clear timer interval
  };
  
  const handleAddEntry = () => {
    setOpenDialog(true);
  };
  
  const handleSaveEntry = () => {
    // Add the new manual entry
    const newTimeEntry = {
      id: `time-${Date.now()}`,
      project_id: newEntry.projectId,
      project_name: projects.find(p => p.project_id === newEntry.projectId)?.name || 'Unknown Project',
      date: format(newEntry.date, 'yyyy-MM-dd'),
      hours: parseFloat(newEntry.hours),
      description: newEntry.description
    };
    
    setTimeEntries([newTimeEntry, ...timeEntries]);
    setTotalTime(totalTime + parseFloat(newEntry.hours));
    
    if (format(newEntry.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      setTotalTimeToday(totalTimeToday + parseFloat(newEntry.hours));
    }
    
    // Reset form and close dialog
    setNewEntry({
      projectId: '',
      date: new Date(),
      hours: 0,
      description: ''
    });
    
    setOpenDialog(false);
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
      border: highContrast ? 'border-black' : 'border-gray-200'
    },
    dark: {
      bg: highContrast ? 'bg-black' : 'bg-gray-900',
      card: highContrast ? 'bg-black' : 'bg-gray-800',
      text: highContrast ? 'text-white' : 'text-gray-100',
      border: highContrast ? 'border-white' : 'border-gray-700'
    }
  }[theme];
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (timeEntries.length === 0 && !isTracking) {
    return (
      <Alert 
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleAddEntry}>
            {t('timeTracker.addEntry')}
          </Button>
        }
      >
        {t('timeTracker.noEntries')}
      </Alert>
    );
  }
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Time Tracker Controls */}
      <motion.div variants={itemVariants}>
        <Card className={`${themeStyles.card} border ${themeStyles.border} mb-4`}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {t('timeTracker.title')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FormControl fullWidth sx={{ mr: 2 }}>
                    <InputLabel>{t('timeTracker.project')}</InputLabel>
                    <Select
                      value={activeTimer.projectId}
                      onChange={(e) => setActiveTimer({ ...activeTimer, projectId: e.target.value })}
                      label={t('timeTracker.project')}
                      disabled={isTracking}
                    >
                      <MenuItem value="">{t('timeTracker.selectProject')}</MenuItem>
                      {projects.map((project) => (
                        <MenuItem key={project.project_id} value={project.project_id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label={t('timeTracker.description')}
                    value={activeTimer.description}
                    onChange={(e) => setActiveTimer({ ...activeTimer, description: e.target.value })}
                    disabled={isTracking}
                    fullWidth
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                    <FiClock style={{ marginRight: 8 }} />
                    {formatDuration(activeTimer.elapsedTime / 3600)}
                  </Typography>
                  
                  <Box>
                    {!isTracking ? (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<FiPlay />}
                        onClick={handleStartTimer}
                        disabled={!activeTimer.projectId}
                        sx={{ borderRadius: 2 }}
                      >
                        {t('timeTracker.start')}
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<FiPause />}
                          sx={{ borderRadius: 2 }}
                        >
                          {t('timeTracker.pause')}
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<FiStopCircle />}
                          onClick={handleStopTimer}
                          sx={{ borderRadius: 2 }}
                        >
                          {t('timeTracker.stop')}
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('timeTracker.todayTotal')}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatDuration(totalTimeToday)}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('timeTracker.weekTotal')}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatDuration(totalTime)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<FiBarChart2 />}
                    sx={{ mr: 1, borderRadius: 2 }}
                  >
                    {t('timeTracker.reports')}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FiPlus />}
                    onClick={handleAddEntry}
                    sx={{ borderRadius: 2 }}
                  >
                    {t('timeTracker.addEntry')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Recent Time Entries */}
      <motion.div variants={itemVariants}>
        <Card className={`${themeStyles.card} border ${themeStyles.border}`}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                {t('timeTracker.recentEntries')}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePickerProvider>
                  <DatePicker
                    slotProps={{ textField: { size: 'small' } }}
                    label={t('timeTracker.from')}
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                  />
                  <DatePicker
                    slotProps={{ textField: { size: 'small' } }}
                    label={t('timeTracker.to')}
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                  />
                </DatePickerProvider>
                
                <Button
                  variant="outlined"
                  startIcon={<FiDownload />}
                  sx={{ borderRadius: 2 }}
                >
                  {t('timeTracker.export')}
                </Button>
              </Box>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('timeTracker.date')}</TableCell>
                    <TableCell>{t('timeTracker.project')}</TableCell>
                    <TableCell>{t('timeTracker.description')}</TableCell>
                    <TableCell align="right">{t('timeTracker.time')}</TableCell>
                    <TableCell align="center">{t('timeTracker.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeEntries.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FiCalendar style={{ marginRight: 8, opacity: 0.7 }} />
                          {entry.date}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.project_name} 
                          size="small"
                          sx={{ 
                            borderRadius: 1,
                            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                            color: theme === 'dark' ? '#93c5fd' : '#3b82f6'
                          }}
                        />
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatDuration(entry.hours)}
                        </Typography>
                        {entry.start_time && entry.end_time && (
                          <Typography variant="caption" color="text.secondary">
                            {entry.start_time} - {entry.end_time}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <FiEdit2 fontSize="inherit" />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <FiTrash2 fontSize="inherit" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Add Time Entry Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('timeTracker.addManualEntry')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel>{t('timeTracker.project')}</InputLabel>
                  <Select
                    value={newEntry.projectId}
                    onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
                    label={t('timeTracker.project')}
                  >
                    <MenuItem value="">{t('timeTracker.selectProject')}</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.project_id} value={project.project_id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePickerProvider>
                  <DatePicker
                    label={t('timeTracker.date')}
                    value={newEntry.date}
                    onChange={(newValue) => setNewEntry({ ...newEntry, date: newValue })}
                    slotProps={{ textField: { fullWidth: true, sx: { mt: 1 } } }}
                  />
                </DatePickerProvider>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('timeTracker.description')}
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('timeTracker.hours')}
                  type="number"
                  inputProps={{ step: '0.25', min: '0.25', max: '24' }}
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSaveEntry}
            variant="contained" 
            disabled={!newEntry.projectId || !newEntry.hours}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default TimeTracker;