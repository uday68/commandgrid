import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class SettingsService {
  constructor() {
    // Create axios instance with timeout
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add auth token to requests
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Default fallback settings
    this.defaultSettings = {
      appearance: {
        theme: 'light',
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        fontScale: 1,
        reducedMotion: false,
        borderRadius: 8,
        customTheme: null,
      },
      notifications: {
        email: true,
        push: true,
        sounds: true,
        desktop: true,
        taskReminders: true,
        meetingReminders: true,
        mentions: true,
        updates: true,
        digest: 'daily',
        doNotDisturbStart: '22:00',
        doNotDisturbEnd: '08:00'
      },
      privacy: {
        visibility: 'team',
        activityStatus: true,
        readReceipts: true,
        dataCollection: true,
        shareUsageData: false
      },
      language: {
        appLanguage: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      ai: {
        enabled: true,
        voiceEnabled: false,
        suggestions: true,
        analytics: true,
        autoComplete: true,
        dataImprovement: false
      },
      sound: {
        volume: 80,
        notificationSound: 'default',
        messageSound: 'subtle',
        callSound: 'ring1',
        mute: false
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        reducedMotion: false,
        keyboardNavigation: true
      },
      keyboard: {
        shortcuts: true,
        navigateWithArrows: true,
        submitWithEnter: true,
        customShortcuts: {}
      }
    };
  }

  /**
   * Get user settings
   * @returns {Promise<Object>} User settings
   */
  async getSettings() {
    try {
      const response = await this.api.get('/settings');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      
      // Try to get settings from local storage as backup
      const localSettings = localStorage.getItem('userSettings');
      if (localSettings) {
        return JSON.parse(localSettings);
      }
      
      // If all else fails, return default settings
      return this.defaultSettings;
    }
  }

  /**
   * Save user settings
   * @param {Object} settings - User settings to save
   * @returns {Promise<Object>} Updated settings
   */
  async saveSettings(settings) {
    try {
      // Save to local storage as backup
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      const response = await this.api.put('/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to save settings:', error);
      
      // If API call fails but we saved to localStorage, return the settings
      // we tried to save to give the impression of success in offline mode
      return settings;
    }
  }

  /**
   * Reset settings to default
   * @returns {Promise<Object>} Default settings
   */
  async resetSettings() {
    try {
      const response = await this.api.post('/settings/reset');
      return response.data;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      
      // Clear local storage backup if it exists
      localStorage.removeItem('userSettings');
      
      // Return default settings
      return this.defaultSettings;
    }
  }

  /**
   * Update a specific setting category
   * @param {string} category - Setting category (e.g., 'appearance', 'sound')
   * @param {Object} settings - Settings for that category
   * @returns {Promise<Object>} Updated settings for that category
   */
  async updateCategory(category, settings) {
    try {
      // Get current settings from localStorage or default
      let currentSettings = localStorage.getItem('userSettings');
      currentSettings = currentSettings ? JSON.parse(currentSettings) : this.defaultSettings;
      
      // Update just this category
      currentSettings[category] = settings;
      
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(currentSettings));
      
      // Send to API
      const response = await this.api.put(`/settings/${category}`, settings);
      return response.data;
    } catch (error) {
      console.error(`Failed to update ${category} settings:`, error);
      
      // Return the settings we tried to save
      return settings;
    }
  }
}

export default new SettingsService();
