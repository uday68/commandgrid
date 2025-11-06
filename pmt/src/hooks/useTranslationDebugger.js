import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languageService } from '../utils/languageService';

/**
 * A hook to help identify and debug missing translation keys
 * Only use in development environments
 */
const useTranslationDebugger = () => {
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
  const [missingKeysCount, setMissingKeysCount] = useState(0);
  const { t, i18n } = useTranslation();
  const isDev = process.env.NODE_ENV === 'development';

  // Enhanced translation function that logs missing keys
  const tDebug = useCallback((key, options = {}) => {
    // Use regular translation
    const translated = t(key, options);
    
    // In development, check if key exists or if it returned the key itself
    if (isDev && (translated === key || !languageService.hasTranslation(key, options?.ns))) {
      // Register this as a missing key
      languageService.registerMissingKey(key, options?.ns);
    }
    
    return translated;
  }, [t, isDev]);
  
  // Open debugger panel
  const openDebugger = useCallback(() => {
    setIsDebuggerOpen(true);
  }, []);
  
  // Close debugger panel
  const closeDebugger = useCallback(() => {
    setIsDebuggerOpen(false);
  }, []);
  
  // Toggle debugger panel
  const toggleDebugger = useCallback(() => {
    setIsDebuggerOpen(prev => !prev);
  }, []);

  // Update missing keys count from local storage
  useEffect(() => {
    if (!isDev) return;
    
    const checkMissingKeys = () => {
      try {
        const missingKeysStr = localStorage.getItem('i18n_missing_keys') || '{}';
        const missingKeys = JSON.parse(missingKeysStr);
        
        // Count all missing keys across namespaces
        let count = 0;
        Object.values(missingKeys).forEach(nsKeys => {
          count += Object.keys(nsKeys).length;
        });
        
        setMissingKeysCount(count);
      } catch (error) {
        // Silent catch - localStorage might be disabled
      }
    };
    
    // Check on mount
    checkMissingKeys();
    
    // Set up event listener for storage changes
    window.addEventListener('storage', checkMissingKeys);
    
    // Check periodically (every 30 seconds) during development
    const interval = setInterval(checkMissingKeys, 30000);
    
    return () => {
      window.removeEventListener('storage', checkMissingKeys);
      clearInterval(interval);
    };
  }, [isDev]);
  
  // Create keyboard shortcut (Ctrl+Shift+T) for debugger
  useEffect(() => {
    if (!isDev) return;
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleDebugger();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDev, toggleDebugger]);
  
  // Find potential duplicate keys across namespaces
  const findDuplicateKeys = useCallback(() => {
    if (!isDev) return [];
    
    const namespaces = [
      'translation', 'components', 'pages', 'errors', 
      'features', 'registration', 'validation', 'common', 
      'chatRoom', 'images', 'admin', 'profile'
    ];
    
    const allKeys = {}; // Map of key -> [namespaces it's in]
    const duplicates = []; // List of duplicate entries
    
    // Collect keys from all namespaces
    namespaces.forEach(ns => {
      const bundle = i18n.getResourceBundle(i18n.language, ns);
      if (!bundle) return;
      
      const flatBundle = languageService.flattenObject ? 
        languageService.flattenObject(bundle) : 
        bundle;
        
      Object.entries(flatBundle).forEach(([key, value]) => {
        if (!allKeys[key]) {
          allKeys[key] = [];
        }
        allKeys[key].push({ ns, value });
      });
    });
    
    // Find duplicates
    Object.entries(allKeys).forEach(([key, occurrences]) => {
      if (occurrences.length > 1) {
        // Check if the values are identical
        const firstValue = occurrences[0].value;
        const allSame = occurrences.every(o => o.value === firstValue);
        
        duplicates.push({
          key,
          occurrences: occurrences.map(o => o.ns),
          values: occurrences.map(o => o.value),
          identicalValues: allSame
        });
      }
    });
    
    return duplicates;
  }, [i18n, isDev]);
  
  // Get translation coverage statistics for the current language
  const getCurrentLanguageCoverage = useCallback(() => {
    if (!isDev) return null;
    
    const stats = languageService.generateTranslationStats();
    return stats[i18n.language];
  }, [i18n.language, isDev]);
  
  // Generate a report of potentially problematic translations
  const generateReport = useCallback(() => {
    if (!isDev) return null;
    
    return {
      missingKeysCount,
      duplicateKeys: findDuplicateKeys(),
      coverage: getCurrentLanguageCoverage()
    };
  }, [missingKeysCount, findDuplicateKeys, getCurrentLanguageCoverage, isDev]);

  return {
    tDebug,
    openDebugger,
    closeDebugger,
    toggleDebugger,
    isDebuggerOpen,
    missingKeysCount,
    findDuplicateKeys,
    getCurrentLanguageCoverage,
    generateReport,
    isDev
  };
};

export default useTranslationDebugger;
