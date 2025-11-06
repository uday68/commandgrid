import { useState, useEffect } from 'react';
import userService from '../services/api/userService';

/**
 * Hook for tracking and managing user impersonation
 */
const useImpersonation = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if we're impersonating on initial load
  useEffect(() => {
    const impUser = localStorage.getItem('impersonatingUser');
    if (impUser) {
      try {
        setImpersonatedUser(JSON.parse(impUser));
        setIsImpersonating(true);
      } catch (err) {
        console.error('Error parsing impersonated user:', err);
        localStorage.removeItem('impersonatingUser');
      }
    }
  }, []);
  
  // Function to end impersonation
  const endImpersonation = async () => {
    try {
      setIsEnding(true);
      setError(null);
      
      const response = await userService.endImpersonation();
      
      // Update auth token
      localStorage.setItem('authToken', response.token);
      localStorage.removeItem('impersonatingUser');
      
      setIsImpersonating(false);
      setImpersonatedUser(null);
      
      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';
    } catch (err) {
      console.error('Error ending impersonation:', err);
      setError(err.message || 'Failed to end impersonation');
    } finally {
      setIsEnding(false);
    }
  };
  
  return {
    isImpersonating,
    impersonatedUser,
    isEnding,
    error,
    endImpersonation
  };
};

export default useImpersonation;
