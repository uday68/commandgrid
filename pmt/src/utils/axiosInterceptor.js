import axios from 'axios';
import { toast } from 'react-toastify';
import i18n from '../i18n';
import connectionMonitor from './connectionMonitor';
import errorHandler from './errorHandler';

/**
 * Configure global axios interceptors for error handling
 */
export const setupAxiosInterceptors = () => {
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Check if we're offline before making request
      if (!connectionMonitor.getStatus()) {
        // Cancel request if offline
        const controller = new AbortController();
        controller.abort(new Error(i18n.t('connection.offline', { ns: 'errors' })));
        config.signal = controller.signal;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Don't handle errors from canceled requests (like aborted file uploads)
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      // Handle unauthorized errors (token expiration)
      if (error.response?.status === 401 && window.location.pathname !== '/login') {
        // Clear authentication and redirect to login
        localStorage.removeItem('authToken');
        // Only redirect if we're not already heading to login
        const loginRedirect = setTimeout(() => {
          window.location.href = '/login?session=expired';
        }, 1000);

        // Show session expired toast
        toast.error(i18n.t('auth.sessionExpired', { ns: 'errors' }));

        // Allow cleanup if needed
        return Promise.reject({
          ...error,
          __handled: true,
          __cleanup: () => clearTimeout(loginRedirect)
        });
      }

      // Handle offline errors
      if (errorHandler.isNetworkError(error) || !navigator.onLine) {
        connectionMonitor.handleOffline();
      }

      // Handle server errors
      if (error.response?.status >= 500) {
        // Log to console
        console.error('Server error:', error.response);
      }

      return Promise.reject(error);
    }
  );
};

/**
 * Create an axios instance with configured error handling
 * @param {Object} options - Axios config options
 * @returns {AxiosInstance} Configured axios instance
 */
export const createAxiosInstance = (options = {}) => {
  const instance = axios.create({
    ...options,
    baseURL: options.baseURL || 'http://localhost:5000/api',
    timeout: options.timeout || 30000
  });

  // Add request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add same response interceptor as global axios
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      // Handle unauthorized errors
      if (error.response?.status === 401 && window.location.pathname !== '/login') {
        localStorage.removeItem('authToken');
        const loginRedirect = setTimeout(() => {
          window.location.href = '/login?session=expired';
        }, 1000);

        toast.error(i18n.t('auth.sessionExpired', { ns: 'errors' }));

        return Promise.reject({
          ...error,
          __handled: true,
          __cleanup: () => clearTimeout(loginRedirect)
        });
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create and export a preconfigured instance
export const api = createAxiosInstance();

export default setupAxiosInterceptors;
