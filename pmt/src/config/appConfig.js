/**
 * Application configuration
 */

// Application info
export const APP_NAME = 'Project Management Tool';
export const APP_VERSION = '1.0.0';

// API endpoints
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Storage paths
export const NEXAFLOW_STORAGE_PATH = process.env.REACT_APP_NEXAFLOW_PATH || 'D:/nexaflow_storage';
export const DEFAULT_UPLOAD_BUCKET = 'project-files';

// Authentication
export const AUTH_TOKEN_KEY = 'authToken';
export const USER_DATA_KEY = 'userData';
export const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes before expiry to refresh

// Features
export const FEATURES = {
  OFFLINE_MODE: true,
  REALTIME_UPDATES: true,
  LOCAL_FILE_STORAGE: true,
  DATA_SYNCHRONIZATION: true,
  ANALYTICS: process.env.NODE_ENV === 'production'
};

// Default settings
export const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'hi',
  notifications: true,
  compactView: false,
  autoSave: true
};

// Performance
export const MAX_BATCH_SIZE = 100;
export const CACHE_DURATION = 3600000; // 1 hour
export const SYNC_INTERVAL = 300000; // 5 minutes

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];
