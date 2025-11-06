// src/integrations/IntegrationSystem.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  FaSlack, FaJira, FaTrello, FaGithub, FaGoogleDrive, 
  FaClock, FaCalendarAlt, FaVideo, FaPlug, FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import integrationService from '../../../services/integrationService';
import { useTranslation } from 'react-i18next';

const IntegrationContext = createContext();

export const IntegrationProvider = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [connections, setConnections] = useState({});

  const INTEGRATIONS_CONFIG = [
    {
      id: 'slack',
      name: t('integrations.slack.name'),
      icon: <FaSlack />,
      authType: 'oauth2',
      scopes: ['channels:read', 'chat:write'],
      connect: async () => handleOAuthConnect('slack'),
      getStatus: () => checkConnection('slack')
    },
    {
      id: 'jira',
      name: t('integrations.jira.name'),
      icon: <FaJira />,
      authType: 'api_token',
      fields: ['base_url', 'api_key'],
      connect: (creds) => handleApiKeyConnect('jira', creds),
      getStatus: () => checkConnection('jira')
    },
    {
      id: 'github',
      name: t('integrations.github.name'),
      icon: <FaGithub />,
      authType: 'oauth2',
      scopes: ['repo', 'admin:org'],
      connect: async () => handleOAuthConnect('github'),
      getStatus: () => checkConnection('github')
    },
    // Add other integrations following same pattern
  ];

  useEffect(() => {
    const loadConnections = async () => {
      try {
        // Use the integrationService instead of direct api call
        const data = await integrationService.getAllIntegrations();
        setConnections(data.reduce((acc, curr) => ({
          ...acc,
          [curr.id]: 'connected'
        }), {}));
      } catch (error) {
        console.error('Failed to load connections:', error);
      }
    };
    
    if (user) loadConnections();
  }, [user]);

  const handleOAuthConnect = async (service) => {
    try {
      // Different OAuth services can be handled here
      if (service === 'github') {
        await integrationService.connectGitHub(null); // This will trigger OAuth flow
      } else if (service === 'slack') {
        await integrationService.connectSlack(null); // This will trigger OAuth flow
      }
    } catch (error) {
      console.error(`${service} OAuth failed:`, error);
    }
  };

  const handleApiKeyConnect = async (service, credentials) => {
    try {
      // Map to appropriate integrationService methods
      if (service === 'jira') {
        await integrationService.connectJira(credentials.api_key, credentials.base_url);
      }
      // Add other services as needed
      
      setConnections(prev => ({ ...prev, [service]: 'connected' }));
    } catch (error) {
      console.error(`${service} connection failed:`, error);
    }
  };

  const checkConnection = async (service) => {
    try {
      // Use integrationService
      const status = await integrationService.getIntegrationStatus(service);
      return status && status.connected;
    } catch (error) {
      return false;
    }
  };

  return (
    <IntegrationContext.Provider value={{ 
      integrations: INTEGRATIONS_CONFIG,
      connections,
      refreshConnections: () => loadConnections()
    }}>
      {children}
    </IntegrationContext.Provider>
  );
};

export const useIntegrations = () => useContext(IntegrationContext);