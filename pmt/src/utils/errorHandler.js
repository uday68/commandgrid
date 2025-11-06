import errorLogger from './errorLogger';

/**
 * Comprehensive error handler for the application
 * Works with errorLogger to provide consistent error handling
 */
const errorHandler = {
  /**
   * Log an error to local storage and console
   * @param {Error|string} error - The error to log
   * @param {string} context - Where the error occurred
   * @param {Object} metadata - Additional information about the error
   */
  logError(error, context = 'General', metadata = {}) {
    // Use the errorLogger to log the error
    return errorLogger.logError(error, context, metadata);
  },

  /**
   * Get a user-friendly error message from an error object
   * @param {Error|Object} error - The error object
   * @param {string} defaultMessage - Message to use if no specific message can be extracted
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error, defaultMessage = 'An error occurred') {
    if (!error) return defaultMessage;

    // If it's a string, return it directly
    if (typeof error === 'string') return error;

    // Handle network errors
    if (this.isNetworkError(error)) {
      return 'Network connection error. Please check your internet connection.';
    }

    // Try to extract message from various error formats
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.message) return error.message;
    
    return defaultMessage;
  },

  /**
   * Check if the error is network-related
   * @param {Error|Object} error - The error to check
   * @returns {boolean} True if it's a network error
   */
  isNetworkError(error) {
    if (!error) return false;
    
    if (error.isAxiosError && !error.response) return true;
    
    const networkErrorMessages = [
      'network error',
      'failed to fetch',
      'networkerror',
      'timeout',
      'abort',
      'cannot connect',
      'connection refused',
      'name not resolved',
      'err_name_not_resolved',
      'internet disconnected',
    ];
    
    const errorString = (error.message || '').toLowerCase();
    return networkErrorMessages.some(msg => errorString.includes(msg));
  },

  /**
   * Check if the device is currently offline
   * @returns {boolean} True if the device is offline
   */
  isOffline() {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  },

  /**
   * Handle API errors in a standardized way
   * @param {Error} error - The error from API call
   * @param {Function} setErrorState - Function to update error state
   * @param {Function} showToast - Optional function to show toast notification
   */
  handleApiError(error, setErrorState, showToast) {
    const errorMessage = this.getErrorMessage(error);
    
    // Update error state if function provided
    if (setErrorState && typeof setErrorState === 'function') {
      setErrorState(errorMessage);
    }
    
    // Show toast if function provided
    if (showToast && typeof showToast === 'function') {
      showToast(errorMessage, { type: 'error' });
    }
    
    // Always log the error
    this.logError(error, 'API');
    
    return errorMessage;
  }
};

export default errorHandler;
