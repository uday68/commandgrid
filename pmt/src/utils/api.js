import axios from 'axios';

// Base URLs for different services
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const AI_BASE_URL = process.env.REACT_APP_AI_URL || 'http://localhost:8000';

// Create axios instances with default configurations
const api = axios.create({
  baseURL: BASE_URL,
});

const aiApi = axios.create({
  baseURL: AI_BASE_URL,
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for AI API calls
aiApi.interceptors.request.use(
  (config) => {
    // First try to use the AI-specific token if available
    const aiToken = localStorage.getItem('aiAuthToken');
    if (aiToken) {
      config.headers['Authorization'] = `Bearer ${aiToken}`;
    } else {
      // Fall back to the main auth token
      const mainToken = localStorage.getItem('authToken');
      if (mainToken) {
        config.headers['Authorization'] = `Bearer ${mainToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Define API service with organized endpoints
const apiService = {
  auth: {
    login: (credentials) => api.post('auth/login', credentials),
    register: (userData) => api.post('auth/register', userData),
    refreshToken: () => api.post('auth/refresh-token', {
      refreshToken: localStorage.getItem('refreshToken')
    }),
    logout: () => api.post('/logout')
  },
  
  projects: {
    getAll: () => api.get('/projects'),
    getById: (id) => api.get(`/projects/${id}`),
    create: (projectData) => api.post('/projects', projectData),
    update: (id, projectData) => api.put(`/projects/${id}`, projectData),
    delete: (id) => api.delete(`/projects/${id}`),
    getTasks: (projectId) => api.get(`/projects/${projectId}/tasks`)
  },
  
  tasks: {
    getAll: () => api.get('/tasks'),
    getById: (id) => api.get(`/tasks/${id}`),
    create: (taskData) => api.post('/tasks', taskData),
    update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
    delete: (id) => api.delete(`/tasks/${id}`),
    getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
    addComment: (taskId, comment) => api.post(`/tasks/${taskId}/comments`, { comment })
  },  chat: {
    getHistory: () => aiApi.get('/api/chat/history'),
    sendMessage: (message) => aiApi.post('/api/chat/message', message),
    getMessages: (roomId) => api.get(`/chat/${roomId}`),
    sendRoomMessage: (roomId, message) => api.post(`/chat/${roomId}/messages`, { message }),
    getRooms: () => api.get('/chat/rooms'),
    createRoom: (roomData) => api.post('/admin/chat-rooms', roomData),
    deleteRoom: (roomId) => api.delete(`/admin/chat-rooms/${roomId}`),
    addUsersToRoom: (roomId, userIds) => api.post(`/admin/chat-rooms/${roomId}/users`, { userIds }),
    removeUserFromRoom: (roomId, userId) => api.delete(`/admin/chat-rooms/${roomId}/users/${userId}`),
  },
  
  users: {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`)
  },
  
  notifications: {
    getAll: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/mark-all-read')
  },
  
  files: {
    upload: (formData) => api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
};

export default apiService;
