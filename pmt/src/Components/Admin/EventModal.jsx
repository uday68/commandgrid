import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Chip,
  Grid,
  Stack,
  CircularProgress,
  IconButton,
  Box,
  Avatar,
  AvatarGroup,
  Tooltip,
  Slide
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTime } from 'luxon';
import { 
  FiUser, FiClock, FiMapPin, FiTag, FiBell, FiRepeat, 
  FiTrash2, FiSave, FiX, FiAlertCircle, FiCalendar,
  FiPlus, FiUsers
} from 'react-icons/fi';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

// Transition for the dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const EventModal = ({ 
  open, 
  onClose, 
  event, 
  slot, 
  projects, 
  users, 
  currentUser,
  timezone,
  onSave 
}) => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1)),
    allDay: false,
    projectId: '',
    attendees: [],
    location: '',
    color: '#3B82F6',
    reminders: [30],
    recurrence: null,
    isPrivate: false,
    priority: 2
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#EF4444', label: 'Red' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#6366F1', label: 'Indigo' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
  ];

  const priorityOptions = [
    { value: 1, label: t('priority.critical'), color: '#EF4444', icon: <FiAlertCircle /> },
    { value: 2, label: t('priority.high'), color: '#F59E0B', icon: <FiBell /> },
    { value: 3, label: t('priority.medium'), color: '#3B82F6', icon: <FiTag /> },
    { value: 4, label: t('priority.low'), color: '#10B981', icon: <FiClock /> },
  ];

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start: new Date(event.event_date),
        end: new Date(event.end_date),
        allDay: event.all_day,
        projectId: event.project_id || '',
        attendees: event.attendees?.map(a => a.user_id) || [],
        location: event.location || '',
        color: event.event_color || '#3B82F6',
        reminders: event.reminders?.map(r => r.minutes_before) || [30],
        recurrence: event.recurrence_rule || null,
        isPrivate: event.is_private || false,
        priority: event.priority || 2
      });
      setSelectedColor(event.event_color || '#3B82F6');
    } else if (slot) {
      setFormData(prev => ({
        ...prev,
        start: slot.start,
        end: slot.end,
        allDay: slot.isAllDay
      }));
    } else {
      resetForm();
    }
  }, [event, slot]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1)),
      allDay: false,
      projectId: '',
      attendees: [],
      location: '',
      color: '#3B82F6',
      reminders: [30],
      recurrence: null,
      isPrivate: false,
      priority: 2
    });
    setErrors({});
    setSelectedColor('#3B82F6');
    setConfirmDelete(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleDateChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when date is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  const API = 'http://localhost:5000';

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = t('validation.required');
    if (formData.start > formData.end) newErrors.end = t('validation.endAfterStart');
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        event_date: formData.start,
        end_date: formData.end,
        all_day: formData.allDay,
        project_id: formData.projectId || null,
        attendees: formData.attendees,
        location: formData.location,
        event_color: selectedColor,
        reminders: formData.reminders,
        recurrence_rule: formData.recurrence,
        is_private: formData.isPrivate,
        priority: formData.priority,
        timezone
      };

      if (event) {
        await axios.put(`${API}/api/calendar/${event.event_id}`, payload,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        enqueueSnackbar(t('events.updated'), { 
          variant: 'success',
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'center',
          }, 
        });
      } else {
        await axios.post(`${API}/api/calendar`, payload,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
      });
        enqueueSnackbar(t('events.created'), { 
          variant: 'success',
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'center',
          },
        });
      }
      
      onSave();
      onClose();
    } catch (err) {
      enqueueSnackbar(t('events.failedSave'), { 
        variant: 'error',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'center',
        },
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`${API}/api/calendar/${event.event_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
      );
      enqueueSnackbar(t('events.deleted'), { 
        variant: 'success',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'center',
        },
      });
      onSave();
      onClose();
    } catch (err) {
      enqueueSnackbar(t('events.failedDelete'), { 
        variant: 'error',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'center',
        },
      });
      console.error(err);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const getPriorityData = (priorityValue) => {
    return priorityOptions.find(option => option.value === priorityValue) || priorityOptions[1];
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        elevation: 5,
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        py: 2.5, 
        px: 3, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: selectedColor + '10',
        color: selectedColor
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FiCalendar style={{ marginRight: 12, fontSize: 20 }} />
            <Typography variant="h6" component="span" fontWeight={600}>
              {event ? t('events.edit') : t('events.create')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={loading}>
            <FiX />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ px: 3, py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('events.title')}
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={!!errors.title}
              helperText={errors.title}
              required
              variant="outlined"
              InputProps={{
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('events.description')}
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              variant="outlined"
              InputProps={{
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterLuxon}>
              <DateTimePicker
                label={t('events.start')}
                value={formData.start}
                onChange={(date) => handleDateChange('start', date)}
                disabled={formData.allDay}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    InputProps={{
                      ...params.InputProps,
                      sx: { borderRadius: 2 }
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterLuxon}>
              <DateTimePicker
                label={t('events.end')}
                value={formData.end}
                onChange={(date) => handleDateChange('end', date)}
                disabled={formData.allDay}
                minDateTime={formData.start}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    error={!!errors.end}
                    helperText={errors.end}
                    InputProps={{
                      ...params.InputProps,
                      sx: { borderRadius: 2 }
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.allDay}
                  onChange={handleChange}
                  name="allDay"
                  color="primary"
                />
              }
              label={t('events.allDay')}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}>
              <Chip label={t('events.details')} size="small" />
            </Divider>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{t('events.project')}</InputLabel>
              <Select
                value={formData.projectId}
                onChange={handleChange}
                name="projectId"
                label={t('events.project')}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">{t('common.none')}</MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.project_id} value={project.project_id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('events.location')}
              name="location"
              value={formData.location}
              onChange={handleChange}
              variant="outlined"
              InputProps={{
                startAdornment: <FiMapPin style={{ marginRight: 8, opacity: 0.7 }} />,
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('events.color')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {colorOptions.map((color) => (
                  <Tooltip key={color.value} title={color.label}>
                    <Box
                      component={motion.div}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedColor(color.value)}
                      sx={{
                        width: 30,
                        height: 30,
                        bgcolor: color.value,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: selectedColor === color.value ? '2px solid white' : 'none',
                        boxShadow: selectedColor === color.value ? 
                          `0 0 0 2px ${color.value}` : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{t('events.attendees')}</InputLabel>
              <Select
                multiple
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  attendees: e.target.value
                }))}
                label={t('events.attendees')}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                      {selected.map(userId => {
                        const user = users.find(u => u.user_id === userId);
                        return (
                          <Tooltip key={userId} title={user?.name || userId}>
                            <Avatar 
                              src={user?.profile_picture} 
                              alt={user?.name || userId}
                              sx={{ width: 24, height: 24 }}
                            >
                              {user?.name?.[0] || userId[0]}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                    </AvatarGroup>
                  </Box>
                )}
                sx={{ borderRadius: 2 }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {users.map(user => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar 
                        src={user.profile_picture} 
                        sx={{ width: 32, height: 32, mr: 2 }}
                      >
                        {user.name?.[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {user.role} • {user.email}
                        </Typography>
                      </Box>
                      <Checkbox 
                        edge="end" 
                        checked={formData.attendees.indexOf(user.user_id) > -1}
                        tabIndex={-1}
                        disableRipple
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}>
              <Chip label={t('events.settings')} size="small" />
            </Divider>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{t('events.priority')}</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleChange}
                name="priority"
                label={t('events.priority')}
                sx={{ borderRadius: 2 }}
                renderValue={(value) => (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      component="span" 
                      sx={{ 
                        display: 'inline-block', 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: getPriorityData(value).color,
                        mr: 1 
                      }} 
                    />
                    {getPriorityData(value).label}
                  </Box>
                )}
              >
                {priorityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          color: option.color,
                          display: 'flex',
                          alignItems: 'center',
                          mr: 1
                        }}
                      >
                        {option.icon}
                      </Box>
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{t('events.reminders')}</InputLabel>
              <Select
                multiple
                value={formData.reminders}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  reminders: e.target.value
                }))}
                label={t('events.reminders')}
                sx={{ borderRadius: 2 }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map(minutes => (
                      <Chip 
                        key={minutes} 
                        label={`${minutes} ${t('events.minutesBefore')}`}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value={0}>{t('common.none')}</MenuItem>
                <MenuItem value={5}>{t('events.reminder5')}</MenuItem>
                <MenuItem value={15}>{t('events.reminder15')}</MenuItem>
                <MenuItem value={30}>{t('events.reminder30')}</MenuItem>
                <MenuItem value={60}>{t('events.reminder60')}</MenuItem>
                <MenuItem value={1440}>{t('events.reminder1440')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isPrivate}
                  onChange={handleChange}
                  name="isPrivate"
                  color="primary"
                />
              }
              label={t('events.private')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        {event ? (
          <Button 
            onClick={handleDelete} 
            color="error"
            disabled={loading}
            startIcon={confirmDelete ? <FiAlertCircle /> : <FiTrash2 />}
            variant={confirmDelete ? "contained" : "text"}
            sx={{ borderRadius: 2 }}
          >
            {confirmDelete ? t('common.confirmDelete') : t('common.delete')}
          </Button>
        ) : (
          <Box /> // Empty box to maintain space
        )}
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {t('common.cancel')}
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            color="primary"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <FiSave />}
            sx={{ 
              px: 3,
              borderRadius: 2,
              bgcolor: selectedColor,
              '&:hover': {
                bgcolor: selectedColor + 'dd'
              }
            }}
          >
            {event ? t('common.update') : t('common.create')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

EventModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  event: PropTypes.object,
  slot: PropTypes.object,
  projects: PropTypes.array.isRequired,
  users: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentUser: PropTypes.object.isRequired,
  timezone: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EventModal;
