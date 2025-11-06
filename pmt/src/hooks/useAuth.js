import { useContext } from 'react';
import AuthContext from '../context/AuthContext'; // Changed to default import

/**
 * Custom hook to access authentication state and methods
 * 
 * @returns {Object} Authentication state and methods
 */
const useAuth = () => {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    // Return a default object with empty functions to prevent errors
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      login: () => console.warn('Auth context not available'),
      logout: () => console.warn('Auth context not available'),
      register: () => console.warn('Auth context not available'),
      hasPermission: () => false
    };
  }
  
  return {
    // Spread all properties from the AuthContext
    ...authContext,
    // Add any additional auth-related utility functions here
    isAuthenticated: Boolean(authContext.user),
    isAdmin: authContext.user?.isAdmin || authContext.user?.role === 'Admin',
    hasPermission: (permission) => {
      return authContext.user?.permissions?.includes(permission) || false;
    }
  };
};

export default useAuth;
