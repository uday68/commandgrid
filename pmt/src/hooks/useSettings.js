import { useState, useEffect, useCallback } from 'react';
import SettingsService from '../Services/SettingsService';

/**
 * Custom hook to manage user settings
 * @param {string} defaultCategory - Default category to select
 * @returns {Object} Settings state and functions
 */
const useSettings = (defaultCategory = null) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await SettingsService.getSettings();
        setSettings(data);
        setOriginalSettings(JSON.parse(JSON.stringify(data)));
        setLoading(false);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Update a setting
  const updateSetting = useCallback((category, key, value) => {
    setSettings(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [key]: value
        }
      };
    });
    
    setHasChanges(true);
  }, []);

  // Update a whole category
  const updateCategory = useCallback((category, values) => {
    setSettings(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          ...values
        }
      };
    });
    
    setHasChanges(true);
  }, []);

  // Save all settings
  const saveSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await SettingsService.saveSettings(settings);
      
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
      setLoading(false);
      
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
      setLoading(false);
      return false;
    }
  }, [settings]);

  // Reset settings to original values
  const resetSettings = useCallback(() => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      setHasChanges(false);
    }
  }, [originalSettings]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const defaultSettings = await SettingsService.resetSettings();
      
      setSettings(defaultSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
      setHasChanges(false);
      setLoading(false);
      
      return true;
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings');
      setLoading(false);
      return false;
    }
  }, []);

  // Check if settings have specific features enabled
  const isEnabled = useCallback((category, feature) => {
    if (!settings || !settings[category]) return false;
    return Boolean(settings[category][feature]);
  }, [settings]);

  return {
    settings,
    loading,
    error,
    activeCategory,
    hasChanges,
    setActiveCategory,
    updateSetting,
    updateCategory,
    saveSettings,
    resetSettings,
    resetToDefaults,
    isEnabled
  };
};

export default useSettings;
