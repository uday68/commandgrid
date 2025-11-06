import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Add as AddIcon
} from '@mui/icons-material';
import useUserManagement from '../../hooks/useUserManagement';

const UserProfile = ({ userId }) => {
  const { t } = useTranslation();
  const { 
    currentUser, 
    fetchCurrentUser, 
    updateProfile,
    getUserSkills, 
    addUserSkill,
    removeUserSkill,
    loading 
  } = useUserManagement();
  
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ skill_name: '', experience_level: 'Beginner' });
  const [addSkillDialogOpen, setAddSkillDialogOpen] = useState(false);
  
  // Load current user data if not specified userId, or fetch the specified user
  useEffect(() => {
    const loadUserData = async () => {
      await fetchCurrentUser();
    };
    
    loadUserData();
  }, [fetchCurrentUser, userId]);
  
  // Fill form with current user data when it changes
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        time_zone: currentUser.time_zone || 'UTC',
        profilePicture: null, // For file upload
      });
    }
  }, [currentUser]);
  
  // Load user skills
  useEffect(() => {
    const loadSkills = async () => {
      const userSkills = await getUserSkills();
      setSkills(userSkills || []);
    };
    
    loadSkills();
  }, [getUserSkills]);
  
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setProfileData({
        ...profileData,
        profilePicture: event.target.files[0],
        profilePicturePreview: URL.createObjectURL(event.target.files[0])
      });
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
  const handleAddSkill = async () => {
    try {
      await addUserSkill({
        user_id: currentUser?.user_id,
        ...newSkill
      });
      
      // Refresh skills
      const userSkills = await getUserSkills();
      setSkills(userSkills || []);
      
      // Reset form and close dialog
      setNewSkill({ skill_name: '', experience_level: 'Beginner' });
      setAddSkillDialogOpen(false);
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };
  
  const handleRemoveSkill = async (skillId) => {
    try {
      await removeUserSkill(skillId);
      
      // Refresh skills
      const userSkills = await getUserSkills();
      setSkills(userSkills || []);
    } catch (error) {
      console.error('Error removing skill:', error);
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading profile...</Typography>
      </Box>
    );
  }
  
  if (!currentUser) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="error">
          {t('profile.userNotFound')}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Card variant="outlined" sx={{ maxWidth: 800, mx: 'auto', mt: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            {t('profile.title')}
          </Typography>
          
          {!editMode ? (
            <Button 
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
              variant="contained"
              color="primary"
            >
              {t('common.edit')}
            </Button>
          ) : (
            <Box>
              <Button 
                startIcon={<CancelIcon />}
                onClick={() => setEditMode(false)}
                variant="outlined"
                color="secondary"
                sx={{ mr: 1 }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                variant="contained"
                color="primary"
              >
                {t('common.save')}
              </Button>
            </Box>
          )}
        </Box>
        
        <Grid container spacing={4}>
          {/* Profile Photo */}
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Avatar 
              src={
                profileData.profilePicturePreview || 
                currentUser.profile_picture || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || '')}&size=200`
              }
              sx={{ width: 150, height: 150, mx: 'auto', mb: 2 }}
            />
            
            {editMode && (
              <Box mb={2}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-photo-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="profile-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                  >
                    {t('profile.changePhoto')}
                  </Button>
                </label>
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary">
              {t('profile.role')}: <Chip label={currentUser.role} color="primary" size="small" />
            </Typography>
          </Grid>
          
          {/* User Details */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('profile.name')}
                  name="name"
                  value={profileData.name || ''}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant={editMode ? "outlined" : "filled"}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('profile.email')}
                  name="email"
                  type="email"
                  value={profileData.email || ''}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant={editMode ? "outlined" : "filled"}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile.phone')}
                  name="phone"
                  value={profileData.phone || ''}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant={editMode ? "outlined" : "filled"}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label={t('profile.timeZone')}
                  name="time_zone"
                  value={profileData.time_zone || 'UTC'}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant={editMode ? "outlined" : "filled"}
                >
                  <MenuItem value="UTC">UTC (Coordinated Universal Time)</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                  <MenuItem value="Asia/Kolkata">India Standard Time (IST)</MenuItem>
                  <MenuItem value="Europe/London">Greenwich Mean Time (GMT)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Skills Section */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">{t('profile.skills')}</Typography>
              <Button 
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setAddSkillDialogOpen(true)}
                variant="outlined"
              >
                {t('profile.addSkill')}
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {skills.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('profile.noSkills')}
                </Typography>
              ) : (
                skills.map((skill) => (
                  <Chip
                    key={skill.skill_id}
                    label={`${skill.skill_name} (${skill.experience_level})`}
                    onDelete={() => handleRemoveSkill(skill.skill_id)}
                    color="primary"
                    variant="outlined"
                  />
                ))
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      
      {/* Add Skill Dialog */}
      <Dialog open={addSkillDialogOpen} onClose={() => setAddSkillDialogOpen(false)}>
        <DialogTitle>{t('profile.addNewSkill')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="skill_name"
            name="skill_name"
            label={t('profile.skillName')}
            fullWidth
            variant="outlined"
            value={newSkill.skill_name}
            onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>{t('profile.experienceLevel')}</InputLabel>
            <Select
              value={newSkill.experience_level}
              label={t('profile.experienceLevel')}
              onChange={(e) => setNewSkill({ ...newSkill, experience_level: e.target.value })}
            >
              <MenuItem value="Beginner">Beginner</MenuItem>
              <MenuItem value="Intermediate">Intermediate</MenuItem>
              <MenuItem value="Advanced">Advanced</MenuItem>
              <MenuItem value="Expert">Expert</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSkillDialogOpen(false)} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleAddSkill} 
            color="primary"
            disabled={!newSkill.skill_name}
          >
            {t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UserProfile;
