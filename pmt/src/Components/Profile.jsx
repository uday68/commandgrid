import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Grid,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Box,
  useMediaQuery,
  Chip,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  CameraAlt as CameraAltIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  CalendarToday as DateIcon,
  Language as LanguageIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// --- Modern Styled Components with Glass Morphism ---
const ProfileContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
  padding: theme.spacing(4),
  backdropFilter: 'blur(8px)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    backdropFilter: 'blur(4px)'
  }
}));

const ProfileCard = styled(Paper)(({ theme }) => ({
  maxWidth: 1200,
  margin: '0 auto',
  padding: theme.spacing(6),
  borderRadius: '24px',
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.dark, 0.1)}`,
  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.85)}, ${alpha(theme.palette.background.paper, 0.95)})`,
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    borderRadius: '16px'
  }
}));

const AvatarWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 180,
  height: 180,
  margin: '0 auto',
  marginBottom: theme.spacing(4),
  borderRadius: '50%',
  border: `4px solid ${alpha(theme.palette.background.paper, 0.8)}`,
  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.dark, 0.15)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.2)}`,
    '& .MuiAvatar-root': {
      transform: 'scale(1.03)'
    }
  }
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: '100%',
  height: '100%',
  transition: 'transform 0.3s ease, filter 0.3s ease',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  fontSize: 72,
  filter: 'saturate(1.1) contrast(1.1)',
  '&:hover': {
    filter: 'saturate(1.2) contrast(1.2)'
  }
}));

const CameraButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: 10,
  right: 10,
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  color: theme.palette.primary.main,
  width: 44,
  height: 44,
  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.dark, 0.15)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    transform: 'scale(1.1)'
  }
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(4),
  fontSize: '1.5rem',
  position: 'relative',
  display: 'inline-block',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -12,
    left: 0,
    width: 48,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  '&:hover::after': {
    width: 64
  }
}));

const InfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  padding: theme.spacing(3),
  borderRadius: '16px',
  background: alpha(theme.palette.background.paper, 0.6),
  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.dark, 0.05)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.1)}`,
    background: alpha(theme.palette.background.paper, 0.8)
  }
}));

const InfoIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 56,
  height: 56,
  borderRadius: '16px',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
  marginRight: theme.spacing(3),
  color: theme.palette.primary.main,
  transition: 'all 0.3s ease',
  '& svg': {
    fontSize: '1.75rem'
  },
  '&:hover': {
    transform: 'rotate(10deg) scale(1.1)',
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.secondary.main, 0.2)})`
  }
}));

const EditButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(4),
  right: theme.spacing(4),
  borderRadius: '12px',
  fontWeight: 700,
  textTransform: 'none',
  padding: theme.spacing(1.5, 4),
  fontSize: '1rem',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)}, ${alpha(theme.palette.secondary.main, 0.9)})`,
  color: theme.palette.primary.contrastText,
  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.dark, 0.2)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.dark, 0.3)}`,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 3),
    fontSize: '0.875rem'
  }
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  '& .MuiTabs-indicator': {
    height: 4,
    borderRadius: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  },
  '& .MuiTabScrollButton-root': {
    width: 48,
    color: theme.palette.text.primary
  }
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '1.1rem',
  minWidth: 120,
  minHeight: 48,
  marginRight: theme.spacing(4),
  color: theme.palette.text.secondary,
  transition: 'all 0.3s ease',
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 700
  },
  '&:hover': {
    color: theme.palette.primary.main,
    transform: 'translateY(-2px)'
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: 80,
    fontSize: '0.875rem',
    marginRight: theme.spacing(2)
  }
}));

const SkillChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1rem',
  padding: theme.spacing(1, 2),
  borderRadius: '12px',
  background: alpha(theme.palette.primary.light, 0.1),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: alpha(theme.palette.primary.light, 0.2),
    transform: 'translateY(-2px)'
  },
  '& .MuiChip-label': {
    padding: theme.spacing(0, 0.5)
  }
}));

// --- Main Component with Modern Aesthetic ---
const Profile = ({ onClose }) => {
  const { t } = useTranslation(['profile', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState({
    profile: true,
    saving: false,
    avatar: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    company: '',
    joinDate: '',
    language: 'en',
    role: 'Member',
    skills: ['Project Management', 'UI/UX', 'React', 'JavaScript', 'Team Leadership'],
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const getProfilePictureUrl = (url) => {
    if (!url) return null;
    try {
      // If it's already an absolute URL, return it
      if (url.startsWith('http')) return url;
      // If it's a relative URL, make it absolute
      return `http://localhost:5000${url}`;
    } catch (error) {
      console.error('Error processing profile picture URL:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(prev => ({ ...prev, profile: true }));
        
        // Use the new general profile endpoint
        console.log('Fetching current user profile...');
        
        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.data?.profile) {
          const userData = response.data.profile;
          console.log('Profile data received:', userData);
          
          // Save userId to localStorage if available and valid
          if (userData.id || userData.user_id) {
            const userId = userData.id || userData.user_id;
            // Ensure the userId is not null or undefined before saving
            if (userId && userId !== 'null' && userId !== 'undefined') {
              localStorage.setItem('userId', userId);
              console.log('User ID saved to localStorage:', userId);
            } else {
              console.warn('Invalid user ID detected:', userId);
            }
          } else {
            console.warn('No user ID found in profile data');
          }
          
          // Save userType to localStorage if it can be determined
          if (userData.role) {
            const userType = userData.role.toLowerCase().includes('admin') ? 'admin' : 'user';
            localStorage.setItem('userType', userType);
            console.log('User type determined and saved:', userType);
          }
          
          setProfileData({
            name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            email: userData.email || '',
            phone: userData.phone || '',
            location: userData.location || '',
            company: userData.company?.company_name || '',
            joinDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString() : '',
            language: userData.language || 'English',
            role: userData.role || '',
            skills: userData.skills || ['Project Management', 'UI/UX', 'React'],
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          
          // Set avatar if available
          if (userData.profile_picture) {
            const profilePicUrl = getProfilePictureUrl(userData.profile_picture);
            if (profilePicUrl) {
              console.log('Setting profile picture URL:', profilePicUrl);
              setAvatarPreview(profilePicUrl);
            } else {
              console.warn('Invalid profile picture URL:', userData.profile_picture);
            }
          }
        } else {
          console.warn('Profile data is missing or in unexpected format:', response.data);
          setError('Profile data is in an unexpected format');
        }
        
        setLoading(prev => ({ ...prev, profile: false }));
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching profile data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch profile data';
        setError(errorMessage);
        setLoading(prev => ({ ...prev, profile: false }));
      }
    };
    
    fetchProfile();
  }, [t]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(prev => ({ ...prev, avatar: true }));
    setError(''); // Clear previous errors
    
    try {
      // First, ensure we have a userId by fetching the profile if needed
      let userId = localStorage.getItem('userId');
      let userType = localStorage.getItem('userType');
      
      if (!userId || userId === 'null' || userId === 'undefined') {
        console.log('User ID not found or invalid in localStorage, fetching profile first...');
        try {
          const profileResponse = await axios.get('http://localhost:5000/api/profile', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (profileResponse.data?.profile) {
            userId = profileResponse.data.profile.id || profileResponse.data.profile.user_id;
            userType = profileResponse.data.profile.role?.toLowerCase().includes('admin') ? 'admin' : 'user';
            
            if (userId && userId !== 'null' && userId !== 'undefined') {
              localStorage.setItem('userId', userId);
              localStorage.setItem('userType', userType);
              console.log('Retrieved user ID from profile:', userId);
            } else {
              throw new Error('Could not determine valid user ID from profile');
            }
          } else {
            throw new Error('Could not retrieve profile data');
          }
        } catch (profileErr) {
          console.error('Error fetching profile to get user ID:', profileErr);
          setLoading(prev => ({ ...prev, avatar: false }));
          setError('Failed to determine user ID. Please refresh the page and try again.');
          return;
        }
      }
      
      // Additional validation to ensure userId is not null or undefined
      if (!userId || userId === 'null' || userId === 'undefined') {
        throw new Error('User ID is still invalid after profile fetch');
      }
      
      console.log('Uploading profile picture for user ID:', userId);
      
      const endpoint = userType === 'admin' 
        ? `/api/admins/${userId}/profile-picture` 
        : `/api/users/${userId}/profile-picture`;
      
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await axios.post(`http://localhost:5000${endpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.status === 200) {
        console.log('Profile picture update response:', response.data);
        const profilePicUrl = getProfilePictureUrl(response.data.profilePictureUrl);
        if (profilePicUrl) {
          console.log('Setting new profile picture URL:', profilePicUrl);
          setAvatarPreview(profilePicUrl);
          setSuccess(t('profile:success.pictureUpdated'));
        } else {
          throw new Error('Received invalid profile picture URL from server');
        }
      }
      
      setLoading(prev => ({ ...prev, avatar: false }));
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError(err.response?.data?.message || t('profile:errors.pictureUploadFailed'));
      setLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, saving: true }));
    setError('');
    setSuccess('');
    
    try {
      // First, ensure we have a userId by fetching the profile if needed
      let userId = localStorage.getItem('userId');
      let userType = localStorage.getItem('userType');
      
      if (!userId || userId === 'null' || userId === 'undefined') {
        console.log('User ID not found or invalid in localStorage, fetching profile first...');
        try {
          const profileResponse = await axios.get('http://localhost:5000/api/profile', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (profileResponse.data?.profile) {
            userId = profileResponse.data.profile.id || profileResponse.data.profile.user_id;
            userType = profileResponse.data.profile.role?.toLowerCase().includes('admin') ? 'admin' : 'user';
            
            if (userId && userId !== 'null' && userId !== 'undefined') {
              localStorage.setItem('userId', userId);
              localStorage.setItem('userType', userType);
              console.log('Retrieved user ID from profile:', userId);
            } else {
              throw new Error('Could not determine valid user ID from profile');
            }
          } else {
            throw new Error('Could not retrieve profile data');
          }
        } catch (profileErr) {
          console.error('Error fetching profile to get user ID:', profileErr);
          setLoading(prev => ({ ...prev, saving: false }));
          setError('Failed to determine user ID. Please refresh the page and try again.');
          return;
        }
      }
      
      // Additional validation to ensure userId is not null or undefined
      if (!userId || userId === 'null' || userId === 'undefined') {
        throw new Error('User ID is still invalid after profile fetch');
      }
      
      const endpoint = userType === 'admin' 
        ? `/api/admins/${userId}` 
        : `/api/users/${userId}`;
      
      const updateData = userType === 'admin' 
        ? {
            first_name: profileData.name.split(' ')[0],
            last_name: profileData.name.split(' ').slice(1).join(' '),
            email: profileData.email,
            phone: profileData.phone,
            location: profileData.location
          }
        : {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            location: profileData.location
          };
      
      if (profileData.currentPassword && profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          setError(t('profile:errors.passwordsDontMatch'));
          setLoading(prev => ({ ...prev, saving: false }));
          return;
        }
        
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }
      
      const response = await axios.put(`http://localhost:5000${endpoint}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.status === 200) {
        setSuccess(t('profile:success.profileUpdated'));
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
      
      setLoading(prev => ({ ...prev, saving: false }));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || t('profile:errors.updateFailed'));
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  if (loading.profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={80} thickness={4} sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  return (
    <ProfileContainer>
      <ProfileCard elevation={0}>
        <EditButton
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleOpen}
        >
          {t('profile:editProfile')}
        </EditButton>

        <AvatarWrapper>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <CameraButton component="label" size="medium">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
                <CameraAltIcon fontSize="medium" />
              </CameraButton>
            }
          >
            <ProfileAvatar 
              src={avatarPreview} 
              imgProps={{
                onLoad: () => console.log('Profile image loaded successfully'),
                onError: (e) => {
                  console.error('Error loading avatar image:', avatarPreview);
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = ''; // Remove broken image
                },
                style: { objectFit: 'cover' }
              }}
            >
              {profileData.name.split(' ').map(n => n[0]).join('')}
            </ProfileAvatar>
          </Badge>
        </AvatarWrapper>

        <Box textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            {profileData.name}
          </Typography>
          <Chip
            label={profileData.role}
            color="primary"
            variant="outlined"
            sx={{ 
              fontWeight: 700, 
              px: 2.5, 
              py: 1.5, 
              fontSize: '1rem',
              borderWidth: 2,
              background: alpha(theme.palette.primary.light, 0.1),
              backdropFilter: 'blur(4px)'
            }}
          />
        </Box>

        <StyledTabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabScrollButton-root': {
              width: 48
            }
          }}
        >
          <StyledTab label={t('profile:overview')} />
          <StyledTab label={t('profile:skills')} />
          <StyledTab label={t('profile:activity')} />
          <StyledTab label={t('profile:projects')} />
          <StyledTab label={t('profile:teams')} />
        </StyledTabs>

        {tabValue === 0 && (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <SectionTitle variant="h5">{t('profile:personalInfo')}</SectionTitle>
              
              <InfoItem>
                <InfoIcon><EmailIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:email')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ 
                    background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${theme.palette.text.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {profileData.email}
                  </Typography>
                </Box>
              </InfoItem>

              <InfoItem>
                <InfoIcon><PhoneIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:phone')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profileData.phone || '-'}
                  </Typography>
                </Box>
              </InfoItem>

              <InfoItem>
                <InfoIcon><LocationIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:location')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profileData.location || '-'}
                  </Typography>
                </Box>
              </InfoItem>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionTitle variant="h5">{t('profile:professionalInfo')}</SectionTitle>
              
              <InfoItem>
                <InfoIcon><BusinessIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:company')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profileData.company || '-'}
                  </Typography>
                </Box>
              </InfoItem>

              <InfoItem>
                <InfoIcon><DateIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:joinDate')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profileData.joinDate || '-'}
                  </Typography>
                </Box>
              </InfoItem>

              <InfoItem>
                <InfoIcon><LanguageIcon /></InfoIcon>
                <Box flex={1}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('profile:language')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profileData.language || '-'}
                  </Typography>
                </Box>
              </InfoItem>
            </Grid>
          </Grid>
        )}

        {tabValue === 1 && (
          <Box>
            <SectionTitle variant="h5">{t('profile:skills')}</SectionTitle>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {profileData.skills.map((skill, index) => (
                <SkillChip
                  key={index}
                  label={skill}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)}, ${alpha(theme.palette.secondary.light, 0.2)})`
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <SectionTitle variant="h5">{t('profile:recentActivity')}</SectionTitle>
            <Typography variant="body1" color="text.secondary">
              {t('profile:noRecentActivity')}
            </Typography>
          </Box>
        )}

        {(error || success) && (
          <Alert
            severity={error ? 'error' : 'success'}
            icon={error ? <ErrorIcon /> : <CheckIcon />}
            sx={{ 
              mt: 4,
              borderRadius: '12px',
              backdropFilter: 'blur(4px)',
              background: error 
                ? alpha(theme.palette.error.light, 0.2) 
                : alpha(theme.palette.success.light, 0.2),
              border: `1px solid ${error ? theme.palette.error.light : theme.palette.success.light}`,
              '& .MuiAlert-message': {
                padding: '8px 0'
              }
            }}
          >
            <Typography fontWeight={600}>
              {error || success}
            </Typography>
          </Alert>
        )}
      </ProfileCard>

      {/* Edit Profile Dialog - Modern */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
            maxWidth: 800,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.95)})`,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.dark, 0.15)}`
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: 'white',
          fontWeight: 700,
          fontSize: '1.5rem',
          py: 3,
          textAlign: 'center'
        }}>
          {t('profile:editProfile')}
        </DialogTitle>
        <DialogContent sx={{ py: 4, px: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile:name')}
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      fontSize: '1rem'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile:phone')}
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />,
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('profile:location')}
                  name="location"
                  value={profileData.location}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />,
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ 
                  my: 3, 
                  borderWidth: 1,
                  borderColor: alpha(theme.palette.divider, 0.2)
                }} />
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{
                  background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${theme.palette.text.secondary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block'
                }}>
                  {t('profile:changePassword')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile:currentPassword')}
                  name="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile:newPassword')}
                  name="newPassword"
                  type="password"
                  value={profileData.newPassword}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('profile:confirmPassword')}
                  name="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={handleChange}
                  margin="normal"
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    sx: {
                      fontSize: '1rem',
                      height: 56,
                      borderRadius: '12px',
                      background: alpha(theme.palette.background.paper, 0.7)
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3 }}>
          <Button 
            onClick={handleClose} 
            color="inherit"
            sx={{ 
              fontWeight: 600,
              fontSize: '1rem',
              px: 3,
              py: 1.5,
              borderRadius: '12px',
              background: alpha(theme.palette.grey[300], 0.5),
              '&:hover': {
                background: alpha(theme.palette.grey[300], 0.8)
              }
            }}
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading.saving}
            sx={{ 
              fontWeight: 700,
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              ml: 2,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.dark, 0.2)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.dark, 0.3)}`,
                transform: 'translateY(-2px)'
              },
              '&:disabled': {
                background: theme.palette.action.disabledBackground
              }
            }}
          >
            {loading.saving ? (
              <CircularProgress size={26} color="inherit" />
            ) : (
              t('common:saveChanges')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </ProfileContainer>
  );
};

export default Profile;