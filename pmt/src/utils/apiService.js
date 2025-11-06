/**
 * API Service
 * 
 * A comprehensive service for making API calls with automatic token refresh,
 * error handling, and offline support.
 */

import axios from 'axios';
import { toast } from 'react-toastify';
import connectionMonitor from './connectionMonitor';
import errorHandler from './errorHandler';

// Create Axios instance with defaults
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error messages for different scenarios
const ERROR_MESSAGES = {
  networkError: 'Network connection error. Please check your internet connection.',
  serverError: 'Server error occurred. Our team has been notified.',
  notFound: 'Resource not found.',
  validationError: 'Validation error. Please check your inputs.',
  unauthorized: 'You are not authorized to perform this action.',
  forbidden: 'Access denied.',
  sessionExpired: 'Session expired. Please login again.',
  defaultError: 'An unexpected error occurred.'
};

// Function to get cached response for offline fallback
const getCachedResponse = async (request) => {
  try {
    const cacheKey = `api_cache_${request.url}_${JSON.stringify(request.params || {})}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving cached response:', error);
    return null;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    errorHandler.logError(error, 'API Request');
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses for offline fallback
    if (response.config.method === 'get') {
      try {
        const cacheKey = `api_cache_${response.config.url}_${JSON.stringify(response.config.params || {})}`;
        localStorage.setItem(cacheKey, JSON.stringify(response.data));
      } catch (err) {
        console.warn('Failed to cache response:', err);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle offline/network errors with cached data for GET requests
    if (!error.response) {
      if (!navigator.onLine || !connectionMonitor.getStatus()) {
        // Device is offline, try to return cached data for GET requests
        if (originalRequest.method === 'get') {
          return getCachedResponse(originalRequest)
            .then(cachedData => {
              if (cachedData) {
                toast.info('Showing cached data. Some information may be outdated.');
                return { 
                  data: cachedData,
                  status: 200, 
                  headers: {},
                  config: originalRequest,
                  statusText: 'OK (Cached)'
                };
              }
              throw error;
            })
            .catch(() => {
              toast.error(ERROR_MESSAGES.networkError);
              return Promise.reject(error);
            });
        }
      }
      
      toast.error(ERROR_MESSAGES.networkError);
    } else if (error.response?.status >= 500) {
      toast.error(ERROR_MESSAGES.serverError);
      errorHandler.logError(error, 'API.ServerError', { status: error.response.status });
    } else if (error.response?.status === 404) {
      toast.error(ERROR_MESSAGES.notFound);
    } else if (error.response?.status === 400) {
      toast.error(error.response?.data?.error || ERROR_MESSAGES.validationError);
    } else if (error.response?.status === 401) {
      // Handle token expiration
      if (originalRequest._retry !== true && error.response?.data?.message?.includes('expired')) {
        originalRequest._retry = true;
        try {
          // Attempt to refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await api.post('/auth/refresh-token', { refreshToken });
            const { authToken } = refreshResponse.data;
            
            localStorage.setItem('authToken', authToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${authToken}`;
            
            return api(originalRequest);
          }
        } catch (refreshError) {
          toast.error(refreshError?.response?.data?.message || ERROR_MESSAGES.sessionExpired);
          // Force logout
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login?session=expired';
        }
        return api(originalRequest);
      } else {
        toast.error(error.response?.data?.message || ERROR_MESSAGES.unauthorized);
        // Clear authentication and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    } else {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.defaultError);
    }
    
    // Log the error
    errorHandler.logError(error, 'API.ResponseError', {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status
    });
    
    return Promise.reject(error);
  }
);

export default api;
