/**
 * API Configuration Module
 * 
 * Centralizes all API connection settings for the application
 */

// Base API URLs - use environment variables with fallbacks
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
export const API_ENDPOINTS = {
  auth: {
    login: '/api/login',
    register: '/api/register',
    refresh: '/api/refresh-token',
    logout: '/api/logout',
    resetPassword: '/api/reset-password',
  },
  users: {
    profile: '/api/users/profile',
    updateProfile: '/api/users/profile',
    all: '/api/users',
    byId: (id) => `/api/users/${id}`,
  },
  projects: {
    all: '/api/projects',
    active: '/api/projects/active', 
    byId: (id) => `/api/projects/${id}`,
    members: (id) => `/api/projects/${id}/members`,
    tasks: (id) => `/api/projects/${id}/tasks`,
  },
  teams: {
    all: '/api/project-manager/teams',
    byId: (id) => `/api/project-manager/teams/${id}`,
    members: (id) => `/api/project-manager/team/${id}/members`,
    addMembers: (id) => `/api/project-manager/team/${id}/add-members`,
  },
  tasks: {
    all: '/api/tasks',
    assigned: '/api/tasks/assigned',
    byId: (id) => `/api/tasks/${id}`,
  },
  chat: {
    room: (id) => `/api/chat/${id}`,
    pinned: (id) => `/api/chat/${id}/pinned`,
  },
  metrics: '/api/metrics',
  activities: {
    recent: '/api/activities/recent',
  },
  admin: {
    stats: '/api/admin/stats',
    projects: '/api/admin/projects',
    users: '/api/admin/users',
    security: '/api/admin/security-scan',
  },  integrations: {
    all: '/integrations',
    byId: (id) => `/integrations/${id}`,
    status: (service) => `/integrations/${service}/status`,
  },
  meetings: {
    all: '/api/meetings',
    byId: (id) => `/api/meetings/${id}`,
    join: (id) => `/api/meetings/${id}/join`,
  },
  // Add other endpoints as needed
};

// WebSocket connection settings
export const SOCKET_CONFIG = {
  url: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
  options: {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false, // We'll manage connection manually
  }
};

// Request configuration defaults
export const REQUEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retryCount: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// HTTP status codes that should trigger token refresh
export const TOKEN_REFRESH_STATUS_CODES = [401];

// Error messages
export const ERROR_MESSAGES = {
  networkError: 'Network error. Please check your connection.',
  serverError: 'Server error. Please try again later.',
  authError: 'Authentication error. Please login again.',
  notFound: 'Resource not found.',
  validationError: 'Validation error. Please check your input.',
  default: 'An unexpected error occurred.',
};
