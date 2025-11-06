import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControlLabel, Checkbox,
  Avatar, Typography, MenuItem, Select, InputLabel, 
  FormControl, Box, Switch, CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { apiClient, auth, db } from './apiClient';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const StyledButton = styled(Button)({
  textTransform: 'none',
  padding: '8px 16px',
});

const MeetingScheduler = ({ open, onClose, onSchedule }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Meeting form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [isPublic, setIsPublic] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetingLink, setMeetingLink] = useState('');

  // Validation
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUserData();
    fetchProjects();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTeams(selectedProject);
    }
  }, [selectedProject]);

  const fetchUserData = async () => {
    try {
      const { data } = await auth.getSession();
      if (data?.session) {
        const { user } = data.session;
        setUser(user);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTeams = async () => {
      try {
        const response = await axios.get('/api/teams', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        setTeams(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      }
    };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await axios.get(`/api/teams/${teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const members = response.data.map(item => ({
        id: item.user_id,
        name: item.name,
        email: item.email,
        profile_picture: item.profile_picture
      }));
      
      setAttendees(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchProjectTeams = async (projectId) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/teams`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const projectTeams = response.data.map(item => ({
        id: item.team_id,
        name: item.name
      }));
      
      setTeams(projectTeams);
      
      if (projectTeams.length > 0) {
        setSelectedTeam(projectTeams[0].id);
      }
    } catch (error) {
      console.error('Error fetching project teams:', error);
    }
  };

  const handleProjectChange = (event) => {
    setSelectedProject(event.target.value);
  };

  const handleTeamChange = (event) => {
    setSelectedTeam(event.target.value);
  };

  const handleAttendeesChange = (event) => {
    setSelectedAttendees(event.target.value);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!title.trim()) errors.title = t('meetings.errors.titleRequired');
    if (!date) errors.date = t('meetings.errors.dateRequired');
    if (!time) errors.time = t('meetings.errors.timeRequired');
    if (duration <= 0) errors.duration = t('meetings.errors.durationInvalid');
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateMeetingLink = () => {
    const meetingId = uuidv4().substring(0, 8);
    return `${window.location.origin}/meeting/${meetingId}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const meetingLink = generateMeetingLink();
      setMeetingLink(meetingLink);
      
      const meeting = {
        title,
        description,
        date,
        time,
        duration,
        is_recurring: isRecurring,
        recurring_pattern: isRecurring ? recurringPattern : null,
        is_public: isPublic,
        project_id: selectedProject || null,
        team_id: selectedTeam || null,
        created_by: user?.id,
        meeting_link: meetingLink,
        created_at: new Date().toISOString(),
        agenda: description, // Use description as agenda
        company_id: user?.company_id
      };
      
      // Send the request to the API endpoint instead of direct DB insert
      const response = await axios.post('/api/meetings', meeting, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (selectedAttendees.length > 0) {
        const meetingId = response.data.meeting.meeting_id;
        
        // Add participants through API instead of direct DB access
        await axios.post(`/api/meetings/${meetingId}/participants`, {
          participants: selectedAttendees
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
      }
      
      onSchedule(response.data.meeting);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      setError(t('meetings.errors.schedulingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setDuration(60);
    setIsRecurring(false);
    setRecurringPattern('weekly');
    setIsPublic(true);
    setSelectedProject('');
    setSelectedTeam('');
    setSelectedAttendees([]);
    setMeetingLink('');
    setFormErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {t('meetings.scheduler.title')}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={t('meetings.scheduler.meetingTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              error={!!formErrors.title}
              helperText={formErrors.title}
              required
            />
          
            <TextField
              fullWidth
              label={t('meetings.scheduler.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <TextField
              label={t('meetings.scheduler.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flexGrow: 1 }}
              error={!!formErrors.date}
              helperText={formErrors.date}
              required
            />
            
            <TextField
              label={t('meetings.scheduler.time')}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flexGrow: 1 }}
              error={!!formErrors.time}
              helperText={formErrors.time}
              required
            />
            
            <TextField
              label={t('meetings.scheduler.duration')}
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              InputLabelProps={{ shrink: true }}
              sx={{ flexGrow: 1 }}
              InputProps={{ 
                endAdornment: <Typography variant="body2">min</Typography>
              }}
              error={!!formErrors.duration}
              helperText={formErrors.duration}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)} 
                />
              }
              label={t('meetings.scheduler.isRecurring')}
            />
            
            {isRecurring && (
              <FormControl sx={{ ml: 2, minWidth: 120 }}>
                <InputLabel>{t('meetings.scheduler.recurringPattern')}</InputLabel>
                <Select
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value)}
                  label={t('meetings.scheduler.recurringPattern')}
                >
                  <MenuItem value="daily">{t('meetings.scheduler.patterns.daily')}</MenuItem>
                  <MenuItem value="weekly">{t('meetings.scheduler.patterns.weekly')}</MenuItem>
                  <MenuItem value="biweekly">{t('meetings.scheduler.patterns.biweekly')}</MenuItem>
                  <MenuItem value="monthly">{t('meetings.scheduler.patterns.monthly')}</MenuItem>
                </Select>
              </FormControl>
            )}
            
            <Box sx={{ ml: 'auto' }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={isPublic} 
                    onChange={(e) => setIsPublic(e.target.checked)} 
                  />
                }
                label={t('meetings.scheduler.isPublic')}
              />
            </Box>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('meetings.scheduler.project')}</InputLabel>
              <Select
                value={selectedProject}
                onChange={handleProjectChange}
                label={t('meetings.scheduler.project')}
              >
                <MenuItem value="">{t('meetings.scheduler.noProject')}</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('meetings.scheduler.team')}</InputLabel>
              <Select
                value={selectedTeam}
                onChange={handleTeamChange}
                label={t('meetings.scheduler.team')}
              >
                <MenuItem value="">{t('meetings.scheduler.noTeam')}</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('meetings.scheduler.attendees')}</InputLabel>
              <Select
                multiple
                value={selectedAttendees}
                onChange={handleAttendeesChange}
                label={t('meetings.scheduler.attendees')}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const attendee = attendees.find(a => a.id === value);
                      return (
                        <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
                          <Avatar 
                            src={attendee?.profile_picture} 
                            alt={attendee?.name}
                            sx={{ width: 24, height: 24 }}
                          />
                          <Typography variant="body2">{attendee?.name}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                    },
                  },
                }}
              >
                {attendees.map((attendee) => (
                  <MenuItem key={attendee.id} value={attendee.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        src={attendee.profile_picture} 
                        alt={attendee.name}
                        sx={{ width: 24, height: 24 }}
                      />
                      <Box>
                        <Typography variant="body2">{attendee.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {attendee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {error && (
            <Box sx={{ mb: 3 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <StyledButton onClick={handleClose}>
            {t('common.cancel')}
          </StyledButton>
          <StyledButton 
            type="submit"
            variant="contained" 
            color="primary"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {t('meetings.scheduler.schedule')}
          </StyledButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MeetingScheduler;