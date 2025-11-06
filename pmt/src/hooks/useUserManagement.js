import { useState, useCallback, useEffect } from 'react';
import apiService from '../utils/api';
import { toast } from 'react-toastify';

/**
 * Custom hook for user management operations
 */
const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await apiService.users.getAll();
      setUsers(fetchedUsers);
      return fetchedUsers;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current user profile
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await apiService.users.getProfile();
      setCurrentUser(profile);
      return profile;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new user
  const createUser = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const newUser = await apiService.users.create(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a user
  const updateUser = useCallback(async (userId, userData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await apiService.users.update(userId, userData);
      setUsers(prev => prev.map(user => 
        user.user_id === userId ? { ...user, ...updatedUser } : user
      ));
      
      // If updating current user, update current user state
      if (currentUser?.user_id === userId) {
        setCurrentUser(prev => ({ ...prev, ...updatedUser }));
      }
      
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProfile = await apiService.users.updateProfile(profileData);
      setCurrentUser(prev => ({ ...prev, ...updatedProfile }));
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a user
  const deleteUser = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.users.delete(userId);
      setUsers(prev => prev.filter(user => user.user_id !== userId));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send welcome email
  const sendWelcomeEmail = useCallback(async (userId, templateType) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.users.sendWelcome(userId, { templateType });
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Change role
  const changeUserRole = useCallback(async (userId, newRole) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await apiService.users.updateRole(userId, newRole);
      setUsers(prev => prev.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // User skills management
  const getUserSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const skills = await apiService.users.getUserSkills();
      return skills;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addUserSkill = useCallback(async (skillData) => {
    try {
      setLoading(true);
      setError(null);
      const newSkill = await apiService.users.addUserSkill(skillData);
      return newSkill;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeUserSkill = useCallback(async (skillId) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.users.removeUserSkill(skillId);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.users.changePassword(currentPassword, newPassword);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize by loading current user
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  return {
    users,
    loading,
    error,
    currentUser,
    fetchUsers,
    fetchCurrentUser,
    createUser,
    updateUser,
    updateProfile,
    deleteUser,
    sendWelcomeEmail,
    changeUserRole,
    getUserSkills,
    addUserSkill,
    removeUserSkill,
    changePassword,
    // Helper functions for user management UI
    getUserDisplayName: (user) => user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown User',
    isAdmin: (user) => user?.role === 'Admin',
    isTeamLeader: (user) => user?.role === 'Team Leader' || user?.role === 'Project Manager',
    getMemberType: (user) => {
      const role = user?.role?.toLowerCase() || '';
      if (role.includes('admin')) return 'Administrator';
      if (role.includes('lead') || role.includes('manager')) return 'Manager';
      if (role.includes('dev')) return 'Developer';
      return 'Team Member';
    },
    sortUsersByRole: (userList) => {
      return [...userList].sort((a, b) => {
        const roleOrder = { 'admin': 1, 'manager': 2, 'leader': 3, 'member': 4 };
        const aRolePriority = Object.entries(roleOrder).find(([key]) => 
          (a.role || '').toLowerCase().includes(key))?.[1] || 999;
        const bRolePriority = Object.entries(roleOrder).find(([key]) => 
          (b.role || '').toLowerCase().includes(key))?.[1] || 999;
        
        return aRolePriority - bRolePriority;
      });
    }
  };
};

export default useUserManagement;
