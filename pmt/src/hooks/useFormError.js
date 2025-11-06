import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import errorHandler from '../utils/errorHandler';

/**
 * Custom hook for form error handling
 * Manages both field-level errors and form-level errors
 */
const useFormError = (options = {}) => {
  const { context = 'form' } = options;
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const { t } = useTranslation('errors');

  /**
   * Set an error for a specific field
   * @param {string} field - Field name
   * @param {string} message - Error message
   */
  const setFieldError = useCallback((field, message) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  /**
   * Clear errors for specific fields
   * @param {Array} fields - Field names to clear (clears all if not provided)
   */
  const clearFieldErrors = useCallback((fields = null) => {
    if (!fields) {
      setFieldErrors({});
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        fields.forEach(field => {
          delete newErrors[field];
        });
        return newErrors;
      });
    }
  }, []);

  /**
   * Handle API error response focusing on validation errors
   * @param {Error} error - Error object from API call
   */
  const handleApiError = useCallback((error) => {
    errorHandler.logError(error, context);
    
    // Clear previous errors
    setFormError('');
    clearFieldErrors();
    
    // Handle validation errors
    if (error.response?.data?.validationErrors) {
      const validationErrors = error.response.data.validationErrors;
      
      // Set field errors
      setFieldErrors(validationErrors);
      
      // Set generic form error
      setFormError(t('general.validationFailed'));
      return;
    }
    
    // Handle other API errors
    setFormError(errorHandler.getErrorMessage(error));
  }, [t, clearFieldErrors, context]);

  /**
   * Check if a field has an error
   * @param {string} field - Field name
   * @returns {boolean} Whether the field has an error
   */
  const hasFieldError = useCallback((field) => {
    return Boolean(fieldErrors[field]);
  }, [fieldErrors]);

  /**
   * Get all errors (field and form)
   * @returns {Object} All errors
   */
  const getAllErrors = useCallback(() => {
    return {
      fields: fieldErrors,
      form: formError
    };
  }, [fieldErrors, formError]);

  /**
   * Check if the form has any errors
   * @returns {boolean} Whether the form has any errors
   */
  const hasErrors = useCallback(() => {
    return Boolean(formError) || Object.keys(fieldErrors).length > 0;
  }, [fieldErrors, formError]);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  return {
    fieldErrors,
    formError,
    setFieldError,
    setFormError,
    clearFieldErrors,
    clearFormError: () => setFormError(''),
    handleApiError,
    hasFieldError,
    hasErrors,
    getAllErrors,
    clearAllErrors
  };
};

export default useFormError;
