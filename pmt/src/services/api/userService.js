import axios from 'axios';

// Configure axios with defaults
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const userService = {
  /**
   * Get users with optional filtering
   */
  getUsers: async (filters = {}) => {
    const { search, role, status, sort, order } = filters;
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      if (sort) params.append('sort', sort);
      if (order) params.append('order', order);
      
      const response = await axios.get(`${API_URL}/api/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Create a new user
   */
  createUser: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/users`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Update an existing user
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Delete a user
   */
  deleteUser: async (userId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Send welcome email to a user
   */
  sendWelcomeEmail: async (userId, customMessage = '') => {
    try {
      const response = await axios.post(`${API_URL}/api/users/${userId}/send-welcome`, { 
        customMessage 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Get user activity
   */
  getUserActivity: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}/activity`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Reset user password
   */
  resetUserPassword: async (userId, newPassword) => {
    try {
      const response = await axios.post(`${API_URL}/api/users/${userId}/reset-password`, { 
        newPassword 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * Impersonate a user (admin only)
   */
  impersonateUser: async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/api/users/impersonate`, { userId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  /**
   * End user impersonation
   */
  endImpersonation: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/users/end-impersonation`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default userService;
