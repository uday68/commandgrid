import React, { useState } from 'react';
import axios from 'axios';
import { 
  TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  Typography, Checkbox, FormControlLabel, Alert, InputAdornment,
  Stepper, Step, StepLabel, Box, CircularProgress, Tabs, Tab,
  Paper, Avatar, IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Visibility, VisibilityOff, CheckCircle, 
  Person, Business, Group, CloudUpload,
  LockOutlined, EmailOutlined, PhoneOutlined,
  BusinessOutlined, SupervisedUserCircleOutlined
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';

// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const GradientBackground = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(45deg, rgba(66,99,213,0.1) 0%, rgba(87,37,171,0.1) 50%, rgba(255,78,152,0.1) 100%)',
  zIndex: -1,
});

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'transform 0.2s',
    '&.Mui-focused': {
      transform: 'translateY(-3px)',
      boxShadow: '0 8px 20px -12px rgba(66,99,213,0.4)',
    }
  },
  '& .MuiFormLabel-root': {
    marginLeft: 4,
  }
});

const StyledButton = styled(Button)({
  borderRadius: 12,
  padding: '12px 24px',
  fontWeight: 600,
  boxShadow: 'none',
  '&.MuiButton-contained': {
    background: 'linear-gradient(45deg, #4263d5 0%, #9c27b0 100%)',
    '&:hover': {
      background: 'linear-gradient(45deg, #3652b3 0%, #8222a0 100%)',
    }
  }
});

const StyledTab = styled(Tab)({
  borderRadius: 8,
  marginRight: 8,
  transition: 'all 0.3s ease',
  '&.Mui-selected': {
    fontWeight: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 4px 20px -8px rgba(0, 0, 0, 0.1)',
  },
});

const StyledAvatar = styled(Avatar)({
  width: 120,
  height: 120,
  boxShadow: '0 10px 25px -12px rgba(0, 0, 0, 0.2)',
  border: '5px solid white',
});

const FloatingShape = styled(Box)(({ shape, top, left, right, bottom, size, rotate, color }) => ({
  position: 'absolute',
  top, 
  left, 
  right, 
  bottom,
  width: size,
  height: size,
  transform: `rotate(${rotate}deg)`,
  opacity: 0.7,
  background: color,
  borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '12px' : '0',
  filter: 'blur(20px)',
  zIndex: -1,
}));

// Constants
const REGISTRATION_TYPES = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
  COMPANY: 'company',
  COMPANY_ADMIN: 'company_admin'
};

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail'];
const SECTORS = ['Public', 'Private', 'Non-profit', 'Government'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const TEAM_SIZES = ['2-5', '6-10', '11-20', '21-50', '50+'];
const ROLES = ['Owner', 'Manager', 'Developer', 'Designer', 'Analyst'];

const illustrations = {
  [REGISTRATION_TYPES.INDIVIDUAL]: '/assets/images/registration/individual.svg',
  [REGISTRATION_TYPES.TEAM]: '/assets/images/registration/team.svg',
  [REGISTRATION_TYPES.COMPANY]: '/assets/images/registration/company.svg',
  [REGISTRATION_TYPES.COMPANY_ADMIN]: '/assets/images/registration/corporate.svg',
};

const fallbackIllustrations = {
  [REGISTRATION_TYPES.INDIVIDUAL]: "https://cdn.jsdelivr.net/gh/sauravhathi/minimal-illustrations@master/svg/user-profile.svg",
  [REGISTRATION_TYPES.TEAM]: "https://cdn.jsdelivr.net/gh/sauravhathi/minimal-illustrations@master/svg/team-work.svg",
  [REGISTRATION_TYPES.COMPANY]: "https://cdn.jsdelivr.net/gh/sauravhathi/minimal-illustrations@master/svg/company.svg",
  [REGISTRATION_TYPES.COMPANY_ADMIN]: "https://cdn.jsdelivr.net/gh/sauravhathi/minimal-illustrations@master/svg/admin.svg",
};

const RegistrationPage = () => {
  const { t } = useTranslation(['registration', 'common', 'validation']);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationType, setRegistrationType] = useState(REGISTRATION_TYPES.INDIVIDUAL);
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    industry: INDUSTRIES[0],
    companySize: COMPANY_SIZES[0],
    role: ROLES[2],
    terms: false,
    teamName: '',
    teamDescription: '',
    teamSize: TEAM_SIZES[0],
    profilePicture: null,
    previewImage: null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    agileMethodology: true,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    category: '',
    sector: SECTORS[0],
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const steps = {
    [REGISTRATION_TYPES.INDIVIDUAL]: [
      t('steps.account'),
      t('steps.personal'),
      t('steps.review')
    ],
    [REGISTRATION_TYPES.TEAM]: [
      t('steps.account'),
      t('steps.personal'),
      t('steps.team'),
      t('steps.review')
    ],
    [REGISTRATION_TYPES.COMPANY]: [
      t('steps.account'),
      t('steps.personal'),
      t('steps.organization'),
      t('steps.review')
    ],
    [REGISTRATION_TYPES.COMPANY_ADMIN]: [
      t('steps.account'),
      t('steps.organization'),
      t('steps.admin'),
      t('steps.review')
    ]
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePicture: file,
          previewImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (registrationType === REGISTRATION_TYPES.COMPANY_ADMIN) {
      if (step === 0) {
        if (!formData.companyName) {
          newErrors.companyName = t('validation:required', { field: t('registration:fields.companyName') });
        }
      } else if (step === 2) {
        if (!formData.adminFirstName) {
          newErrors.adminFirstName = t('validation:required', { field: t('registration:fields.adminFirstName') });
        }
        if (!formData.adminLastName) {
          newErrors.adminLastName = t('validation:required', { field: t('registration:fields.adminLastName') });
        }
        if (!formData.adminEmail) {
          newErrors.adminEmail = t('validation:required', { field: t('registration:fields.adminEmail') });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          newErrors.adminEmail = t('validation:invalidEmail');
        }
        
        if (!formData.adminPassword) {
          newErrors.adminPassword = t('validation:required', { field: t('registration:fields.adminPassword') });
        } else if (formData.adminPassword.length < 8) {
          newErrors.adminPassword = t('validation:minLength', { count: 8 });
        }
        
        if (!formData.adminConfirmPassword) {
          newErrors.adminConfirmPassword = t('validation:required', { field: t('registration:fields.confirmPassword') });
        } else if (formData.adminPassword !== formData.adminConfirmPassword) {
          newErrors.adminConfirmPassword = t('validation:passwordsDontMatch');
        }
      }
    } else {
      if (step === 0) {
        if (!formData.email) {
          newErrors.email = t('validation:required', { field: t('registration:fields.email') });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = t('validation:invalidEmail');
        }
        
        if (!formData.password) {
          newErrors.password = t('validation:required', { field: t('registration:fields.password') });
        } else if (formData.password.length < 8) {
          newErrors.password = t('validation:minLength', { count: 8 });
        }
        
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = t('validation:required', { field: t('registration:fields.confirmPassword') });
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = t('validation:passwordsDontMatch');
        }
      }
      
      if (step === 1) {
        if (!formData.firstName) {
          newErrors.firstName = t('validation:required', { field: t('registration:fields.firstName') });
        }
        if (!formData.lastName) {
          newErrors.lastName = t('validation:required', { field: t('registration:fields.lastName') });
        }
      }
      
      if (registrationType === REGISTRATION_TYPES.COMPANY && step === 2 && !formData.companyName) {
        newErrors.companyName = t('validation:required', { field: t('registration:fields.companyName') });
      }
      
      if (registrationType === REGISTRATION_TYPES.TEAM && step === 2 && !formData.teamName) {
        newErrors.teamName = t('validation:required', { field: t('registration:fields.teamName') });
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.terms) {
      setErrors(prev => ({...prev, terms: t('validation:termsRequired')}));
      return;
    }

    setIsSubmitting(true);
    
    try {
      let payload;
      
      if (registrationType === REGISTRATION_TYPES.COMPANY_ADMIN) {
        payload = {
          registrationType: REGISTRATION_TYPES.COMPANY_ADMIN,
          company: {
            name: formData.companyName,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country,
            category: formData.category,
            sector: formData.sector || formData.industry
          },
          admin: {
            firstName: formData.adminFirstName,
            lastName: formData.adminLastName,
            email: formData.adminEmail,
            password: formData.adminPassword
          },
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          ipAddress: '', 
          userAgent: navigator.userAgent
        };
      } else {
        payload = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          timeZone: formData.timeZone,
          agileMethodology: formData.agileMethodology,
          registrationType,
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          ipAddress: '', 
          userAgent: navigator.userAgent,
          deviceInfo: {
            browser: navigator.appName,
            os: navigator.platform
          }
        };

        if (registrationType === REGISTRATION_TYPES.COMPANY) {
          payload.company = {
            name: formData.companyName,
            industry: formData.industry,
            size: formData.companySize
          };
          payload.role = formData.role;
        } else if (registrationType === REGISTRATION_TYPES.TEAM) {
          payload.team = {
            name: formData.teamName,
            description: formData.teamDescription,
            size: formData.teamSize
          };
        }
      }

      const formDataToSend = new FormData();
      if (formData.profilePicture) {
        formDataToSend.append('profilePicture', formData.profilePicture);
      }
      formDataToSend.append('data', JSON.stringify(payload));

      const response = await axios.post('/api/auth/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        if (response.data.user.companyId) {
          localStorage.setItem('companyId', response.data.user.companyId);
        }
        
        navigate('/dashboard', { state: { welcome: true } });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        submit: error.response?.data?.message || 
               t('registration:errors.registrationFailed')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAccountStep = () => (
    <div className="space-y-4">
      <StyledTextField
        label={<>
          {t('registration:fields.email')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type="email"
        fullWidth
        required
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        error={!!errors.email}
        helperText={errors.email}
        InputProps={{
          startAdornment: <EmailOutlined color="action" />,
          endAdornment: formData.email && !errors.email && <CheckCircle color="success" />
        }}
      />
      
      <StyledTextField
        label={<>
          {t('registration:fields.password')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type={showPassword ? "text" : "password"}
        fullWidth
        required
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        error={!!errors.password}
        helperText={errors.password || t('registration:passwordRequirement')}
        InputProps={{
          startAdornment: <LockOutlined color="action" />,
          endAdornment: (
            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          )
        }}
      />
      
      <StyledTextField
        label={<>
          {t('registration:fields.confirmPassword')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type={showPassword ? "text" : "password"}
        fullWidth
        required
        value={formData.confirmPassword}
        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword}
        InputProps={{
          startAdornment: <LockOutlined color="action" />
        }}
      />
    </div>
  );

  const renderPersonalStep = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center mb-6">
        <StyledAvatar src={formData.previewImage} className="mb-4">
          {formData.firstName?.charAt(0)}{formData.lastName?.charAt(0)}
        </StyledAvatar>
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUpload />}
          className="rounded-full px-5"
        >
          {t('registration:buttons.uploadPhoto')}
          <VisuallyHiddenInput 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
          />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StyledTextField
          label={<>
            {t('registration:fields.firstName')}
            <span className="text-red-500 ml-1">*</span>
          </>}
          fullWidth
          required
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          error={!!errors.firstName}
          helperText={errors.firstName}
          InputProps={{
            startAdornment: <Person color="action" />
          }}
        />
        
        <StyledTextField
          label={<>
            {t('registration:fields.lastName')}
            <span className="text-red-500 ml-1">*</span>
          </>}
          fullWidth
          required
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          error={!!errors.lastName}
          helperText={errors.lastName}
        />
      </div>
      
      <StyledTextField
        label={t('registration:fields.phone')}
        fullWidth
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        placeholder={t('registration:placeholders.phone')}
        InputProps={{
          startAdornment: <PhoneOutlined color="action" />
        }}
      />
      
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.agileMethodology}
            onChange={(e) => setFormData({...formData, agileMethodology: e.target.checked})}
            color="primary"
          />
        }
        label={t('registration:labels.preferAgile')}
      />
    </div>
  );

  const renderCompanyStep = () => (
    <div className="space-y-4">
      <StyledTextField
        label={<>
          {t('registration:fields.companyName')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        fullWidth
        required
        value={formData.companyName}
        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
        error={!!errors.companyName}
        helperText={errors.companyName}
        InputProps={{
          startAdornment: <BusinessOutlined color="action" />
        }}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <FormControl fullWidth>
          <InputLabel>{t('registration:fields.industry')}</InputLabel>
          <Select
            value={formData.industry}
            onChange={(e) => setFormData({...formData, industry: e.target.value})}
            label={t('registration:fields.industry')}
          >
            {INDUSTRIES.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>{t('registration:fields.companySize')}</InputLabel>
          <Select
            value={formData.companySize}
            onChange={(e) => setFormData({...formData, companySize: e.target.value})}
            label={t('registration:fields.companySize')}
          >
            {COMPANY_SIZES.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      
      <FormControl fullWidth>
        <InputLabel>{t('registration:fields.role')}</InputLabel>
        <Select
          value={formData.role}
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          label={t('registration:fields.role')}
        >
          {ROLES.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );

  const renderTeamStep = () => (
    <div className="space-y-4">
      <StyledTextField
        label={<>
          {t('registration:fields.teamName')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        fullWidth
        required
        value={formData.teamName}
        onChange={(e) => setFormData({...formData, teamName: e.target.value})}
        error={!!errors.teamName}
        helperText={errors.teamName}
        InputProps={{
          startAdornment: <Group color="action" />
        }}
      />
      
      <StyledTextField
        label={t('registration:fields.teamDescription')}
        fullWidth
        multiline
        rows={3}
        value={formData.teamDescription}
        onChange={(e) => setFormData({...formData, teamDescription: e.target.value})}
      />
      
      <FormControl fullWidth>
        <InputLabel>{t('registration:fields.teamSize')}</InputLabel>
        <Select
          value={formData.teamSize}
          onChange={(e) => setFormData({...formData, teamSize: e.target.value})}
          label={t('registration:fields.teamSize')}
        >
          {TEAM_SIZES.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );

  const renderAdminInfoStep = () => (
    <div className="space-y-4">
      <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
        {t('registration:adminInfo')}
      </Typography>
      
      <div className="grid grid-cols-2 gap-4">
        <StyledTextField
          label={<>
            {t('registration:fields.adminFirstName')}
            <span className="text-red-500 ml-1">*</span>
          </>}
          fullWidth
          required
          value={formData.adminFirstName}
          onChange={(e) => setFormData({...formData, adminFirstName: e.target.value})}
          error={!!errors.adminFirstName}
          helperText={errors.adminFirstName}
          InputProps={{
            startAdornment: <Person color="action" />
          }}
        />
        
        <StyledTextField
          label={<>
            {t('registration:fields.adminLastName')}
            <span className="text-red-500 ml-1">*</span>
          </>}
          fullWidth
          required
          value={formData.adminLastName}
          onChange={(e) => setFormData({...formData, adminLastName: e.target.value})}
          error={!!errors.adminLastName}
          helperText={errors.adminLastName}
        />
      </div>
      
      <StyledTextField
        label={<>
          {t('registration:fields.adminEmail')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type="email"
        fullWidth
        required
        value={formData.adminEmail}
        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
        error={!!errors.adminEmail}
        helperText={errors.adminEmail}
        InputProps={{
          startAdornment: <EmailOutlined color="action" />
        }}
      />
      
      <StyledTextField
        label={<>
          {t('registration:fields.adminPassword')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type={showPassword ? "text" : "password"}
        fullWidth
        required
        value={formData.adminPassword}
        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
        error={!!errors.adminPassword}
        helperText={errors.adminPassword || t('registration:passwordRequirement')}
        InputProps={{
          startAdornment: <LockOutlined color="action" />,
          endAdornment: (
            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          )
        }}
      />
      
      <StyledTextField
        label={<>
          {t('registration:fields.adminConfirmPassword')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        type={showPassword ? "text" : "password"}
        fullWidth
        required
        value={formData.adminConfirmPassword}
        onChange={(e) => setFormData({...formData, adminConfirmPassword: e.target.value})}
        error={!!errors.adminConfirmPassword}
        helperText={errors.adminConfirmPassword}
        InputProps={{
          startAdornment: <LockOutlined color="action" />
        }}
      />
    </div>
  );

  const renderCompanyDetailsStep = () => (
    <div className="space-y-4">
      <StyledTextField
        label={<>
          {t('registration:fields.companyName')}
          <span className="text-red-500 ml-1">*</span>
        </>}
        fullWidth
        required
        value={formData.companyName}
        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
        error={!!errors.companyName}
        helperText={errors.companyName}
        InputProps={{
          startAdornment: <BusinessOutlined color="action" />
        }}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <FormControl fullWidth>
          <InputLabel>{t('registration:fields.industry')}</InputLabel>
          <Select
            value={formData.industry}
            onChange={(e) => setFormData({...formData, industry: e.target.value})}
            label={t('registration:fields.industry')}
          >
            {INDUSTRIES.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>{t('registration:fields.sector')}</InputLabel>
          <Select
            value={formData.sector}
            onChange={(e) => setFormData({...formData, sector: e.target.value})}
            label={t('registration:fields.sector')}
          >
            {SECTORS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      
      <FormControl fullWidth>
        <InputLabel>{t('registration:fields.companySize')}</InputLabel>
        <Select
          value={formData.companySize}
          onChange={(e) => setFormData({...formData, companySize: e.target.value})}
          label={t('registration:fields.companySize')}
        >
          {COMPANY_SIZES.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );

  const renderAddressStep = () => (
    <div className="space-y-4">
      <StyledTextField
        label={t('registration:fields.address')}
        fullWidth
        value={formData.address}
        onChange={(e) => setFormData({...formData, address: e.target.value})}
        InputProps={{
          startAdornment: <BusinessOutlined color="action" />
        }}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <StyledTextField
          label={t('registration:fields.city')}
          fullWidth
          value={formData.city}
          onChange={(e) => setFormData({...formData, city: e.target.value})}
        />
        
        <StyledTextField
          label={t('registration:fields.state')}
          fullWidth
          value={formData.state}
          onChange={(e) => setFormData({...formData, state: e.target.value})}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StyledTextField
          label={t('registration:fields.zipCode')}
          fullWidth
          value={formData.zipCode}
          onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
        />
        
        <StyledTextField
          label={t('registration:fields.country')}
          fullWidth
          value={formData.country}
          onChange={(e) => setFormData({...formData, country: e.target.value})}
        />
      </div>
      
      <StyledTextField
        label={t('registration:fields.category')}
        fullWidth
        value={formData.category}
        onChange={(e) => setFormData({...formData, category: e.target.value})}
        placeholder={t('registration:placeholders.category')}
      />
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
          {t('registration:review.account')}
        </Typography>
        <Box className="bg-gray-50/80 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{t('registration:fields.email')}:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
        </Box>
      </div>
      
      <div>
        <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
          {t('registration:review.personal')}
        </Typography>
        <Box className="bg-gray-50/80 p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-gray-600 text-sm">{t('registration:fields.firstName')}</div>
              <div className="font-medium">{formData.firstName}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('registration:fields.lastName')}</div>
              <div className="font-medium">{formData.lastName}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-600 text-sm">{t('registration:fields.phone')}</div>
              <div className="font-medium">{formData.phone || t('registration:notProvided')}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('registration:labels.agilePreference')}</div>
              <div className="font-medium">
                {formData.agileMethodology ? t('common:yes') : t('common:no')}
              </div>
            </div>
          </div>
          {formData.previewImage && (
            <div className="mt-4">
              <div className="text-gray-600 text-sm mb-2">{t('registration:fields.profilePicture')}</div>
              <Avatar src={formData.previewImage} className="w-20 h-20" />
            </div>
          )}
        </Box>
      </div>
      
      {registrationType === REGISTRATION_TYPES.COMPANY && (
        <div>
          <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
            {t('registration:review.organization')}
          </Typography>
          <Box className="bg-gray-50/80 p-4 rounded-lg shadow-sm">
            <div className="mb-3">
              <div className="text-gray-600 text-sm">{t('registration:fields.companyName')}</div>
              <div className="font-medium">{formData.companyName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.industry')}</div>
                <div className="font-medium">{formData.industry}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.companySize')}</div>
                <div className="font-medium">{formData.companySize}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.role')}</div>
                <div className="font-medium">{formData.role}</div>
              </div>
            </div>
          </Box>
        </div>
      )}
      
      {registrationType === REGISTRATION_TYPES.TEAM && (
        <div>
          <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
            {t('registration:review.team')}
          </Typography>
          <Box className="bg-gray-50/80 p-4 rounded-lg shadow-sm">
            <div className="mb-3">
              <div className="text-gray-600 text-sm">{t('registration:fields.teamName')}</div>
              <div className="font-medium">{formData.teamName}</div>
            </div>
            <div className="mb-3">
              <div className="text-gray-600 text-sm">{t('registration:fields.teamDescription')}</div>
              <div className="font-medium">{formData.teamDescription || t('registration:notProvided')}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">{t('registration:fields.teamSize')}</div>
              <div className="font-medium">{formData.teamSize}</div>
            </div>
          </Box>
        </div>
      )}
      
      {registrationType === REGISTRATION_TYPES.COMPANY_ADMIN && (
        <div>
          <Typography variant="h6" className="font-medium mb-2 text-indigo-700">
            {t('registration:review.organization')}
          </Typography>
          <Box className="bg-gray-50/80 p-4 rounded-lg shadow-sm">
            <div className="mb-3">
              <div className="text-gray-600 text-sm">{t('registration:fields.companyName')}</div>
              <div className="font-medium">{formData.companyName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.industry')}</div>
                <div className="font-medium">{formData.industry}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.sector')}</div>
                <div className="font-medium">{formData.sector || t('registration:notProvided')}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">{t('registration:fields.companySize')}</div>
                <div className="font-medium">{formData.companySize}</div>
              </div>
            </div>
            
            {formData.address && (
              <div className="mt-3">
                <div className="text-gray-600 text-sm">{t('registration:fields.address')}</div>
                <div className="font-medium">
                  {formData.address}, {formData.city}, {formData.state} {formData.zipCode}, {formData.country}
                </div>
              </div>
            )}
          </Box>
        </div>
      )}
      
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.terms}
            onChange={(e) => setFormData({...formData, terms: e.target.checked})}
            color="primary"
          />
        }
        label={
          <Typography className={errors.terms ? 'text-red-500' : ''}>
            {t('registration:terms.agree')}{' '}
            <Link to="/terms" className="text-indigo-600 hover:underline">
              {t('registration:terms.termsService')}
            </Link>{' '}
            {t('registration:terms.and')}{' '}
            <Link to="/privacy" className="text-indigo-600 hover:underline">
              {t('registration:terms.privacyPolicy')}
            </Link>
          </Typography>
        }
      />
      {errors.terms && (
        <Typography color="error" variant="caption">{errors.terms}</Typography>
      )}
    </div>
  );

  const renderStepContent = (step) => {
    if (registrationType === REGISTRATION_TYPES.COMPANY_ADMIN) {
      switch (step) {
        case 0: return renderCompanyDetailsStep();
        case 1: return renderAddressStep();
        case 2: return renderAdminInfoStep();
        case 3: return renderReviewStep();
        default: return null;
      }
    }
    
    switch (step) {
      case 0: return renderAccountStep();
      case 1: return renderPersonalStep();
      case 2:
        if (registrationType === REGISTRATION_TYPES.COMPANY) return renderCompanyStep();
        if (registrationType === REGISTRATION_TYPES.TEAM) return renderTeamStep();
        return null;
      case 3: return renderReviewStep();
      default: return null;
    }
  };

  // Animation variants
  const formContainerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -30,
      transition: {
        duration: 0.4,
        when: "afterChildren",
        staggerChildren: 0.05
      }
    }
  };

  const formControlVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, type: "spring", stiffness: 100 }
    },
    exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
  };

  const renderStepWithAnimation = (step) => {
    const content = renderStepContent(step);
    if (!content) return null;

    return (
      <motion.div
        key={`step-${activeStep}-${registrationType}`}
        variants={formContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full"
      >
        <div className="space-y-6">
          {React.Children.toArray(content).map((child, index) => (
            <motion.div key={index} variants={formControlVariants}>
              {child}
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex items-stretch overflow-hidden bg-white relative">
      <GradientBackground />
      
      <FloatingShape shape="circle" top="10%" left="5%" size="100px" rotate="0" color="rgba(66,99,213,0.2)" />
      <FloatingShape shape="square" bottom="15%" right="8%" size="150px" rotate="45" color="rgba(156,39,176,0.15)" />
      <FloatingShape shape="circle" bottom="30%" left="15%" size="80px" rotate="0" color="rgba(255,64,129,0.1)" />
      
      <motion.div 
        className="hidden lg:block w-1/2 relative overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 z-10" />
        <img 
          src={imageError ? fallbackIllustrations[registrationType] : illustrations[registrationType]} 
          alt="Registration" 
          className="absolute inset-0 h-full w-full object-cover z-0"
          onError={() => setImageError(true)}
        />
        
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-white p-12">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-center max-w-md"
          >
            <Typography variant="h3" className="font-bold mb-6">
              {t('registration:welcome.title')}
            </Typography>
            <Typography variant="h6" className="mb-8 font-light">
              {t('registration:welcome.subtitle')}
            </Typography>
            
            <div className="space-y-6 mt-12">
              {['security', 'collaboration', 'efficiency'].map((feature, index) => (
                <motion.div 
                  key={feature}
                  className="flex items-center"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (index * 0.2), duration: 0.6 }}
                >
                  <CheckCircle className="text-green-400 mr-3" />
                  <Typography>
                    {t(`registration:welcome.features.${feature}`)}
                  </Typography>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      <div className="w-full lg:w-1/2 py-8 px-6 md:px-12 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <Typography variant="h4" className="font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {t('registration:title')}
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              {t('registration:subtitle')}
            </Typography>
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Paper elevation={0} className="bg-gray-50/50 p-1 rounded-xl mb-8">
              <Tabs
                value={registrationType}
                onChange={(e, newValue) => {
                  setRegistrationType(newValue);
                  setActiveStep(0);
                }}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="none"
              >
                <StyledTab 
                  value={REGISTRATION_TYPES.INDIVIDUAL} 
                  label={
                    <Box className="flex items-center py-1 px-2">
                      <Person className="mr-2" fontSize="small" />
                      <span>{t('registration:registrationType.individual')}</span>
                    </Box>
                  } 
                />
                <StyledTab 
                  value={REGISTRATION_TYPES.TEAM} 
                  label={
                    <Box className="flex items-center py-1 px-2">
                      <Group className="mr-2" fontSize="small" />
                      <span>{t('registration:registrationType.team')}</span>
                    </Box>
                  } 
                />
                <StyledTab 
                  value={REGISTRATION_TYPES.COMPANY} 
                  label={
                    <Box className="flex items-center py-1 px-2">
                      <Business className="mr-2" fontSize="small" />
                      <span>{t('registration:registrationType.company')}</span>
                    </Box>
                  } 
                />
                <StyledTab 
                  value={REGISTRATION_TYPES.COMPANY_ADMIN} 
                  label={
                    <Box className="flex items-center py-1 px-2">
                      <BusinessOutlined className="mr-2" fontSize="small" />
                      <span>{t('registration:registrationType.companyAdmin')}</span>
                    </Box>
                  } 
                />
              </Tabs>
            </Paper>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8"
          >
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel 
              className="bg-gray-50/30 py-4 px-2 rounded-xl"
            >
              {steps[registrationType].map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </motion.div>
          
          <Box className="min-h-[360px] relative">
            <AnimatePresence mode="wait">
              {renderStepWithAnimation(activeStep)}
            </AnimatePresence>
          </Box>
          
          {errors.submit && (
            <Alert severity="error" className="mt-4 rounded-xl">
              {errors.submit}
            </Alert>
          )}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex justify-between mt-8"
          >
            <StyledButton
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
              size="large"
            >
              {t('common:back')}
            </StyledButton>
            
            {activeStep === steps[registrationType].length - 1 ? (
              <StyledButton
                onClick={handleSubmit}
                variant="contained"
                size="large"
                disabled={isSubmitting || !formData.terms}
                endIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {t('registration:buttons.completeRegistration')}
              </StyledButton>
            ) : (
              <StyledButton
                onClick={handleNext}
                variant="contained"
                size="large"
              >
                {t('common:next')}
              </StyledButton>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 text-center"
          >
            <Typography variant="body2" className="text-gray-600">
              {t('registration:haveAccount')}{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                {t('registration:signIn')}
              </Link>
            </Typography>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegistrationPage;