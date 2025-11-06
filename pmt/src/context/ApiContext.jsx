import React, { createContext, useContext } from 'react';
import apiService from '../utils/apiService';
import socketManager from '../utils/socketManager';
import { API_ENDPOINTS } from '../config/apiConfig';

// Create context
const ApiContext = createContext(null);

// Custom hook to use the API context
export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

// API Provider component
export const ApiProvider = ({ children }) => {
  // Value to provide to consumers
  const value = {
    // Core services
    api: apiService,
    socket: socketManager,
    endpoints: API_ENDPOINTS,
    
    // Auth-specific methods
    auth: {
      login: async (credentials) => {
        return await apiService.post(API_ENDPOINTS.auth.login, credentials);
      },
      register: async (userData) => {
        return await apiService.post(API_ENDPOINTS.auth.register, userData);
      },
      logout: async () => {
        const result = await apiService.post(API_ENDPOINTS.auth.logout);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return result;
      },
      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;
        
        const result = await apiService.post(API_ENDPOINTS.auth.refresh, { refreshToken });
        if (result.authToken) {
          localStorage.setItem('authToken', result.authToken);
          localStorage.setItem('refreshToken', result.refreshToken);
        }
        return result;
      }
    },
    
    // User-specific methods
    users: {
      getProfile: async () => {
        return await apiService.get(API_ENDPOINTS.users.profile);
      },
      updateProfile: async (profileData) => {
        return await apiService.put(API_ENDPOINTS.users.profile, profileData);
      },
      getAll: async () => {
        return await apiService.get(API_ENDPOINTS.users.all);
      },
      getById: async (id) => {
        return await apiService.get(API_ENDPOINTS.users.byId(id));
      }
    },
    
    // Projects methods
    projects: {
      getAll: async () => {
        return await apiService.get(API_ENDPOINTS.projects.all);
      },
      getActive: async () => {
        return await apiService.get(API_ENDPOINTS.projects.active);
      },
      getById: async (id) => {
        return await apiService.get(API_ENDPOINTS.projects.byId(id));
      },
      create: async (projectData) => {
        return await apiService.post(API_ENDPOINTS.projects.all, projectData);
      },
      update: async (id, projectData) => {
        return await apiService.put(API_ENDPOINTS.projects.byId(id), projectData);
      },
      delete: async (id) => {
        return await apiService.delete(API_ENDPOINTS.projects.byId(id));
      },
      getMembers: async (id) => {
        return await apiService.get(API_ENDPOINTS.projects.members(id));
      },
      getTasks: async (id) => {
        return await apiService.get(API_ENDPOINTS.projects.tasks(id));
      }
    },
    
    // Teams methods
    teams: {
      getAll: async () => {
        return await apiService.get(API_ENDPOINTS.teams.all);
      },
      getById: async (id) => {
        return await apiService.get(API_ENDPOINTS.teams.byId(id));
      },
      create: async (teamData) => {
        return await apiService.post(API_ENDPOINTS.teams.all, teamData);
      },
      update: async (id, teamData) => {
        return await apiService.put(API_ENDPOINTS.teams.byId(id), teamData);
      },
      delete: async (id) => {
        return await apiService.delete(API_ENDPOINTS.teams.byId(id));
      },
      getMembers: async (id) => {
        return await apiService.get(API_ENDPOINTS.teams.members(id));
      },
      addMembers: async (id, members) => {
        return await apiService.post(API_ENDPOINTS.teams.addMembers(id), { members });
      }
    },
    
    // Tasks methods
    tasks: {
      getAll: async () => {
        return await apiService.get(API_ENDPOINTS.tasks.all);
      },
      getAssigned: async () => {
        return await apiService.get(API_ENDPOINTS.tasks.assigned);
      },
      getById: async (id) => {
        return await apiService.get(API_ENDPOINTS.tasks.byId(id));
      },
      create: async (taskData) => {
        return await apiService.post(API_ENDPOINTS.tasks.all, taskData);
      },
      update: async (id, taskData) => {
        return await apiService.put(API_ENDPOINTS.tasks.byId(id), taskData);
      },
      delete: async (id) => {
        return await apiService.delete(API_ENDPOINTS.tasks.byId(id));
      }
    }
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export default ApiContext;
