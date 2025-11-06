// src/Components/Enterprise/IntegrationPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Code as CodeIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  School as SchoolIcon,
  MedicalServices as MedicalIcon,
  AccountBalance as FinanceIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { FiRefreshCw, FiX, FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { DesignServices as DesignIcon } from '@mui/icons-material';
import integrationService from '../../services/integrationService';

const IntegrationPanel = () => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credentials, setCredentials] = useState({});

  const integrations = {
    storage: [
      { id: 'google-drive', name: 'Google Drive', icon: <StorageIcon />, category: 'storage', description: 'Store and access files on Google Drive.' },
      { id: 'dropbox', name: 'Dropbox', icon: <StorageIcon />, category: 'storage', description: 'Sync and share files using Dropbox.' },
      { id: 'onedrive', name: 'OneDrive', icon: <StorageIcon />, category: 'storage', description: 'Access files on Microsoft OneDrive.' },
      { id: 'box', name: 'Stack', icon: <StorageIcon />, category: 'storage', description: 'Collaborate and share files securely.' },
    ],
    development: [
      { id: 'github', name: 'GitHub', icon: <CodeIcon />, category: 'development', description: 'Manage your code repositories on GitHub.' },
      { id: 'gitlab', name: 'GitLab', icon: <CodeIcon />, category: 'development', description: 'Collaborate on code with GitLab.' },
      { id: 'bitbucket', name: 'Bitbucket', icon: <CodeIcon />, category: 'development', description: 'Host and manage your code on Bitbucket.' },
      { id: 'jira', name: 'Jira', icon: <CodeIcon />, category: 'development', description: 'Track and manage your projects with Jira.' },
      { id: 'confluence', name: 'Confluence', icon: <CodeIcon />, category: 'development', description: 'Collaborate and share knowledge using Confluence.' },
    ],
    business: [
      { id: 'slack', name: 'Slack', icon: <BusinessIcon />, category: 'business', description: 'Communicate and collaborate with your team on Slack.' },
      { id: 'teams', name: 'Microsoft Teams', icon: <BusinessIcon />, category: 'business', description: 'Connect and collaborate using Microsoft Teams.' },
      { id: 'zoom', name: 'Zoom', icon: <BusinessIcon />, category: 'business', description: 'Host virtual meetings with Zoom.' },
      { id: 'asana', name: 'Asana', icon: <BusinessIcon />, category: 'business', description: 'Organize and manage your tasks with Asana.' },
      { id: 'trello', name: 'Trello', icon: <BusinessIcon />, category: 'business', description: 'Track and manage your projects using Trello.' },
    ],
    design: [
      { id: 'figma', name: 'Figma', icon: <DesignIcon />, category: 'design', description: 'Design and prototype with Figma.' },
      { id: 'adobe-xd', name: 'Adobe XD', icon: <DesignIcon />, category: 'design', description: 'Create designs and prototypes with Adobe XD.' },
      { id: 'sketch', name: 'Sketch', icon: <DesignIcon />, category: 'design', description: 'Design and collaborate using Sketch.' },
      { id: 'invision', name: 'InVision', icon: <DesignIcon />, category: 'design', description: 'Collaborate on designs with InVision.' },
    ],
    construction: [
      { id: 'autocad', name: 'AutoCAD', icon: <BuildIcon />, category: 'construction', description: 'Create and edit designs with AutoCAD.' },
      { id: 'revit', name: 'Revit', icon: <BuildIcon />, category: 'construction', description: 'Design and collaborate using Revit.' },
      { id: 'bim360', name: 'BIM 360', icon: <BuildIcon />, category: 'construction', description: 'Manage construction projects with BIM 360.' },
      { id: 'bluebeam', name: 'Bluebeam', icon: <BuildIcon />, category: 'construction', description: 'Collaborate on construction documents with Bluebeam.' },
    ],
    education: [
      { id: 'canvas', name: 'Canvas LMS', icon: <SchoolIcon />, category: 'education', description: 'Manage your courses with Canvas LMS.' },
      { id: 'moodle', name: 'Moodle', icon: <SchoolIcon />, category: 'education', description: 'Create and manage courses using Moodle.' },
      { id: 'blackboard', name: 'Blackboard', icon: <SchoolIcon />, category: 'education', description: 'Organize and deliver courses with Blackboard.' },
      { id: 'google-classroom', name: 'Google Classroom', icon: <SchoolIcon />, category: 'education', description: 'Collaborate and manage classes using Google Classroom.' },
    ],
    healthcare: [
      { id: 'epic', name: 'Epic Systems', icon: <MedicalIcon />, category: 'healthcare', description: 'Manage healthcare records with Epic Systems.' },
      { id: 'cerner', name: 'Cerner', icon: <MedicalIcon />, category: 'healthcare', description: 'Organize healthcare data using Cerner.' },
      { id: 'athena', name: 'Athenahealth', icon: <MedicalIcon />, category: 'healthcare', description: 'Streamline healthcare operations with Athenahealth.' },
      { id: 'doximity', name: 'Doximity', icon: <MedicalIcon />, category: 'healthcare', description: 'Connect with healthcare professionals using Doximity.' },
    ],
    finance: [
      { id: 'quickbooks', name: 'QuickBooks', icon: <FinanceIcon />, category: 'finance', description: 'Manage your finances with QuickBooks.' },
      { id: 'xero', name: 'Xero', icon: <FinanceIcon />, category: 'finance', description: 'Track and manage finances using Xero.' },
      { id: 'freshbooks', name: 'FreshBooks', icon: <FinanceIcon />, category: 'finance', description: 'Simplify your accounting with FreshBooks.' },
      { id: 'wave', name: 'Wave', icon: <FinanceIcon />, category: 'finance', description: 'Manage your business finances with Wave.' },
    ],
  };

  const categories = [
    { id: 'all', name: 'All Integrations', icon: <SettingsIcon /> },
    { id: 'storage', name: 'Storage', icon: <StorageIcon /> },
    { id: 'development', name: 'Development', icon: <CodeIcon /> },
    { id: 'business', name: 'Business', icon: <BusinessIcon /> },
    { id: 'design', name: 'Design', icon: <DesignIcon /> },
    { id: 'construction', name: 'Construction', icon: <BuildIcon /> },
    { id: 'education', name: 'Education', icon: <SchoolIcon /> },
    { id: 'healthcare', name: 'Healthcare', icon: <MedicalIcon /> },
    { id: 'finance', name: 'Finance', icon: <FinanceIcon /> },
  ];

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const integrations = await integrationService.getAllIntegrations();
      setConnectedIntegrations(integrations.map(i => i.id));
    } catch (error) {
      setError('Failed to load integrations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleIntegrationClick = (integration) => {
    setSelectedIntegration(integration);
    setOpenDialog(true);
    setCredentials({});
  };

  const handleCredentialChange = (field) => (event) => {
    setCredentials({
      ...credentials,
      [field]: event.target.value,
    });
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      let response;
      switch (selectedIntegration.id) {
        case 'google-drive':
          response = await integrationService.connectGoogleDrive(credentials.accessToken);
          break;
        case 'dropbox':
          response = await integrationService.connectDropbox(credentials.accessToken);
          break;
        case 'github':
          response = await integrationService.connectGitHub(credentials.accessToken);
          break;
        case 'slack':
          response = await integrationService.connectSlack(credentials.accessToken);
          break;
        case 'jira':
          response = await integrationService.connectJira(credentials.apiToken, credentials.domain);
          break;
        case 'figma':
          response = await integrationService.connectFigma(credentials.accessToken);
          break;
        case 'quickbooks':
          response = await integrationService.connectQuickBooks(
            credentials.clientId,
            credentials.clientSecret,
            credentials.refreshToken
          );
          break;
        case 'autocad':
          response = await integrationService.connectAutoCAD(credentials.apiKey);
          break;
        case 'canvas':
          response = await integrationService.connectCanvas(credentials.apiKey, credentials.domain);
          break;
        case 'epic':
          response = await integrationService.connectEpic(credentials.clientId, credentials.clientSecret);
          break;
        default:
          throw new Error('Unsupported integration');
      }

      setConnectedIntegrations([...connectedIntegrations, selectedIntegration.id]);
      setSuccess('Successfully connected to ' + selectedIntegration.name);
      setOpenDialog(false);
    } catch (error) {
      setError('Failed to connect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId) => {
    try {
      setLoading(true);
      setError('');
      await integrationService.disconnectIntegration(integrationId);
      setConnectedIntegrations(connectedIntegrations.filter(id => id !== integrationId));
      setSuccess('Successfully disconnected from ' + integrationId);
    } catch (error) {
      setError('Failed to disconnect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (integrationId) => {
    try {
      setLoading(true);
      setError('');
      const refreshedIntegration = await integrationService.refreshIntegration(integrationId);
      setConnectedIntegrations([...connectedIntegrations, refreshedIntegration.id]);
      setSuccess('Successfully refreshed ' + refreshedIntegration.name);
    } catch (error) {
      setError('Failed to refresh: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderIntegrationCard = (integration) => {
    const isConnected = connectedIntegrations.includes(integration.id);
    return (
      <Card key={integration.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {integration.icon}
            <Typography variant="h6" component="div" sx={{ ml: 1 }}>
              {integration.name}
            </Typography>
          </Stack>
          <Chip
            label={isConnected ? 'Connected' : 'Not Connected'}
            color={isConnected ? 'success' : 'default'}
            size="small"
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {integration.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button
              size="small"
              startIcon={<FiRefreshCw />}
              onClick={() => handleRefresh(integration.id)}
            >
              Refresh
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<FiX />}
              onClick={() => handleDisconnect(integration.id)}
            >
              Disconnect
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderIntegrations = () => {
    const selectedCategory = categories[selectedTab].id;
    const integrationsToShow = selectedCategory === 'all'
      ? Object.values(integrations).flat()
      : integrations[selectedCategory] || [];

    return (
      <Grid container spacing={3}>
        {integrationsToShow.map((integration) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={integration.id}>
            {renderIntegrationCard(integration)}
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderCredentialFields = () => {
    if (!selectedIntegration) return null;

    switch (selectedIntegration.id) {
      case 'google-drive':
      case 'dropbox':
      case 'github':
      case 'slack':
      case 'figma':
        return (
          <TextField
            autoFocus
            margin="dense"
            label="Access Token"
            type="password"
            fullWidth
            variant="outlined"
            value={credentials.accessToken || ''}
            onChange={handleCredentialChange('accessToken')}
          />
        );
      case 'jira':
        return (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="API Token"
              type="password"
              fullWidth
              variant="outlined"
              value={credentials.apiToken || ''}
              onChange={handleCredentialChange('apiToken')}
            />
            <TextField
              margin="dense"
              label="Domain"
              fullWidth
              variant="outlined"
              value={credentials.domain || ''}
              onChange={handleCredentialChange('domain')}
            />
          </>
        );
      case 'quickbooks':
        return (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="Client ID"
              fullWidth
              variant="outlined"
              value={credentials.clientId || ''}
              onChange={handleCredentialChange('clientId')}
            />
            <TextField
              margin="dense"
              label="Client Secret"
              type="password"
              fullWidth
              variant="outlined"
              value={credentials.clientSecret || ''}
              onChange={handleCredentialChange('clientSecret')}
            />
            <TextField
              margin="dense"
              label="Refresh Token"
              type="password"
              fullWidth
              variant="outlined"
              value={credentials.refreshToken || ''}
              onChange={handleCredentialChange('refreshToken')}
            />
          </>
        );
      case 'autocad':
        return (
          <TextField
            autoFocus
            margin="dense"
            label="API Key"
            type="password"
            fullWidth
            variant="outlined"
            value={credentials.apiKey || ''}
            onChange={handleCredentialChange('apiKey')}
          />
        );
      case 'canvas':
      case 'epic':
        return (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="API Key"
              type="password"
              fullWidth
              variant="outlined"
              value={credentials.apiKey || ''}
              onChange={handleCredentialChange('apiKey')}
            />
            <TextField
              margin="dense"
              label="Domain"
              fullWidth
              variant="outlined"
              value={credentials.domain || ''}
              onChange={handleCredentialChange('domain')}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Stack sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Integrations
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {categories.map((category, index) => (
          <Tab
            key={category.id}
            label={category.name}
            icon={category.icon}
            iconPosition="start"
            value={index}
          />
        ))}
      </Tabs>
      {loading ? (
        <Stack sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Stack>
      ) : (
        renderIntegrations()
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
        <DialogContent>
          {renderCredentialFields()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleConnect} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default IntegrationPanel;