import apiService from '../utils/apiService';
import { API_ENDPOINTS } from '../config/apiConfig';

const integrationService = {
  getAllIntegrations: async () => {
    return await apiService.get(API_ENDPOINTS.integrations.all);
  },
  
  connectGoogleDrive: async (accessToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'google-drive', 
      accessToken 
    });
  },
  
  connectDropbox: async (accessToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'dropbox', 
      accessToken 
    });
  },
  
  connectGitHub: async (accessToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'github', 
      accessToken 
    });
  },
  
  connectSlack: async (accessToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'slack', 
      accessToken 
    });
  },
  
  connectJira: async (apiToken, domain) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'jira', 
      apiToken, 
      domain 
    });
  },
  
  connectFigma: async (accessToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'figma', 
      accessToken 
    });
  },
  
  connectQuickBooks: async (clientId, clientSecret, refreshToken) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'quickbooks', 
      clientId, 
      clientSecret, 
      refreshToken 
    });
  },
  
  connectAutoCAD: async (apiKey) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'autocad', 
      apiKey 
    });
  },
  
  connectCanvas: async (apiKey, domain) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'canvas', 
      apiKey, 
      domain 
    });
  },
  
  connectEpic: async (clientId, clientSecret) => {
    return await apiService.post(API_ENDPOINTS.integrations.all, { 
      service: 'epic', 
      clientId, 
      clientSecret 
    });
  },
  
  disconnectIntegration: async (integrationId) => {
    return await apiService.delete(API_ENDPOINTS.integrations.byId(integrationId));
  },
  
  getIntegrationStatus: async (service) => {
    return await apiService.get(API_ENDPOINTS.integrations.status(service));
  }
};

export default integrationService;