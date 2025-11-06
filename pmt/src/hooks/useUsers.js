import { useState, useEffect, useCallback } from 'react';
import userService from '../services/api/userService';

/**
 * Custom hook for user management operations
 */
const useUsers = (initialFilters = {}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Fetch users with current filters
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUsers(filters);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Create a new user
  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const newUser = await userService.createUser(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing user
  const updateUser = async (userId, userData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await userService.updateUser(userId, userData);
      setUsers(prev => 
        prev.map(user => 
          user.user_id === userId ? updatedUser : user
        )
      );
      return updatedUser;
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a user
  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.user_id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Send welcome email
  const sendWelcomeEmail = async (userId, customMessage) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.sendWelcomeEmail(userId, customMessage);
      return response;
    } catch (err) {
      console.error('Error sending welcome email:', err);
      setError(err.message || 'Failed to send welcome email');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Impersonate a user
  const impersonateUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.impersonateUser(userId);
      
      // Save the impersonation token
      localStorage.setItem('authToken', response.token);
      if (response.user) {
        localStorage.setItem('impersonatingUser', JSON.stringify(response.user));
      }
      
      return response;
    } catch (err) {
      console.error('Error impersonating user:', err);
      setError(err.message || 'Failed to impersonate user');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // End impersonation
  const endImpersonation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.endImpersonation();
      
      // Update auth token
      localStorage.setItem('authToken', response.token);
      localStorage.removeItem('impersonatingUser');
      
      return response;
    } catch (err) {
      console.error('Error ending impersonation:', err);
      setError(err.message || 'Failed to end impersonation');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  return {
    users,
    loading,
    error,
    filters,
    selectedUser,
    setFilters,
    setSelectedUser,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    sendWelcomeEmail,
    impersonateUser,
    endImpersonation
  };
};

export default useUsers;
