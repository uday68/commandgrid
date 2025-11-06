import { setupAxiosInterceptors } from './axiosInterceptor';
import connectionMonitor from './connectionMonitor';
import errorLogger from './errorLogger';
import errorHandler from './errorHandler';
import i18n from '../i18n';

/**
 * Initialize application components and error handling
 */
export const initializeApp = () => {
  // Setup global error handling
  setupGlobalErrorHandling();
  
  // Setup axios interceptors
  setupAxiosInterceptors();
  
  // Log app initialization
  console.log('Application initialized');
  
  return {
    connectionMonitor,
    errorLogger
  };
};

/**
 * Setup global error handlers
 */
const setupGlobalErrorHandling = () => {
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    errorLogger.logError(
      event.error || event.message, 
      'UncaughtException', 
      { 
        unhandled: true,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
    
    // Don't prevent default to allow browser's default error handling
  });
  
  // Log initial connection status
  connectionMonitor.addListener((isOnline) => {
    if (!isOnline) {
      errorLogger.logError(
        'App started in offline mode', 
        'ConnectionMonitor'
      );
    }
  });
  
  // Track i18n missing translations
  const originalT = i18n.t;
  i18n.t = function(key, options) {
    const result = originalT.call(i18n, key, options);
    
    if (typeof result === 'string' && result.includes(key) && !result.includes(' ')) {
      // This is likely a missing translation
      errorLogger.logError(
        `Missing translation: ${key}`, 
        'i18n',
        { 
          key, 
          namespace: options?.ns || i18n.defaultNS,
          language: i18n.language
        }
      );
    }
    
    return result;
  };
};

export default setupGlobalErrorHandling;
