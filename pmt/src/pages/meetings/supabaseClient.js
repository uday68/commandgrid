import axios from 'axios';
import { toast } from 'react-toastify';
import errorHandler from '../../utils/errorHandler';
import connectionMonitor from '../../utils/connectionMonitor';
import { API_BASE_URL } from '../../config/apiConfig';

const NEXAFLOW_STORAGE_PATH = import.meta.env.VITE_NEXAFLOW_STORAGE_PATH || 'nexaflow_storage';

/**
 * A utility class for storage operations that mimics Supabase-like functionality
 * Used for caching data and offline capabilities
 */
class NexaflowStorage {
  /**
   * Save data to the specified storage type
   * @param {string} key - Unique key for the data
   * @param {any} data - Data to store
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<boolean>} Success status
   */
  async saveData(key, data, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      const serializedData = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      
      storage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve data from the specified storage type
   * @param {string} key - Key to retrieve
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<any>} Retrieved data
   */
  async getData(key, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      const serializedData = storage.getItem(key);
      
      if (!serializedData) return null;
      
      return JSON.parse(serializedData);
    } catch (error) {
      console.error('Storage retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Remove data from storage
   * @param {string} key - Key to remove
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<boolean>} Success status
   */
  async removeData(key, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage removal error:', error);
      return false;
    }
  }
  
  /**
   * Clear all data from the specified storage
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<boolean>} Success status
   */
  async clearStorage(type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      storage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
  
  /**
   * Get storage object by type
   * @param {string} type - Storage type
   * @returns {Storage} Storage object
   * @private
   */
  _getStorageByType(type) {
    switch (type) {
      case 'session':
        return window.sessionStorage;
      case 'cache':
      case 'local':
      default:
        return window.localStorage;
    }
  }
}

// Export an instance to use throughout the application
export const nexaflowStorage = new NexaflowStorage();

// Utility function to safely create URL objects
function createSafeUrl(urlString, fallbackUrl = null) {
  try {
    if (!urlString) {
      throw new Error('URL string is undefined or empty');
    }
    return new URL(urlString);
  } catch (error) {
    console.error('Invalid URL:', urlString, error);
    errorHandler.logError(error, 'URL Creation');
    
    // Return fallback URL if provided, otherwise null
    return fallbackUrl ? new URL(fallbackUrl) : null;
  }
}

// Functions for local storage operations with error handling
function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    errorHandler.logError(error, `saveToLocalStorage:${key}`);
    return false;
  }
}

function loadFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    errorHandler.logError(error, `loadFromLocalStorage:${key}`);
    return null;
  }
}

// Convert data URI to Blob (helper for offline file handling)
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeString });
}

// Helper to read file as data URL for offline storage
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// Create API client for database operations
const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authentication token to requests if available
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Export a mock Supabase client for backward compatibility
// This will allow code that expects Supabase to still work but use our backend API
export const supabase = {
  auth: {
    signUp: async ({ email, password, options }) => {
      try {
        const response = await apiClient.post('/auth/register', {
          email, 
          password,
          name: options?.data?.full_name,
          avatarUrl: options?.data?.avatar_url
        });
        return { data: response.data, error: null };
      } catch (error) {
        return { data: null, error: error.response?.data || error.message };
      }
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const response = await apiClient.post('/login', { email, password });
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        return { data: response.data, error: null };
      } catch (error) {
        return { data: null, error: error.response?.data || error.message };
      }
    },
    signOut: async () => {
      try {
        await apiClient.post('/logout');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        return { error: null };
      } catch (error) {
        return { error: error.response?.data || error.message };
      }
    },
    getSession: async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return { data: null, error: null };
        
        const response = await apiClient.get('/auth/session');
        return { data: response.data, error: null };
      } catch (error) {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
        }
        return { data: null, error: error.response?.data || error.message };
      }
    },
    setSession: async (sessionData) => {
      // Just store the token if passed
      if (sessionData?.access_token) {
        localStorage.setItem('authToken', sessionData.access_token);
      }
      return { data: {}, error: null };
    },
    updateUser: async ({ data }) => {
      try {
        const response = await apiClient.put('/users/profile', data);
        return { data: response.data, error: null };
      } catch (error) {
        return { data: null, error: error.response?.data || error.message };
      }
    },
    signInAnonymously: async () => {
      // Return empty successful response for anonymous sessions
      return { data: {}, error: null };
    }
  },
  storage: {
    from: (bucket) => ({
      upload: async (path, file, options) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', path);
          formData.append('bucket', bucket);
          
          const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (options?.onUploadProgress) {
                options.onUploadProgress(progressEvent);
              }
            }
          };
          
          const response = await apiClient.post('/storage/upload', formData, config);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      download: async (path) => {
        try {
          const response = await apiClient.get(`/storage/download/${bucket}/${path}`, {
            responseType: 'blob'
          });
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      list: async (path) => {
        try {
          const response = await apiClient.get(`/storage/list/${bucket}/${path}`);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      getPublicUrl: (path) => {
        return { 
          data: { 
            publicUrl: `${apiClient.defaults.baseURL}/storage/public/${bucket}/${path}` 
          }
        };
      }
    })
  },
  from: (table) => {
    const query = {
      select: async (columns = '*') => {
        try {
          const response = await apiClient.get(`/db/${table}?select=${columns}`);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      insert: async (values) => {
        try {
          const response = await apiClient.post(`/db/${table}`, values);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      update: async (values) => {
        try {
          const response = await apiClient.put(`/db/${table}`, values);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        } 
      },
      delete: async () => {
        try {
          const response = await apiClient.delete(`/db/${table}`);
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      eq: (column, value) => {
        const encodedValue = encodeURIComponent(value);
        query._filters = query._filters || [];
        query._filters.push(`${column}=eq.${encodedValue}`);
        return query;
      },
      in: (column, values) => {
        const valuesStr = values.join(',');
        query._filters = query._filters || [];
        query._filters.push(`${column}=in.(${valuesStr})`);
        return query;
      },
      order: (column, options) => {
        const direction = options?.ascending ? 'asc' : 'desc';
        query._order = `${column}.${direction}`;
        return query;
      },
      limit: (count) => {
        query._limit = count;
        return query;
      },
      single: () => {
        query._single = true;
        return { 
          then: async (resolve, reject) => {
            try {
              const result = await query;
              if (result.data && result.data.length > 0) {
                resolve({ data: result.data[0], error: null });
              } else {
                resolve({ data: null, error: null });
              }
            } catch (error) {
              reject(error);
            }
          }
        };
      }
    };
    
    // Add the ability to execute the query
    const executeQuery = async () => {
      const filters = query._filters ? `&filters=${query._filters.join(',')}` : '';
      const order = query._order ? `&order=${query._order}` : '';
      const limit = query._limit ? `&limit=${query._limit}` : '';
      const single = query._single ? '&single=true' : '';
      
      try {
        const response = await apiClient.get(`/db/${table}?select=*${filters}${order}${limit}${single}`);
        return { data: response.data, error: null };
      } catch (error) {
        return { data: null, error: error.response?.data || error.message };
      }
    };
    
    // Make the query object callable
    const queryProxy = new Proxy(query, {
      apply: (target, thisArg, args) => executeQuery()
    });
    
    return queryProxy;
  }
};

// Safe method to get public URL for files
export function getPublicUrl(bucket, path) {
  try {
    if (!path || !bucket) {
      throw new Error('Missing required parameters');
    }
    
    return `${apiClient.defaults.baseURL}/storage/public/${bucket}/${path}`;
  } catch (error) {
    console.error('Error getting public URL:', error);
    errorHandler.logError(error, 'Storage');
    return null;
  }
}

// Helper function to handle file uploads to storage
export const uploadFileToStorage = async (file, bucket, folder = '') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    // If offline, store locally and queue for upload when online
    if (!connectionMonitor.getStatus()) {
      // Read file as data URL for local storage
      const dataUrl = await readFileAsDataURL(file);
      
      // Save file data to local storage
      await nexaflowStorage.saveData(`file_${filePath}`, dataUrl, 'files');
      
      // Add to upload queue for when we're back online
      const uploadQueue = (await nexaflowStorage.getData('_upload_queue')) || { data: [] };
      uploadQueue.data.push({
        file: {
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type
        },
        bucket,
        timestamp: Date.now()
      });
      
      await nexaflowStorage.saveData('_upload_queue', uploadQueue.data);
      
      toast.info('File saved locally. Will upload when online.');
      
      // Return mock response with local path
      return {
        path: filePath,
        url: `local://${filePath}`,
        name: file.name,
        size: file.size,
        type: file.type,
        offline: true
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);
    formData.append('bucket', bucket);
    
    const response = await apiClient.post('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (!response.data) throw new Error('Upload failed');
    
    // Get public URL with error handling
    let publicUrl = '';
    try {
      publicUrl = getPublicUrl(bucket, filePath);
      
      // Also cache file locally for offline access
      const dataUrl = await readFileAsDataURL(file);
      await nexaflowStorage.saveData(`file_${filePath}`, dataUrl, 'files');
    } catch (urlError) {
      console.error('Error getting public URL:', urlError);
      // Continue with a fallback URL format
      publicUrl = `${apiClient.defaults.baseURL}/storage/public/${bucket}/${filePath}`;
    }
    
    return {
      path: filePath,
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error('Failed to upload file');
    throw error;
  }
};

// Helper function to download files from storage
export const downloadFile = async (path, bucket, fileName) => {
  try {
    // Check if online first
    if (!connectionMonitor.getStatus()) {
      // If offline, try to get from local storage
      const localFile = await nexaflowStorage.getData(`file_${path}`, 'files');
      if (localFile?.data) {
        const blob = dataURItoBlob(localFile.data);
        const url = URL.createObjectURL(blob);
        
        // Create and trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || path.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
      } else {
        throw new Error('Cannot download file while offline');
      }
    }

    const response = await apiClient.get(`/storage/download/${bucket}/${path}`, {
      responseType: 'blob'
    });
    
    if (!response.data) throw new Error('Downloaded file data is empty');
    
    let url = null;
    try {
      url = URL.createObjectURL(response.data);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || path.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (urlError) {
      console.error('Error handling download URL:', urlError);
      errorHandler.logError(urlError, 'URL Creation');
      throw new Error('Failed to process downloaded file');
    } finally {
      // Always clean up the URL object
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch (revokeError) {
          console.warn('Error revoking URL:', revokeError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.error('Failed to download file');
    throw error;
  }
};

// Function to sync offline data
async function syncOfflineData() {
  try {
    const offlineQueue = loadFromLocalStorage('nexaflow_offline_queue') || [];
    if (offlineQueue.length === 0) return;
    
    console.log(`Syncing ${offlineQueue.length} offline items...`);
    
    // Process upload queue first
    const uploadQueue = (await nexaflowStorage.getData('_upload_queue'))?.data || [];
    for (const item of uploadQueue) {
      try {
        const fileData = await nexaflowStorage.getData(`file_${item.file.path}`, 'files');
        if (fileData?.data) {
          const blob = dataURItoBlob(fileData.data);
          const file = new File([blob], item.file.name, { type: item.file.type });
          await uploadFileToStorage(file, item.bucket, item.file.path.split('/')[0]);
        }
      } catch (err) {
        console.error('Failed to sync file upload:', err);
      }
    }
    
    // Clear queue after processing
    await nexaflowStorage.saveData('_upload_queue', []);
    saveToLocalStorage('nexaflow_offline_queue', []);
    
    toast.success('Offline data synchronized');
  } catch (error) {
    console.error('Error syncing offline data:', error);
    toast.error('Failed to sync some offline data');
  }
}

// Schedule sync for offline data when connection is restored
connectionMonitor.addListener(function handleConnectionChange(isOnline) {
  if (isOnline) {
    console.log('Connection restored, syncing offline data...');
    syncOfflineData();
  }
});

// Auth functions
export const auth = {
  async signUp(email, password, additionalData) {
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        password,
        name: additionalData?.name,
        avatarUrl: additionalData?.avatarUrl
      });
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async signIn(email, password) {
    try {
      const response = await apiClient.post('/login', { email, password });
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async signOut() {
    try {
      await apiClient.post('/logout');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      return { error: null };
    } catch (error) {
      return { error: error.response?.data || error.message };
    }
  },

  async getSession() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return { data: null, error: null };
      
      const response = await apiClient.get('/auth/session');
      return { data: response.data, error: null };
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
      }
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async updateProfile(updates) {
    try {
      const response = await apiClient.put('/users/profile', updates);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  }
};

// Storage functions
export const storage = {
  async uploadFile(bucket, path, file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('bucket', bucket);
      
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) onProgress(percentCompleted);
        }
      };
      
      const response = await apiClient.post('/storage/upload', formData, config);
      return { data: response.data, error: null };
    } catch (error) {
      console.error('Upload failed:', error);
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async downloadFile(bucket, path) {
    try {
      const response = await apiClient.get(`/storage/download/${bucket}/${path}`, {
        responseType: 'blob'
      });
      return { data: response.data, error: null };
    } catch (error) {
      console.error('Download failed:', error);
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async listFiles(bucket, path = '') {
    try {
      const response = await apiClient.get(`/storage/list/${bucket}/${path || ''}`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  }
};

// Database functions
export const db = {
  async fetch(table, select = '*', filter = {}) {
    try {
      let queryParams = new URLSearchParams();
      queryParams.append('select', select);
      
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          queryParams.append(key, `in.(${value.join(',')})`);
        } else {
          queryParams.append(key, `eq.${value}`);
        }
      });
      
      const response = await apiClient.get(`/db/${table}?${queryParams.toString()}`);
      return { data: response.data, error: null };
    } catch (error) {
      console.error(`Failed to fetch from ${table}:`, error);
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async insert(table, values) {
    try {
      const response = await apiClient.post(`/db/${table}`, values);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async update(table, values, filter) {
    try {
      let queryParams = new URLSearchParams();
      
      Object.entries(filter).forEach(([key, value]) => {
        queryParams.append(key, `eq.${value}`);
      });
      
      const response = await apiClient.put(`/db/${table}?${queryParams.toString()}`, values);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  },

  async delete(table, filter) {
    try {
      let queryParams = new URLSearchParams();
      
      Object.entries(filter).forEach(([key, value]) => {
        queryParams.append(key, `eq.${value}`);
      });
      
      const response = await apiClient.delete(`/db/${table}?${queryParams.toString()}`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error.response?.data || error.message };
    }
  }
};

