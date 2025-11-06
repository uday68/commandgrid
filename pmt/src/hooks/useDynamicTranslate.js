import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook to handle dynamic translations and fallbacks
 */
export const useDynamicTranslate = () => {
  const { t, i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Check connection status when the hook is initialized
  useState(() => {
    const checkConnection = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
    };
    
    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);
  
  const translateText = useCallback(async (key, options = {}) => {
    // Check if key is empty or null
    if (!key) return '';
    
    // First, check if the key already exists in i18n
    if (i18n.exists(key, options)) {
      return t(key, options);
    }
    
    // If key doesn't exist, check namespace structure
    const parts = key.split('.');
    if (parts.length > 1) {
      const namespace = parts[0];
      const specificKey = parts.slice(1).join('.');
      
      // Try with namespace
      if (i18n.exists(`${specificKey}`, { ns: namespace, ...options })) {
        return t(`${specificKey}`, { ns: namespace, ...options });
      }
    }
    
    // Look for key in all available namespaces
    const namespaces = i18n.options.ns;
    for (const ns of namespaces) {
      if (i18n.exists(key, { ns, ...options })) {
        return t(key, { ns, ...options });
      }
    }
    
    // Use key as fallback
    return key;
  }, [i18n, t]);
  
  const offlineTagline = i18n.exists('common.offlineMode') 
    ? t('common.offlineMode') 
    : 'You are currently in offline mode. Some features may be limited.';
  
  return {
    translateText,
    isTranslating,
    isOffline,
    offlineTagline
  };
};

export default useDynamicTranslate;