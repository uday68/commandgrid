import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const communityService = {
  // Posts
  getPosts: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/community/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  createPost: async (postData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/community/posts`, postData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  // Comments
  addComment: async (postId, commentData) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_BASE_URL}/community/posts/${postId}/comments`, commentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Help Requests
  getHelpRequests: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/community/help-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching help requests:', error);
      throw error;
    }
  },

  createHelpRequest: async (requestData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/community/help-requests`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating help request:', error);
      throw error;
    }
  },

  // Spaces
  getSpaces: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/community/spaces`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching spaces:', error);
      throw error;
    }
  },

  joinSpace: async (spaceId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/community/spaces/${spaceId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error joining space:', error);
      throw error;
    }
  },

  // Profile
  getUserProfile: async (userId) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/community/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default communityService;
