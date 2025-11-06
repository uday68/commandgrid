import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../utils/api';
import { toast } from 'react-toastify';

// Create context
const AuthContext = createContext(null);

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have user data in localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
          
          // Verify token is still valid with a lightweight API call
          try {
            const profile = await apiService.users.getProfile();
            if (profile) {
              // Update user data with latest from server
              const updatedUserData = { ...JSON.parse(userData), ...profile };
              setUser(updatedUserData);
              localStorage.setItem('userData', JSON.stringify(updatedUserData));
            }
          } catch (err) {
            // Token might be invalid, clear auth data
            if (err?.response?.status === 401) {
              console.log('Auth token expired, redirecting to login');
              await logout();
              navigate('/login', { state: { from: location.pathname } });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await apiService.auth.login({ email, password });
      setUser(result.user);
      
      // Get redirect URL from location state or default to dashboard
      const from = location?.state?.from || '/dashboard';
      navigate(from);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await apiService.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
      navigate('/login');
    }
  }, [navigate]);
  
  // Check if user has a specific role
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return false;
  }, [user]);
  
  // Update user function (for profile updates)
  const updateUser = useCallback((updatedData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  }, [user]);
  
  // The context value
  const contextValue = {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    updateUser,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Route guard component
export const RequireAuth = ({ children, roles = [] }) => {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Don't redirect until we've initialized
    if (!initialized) return;
    
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    // If roles specified and user doesn't have required role, redirect to forbidden
    if (user && roles.length > 0 && !roles.includes(user.role)) {
      toast.error('You do not have permission to access this page');
      navigate('/forbidden');
    }
  }, [user, loading, initialized, navigate, location.pathname, roles]);
  
  // Show loading state if loading or not initialized
  if (loading || !initialized) {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show children if authenticated and role requirements met
  return user ? children : null;
};

export default AuthContext;
