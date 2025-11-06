import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import errorHandler from '../utils/errorHandler';

/**
 * Custom hook for handling errors in components
 * @param {Object} options - Configuration options
 * @param {boolean} options.showToast - Whether to show toast notifications for errors
 * @param {string} options.context - The context for error logging
 * @returns {Object} Error handling methods and state
 */
export const useError = ({ showToast = false, context = 'General' } = {}) => {
  const [error, setErrorState] = useState(null);
  
  const setError = useCallback((err, metadata = {}) => {
    // Parse the error to extract a user-friendly message
    const errorMessage = typeof err === 'string' 
      ? err 
      : errorHandler.getErrorMessage(err);
    
    // Update state with the error message
    setErrorState(errorMessage);
    
    // Log the error
    errorHandler.logError(err, context, metadata);
    
    // Show toast notification if enabled
    if (showToast && errorMessage) {
      toast.error(errorMessage, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    }
    
    return errorMessage;
  }, [showToast, context]);
  
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);
  
  return { error, setError, clearError };
};

export default useError;
