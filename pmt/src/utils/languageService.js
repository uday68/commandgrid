import i18n from '../i18n';

/**
 * Service to handle language and translation-related functionality
 */
export const languageService = {
  /**
   * Change the application language
   * @param {string} language - Language code (e.g., 'en', 'fr')
   * @returns {Promise<void>}
   */
  changeLanguage: async (language) => {
    if (!language) return;
    
    await i18n.changeLanguage(language);
    localStorage.setItem('userLanguage', language);
    
    // Update document direction
    languageService.setPageDirection(language);
  },

  /**
   * Get the current language
   * @returns {string} Current language code
   */
  getCurrentLanguage: () => {
    return i18n.language;
  },

  /**
   * Check if a language is RTL (Right-to-Left)
   * @param {string} language - Language code
   * @returns {boolean} True if the language is RTL
   */
  isRtlLanguage: (language) => {
    const rtlLanguages = ['ar', 'he', 'ur', 'fa'];
    return rtlLanguages.includes(language);
  },
  
  /**
   * Get text direction based on language
   * @param {string} language - Language code
   * @returns {string} 'rtl' or 'ltr'
   */
  getTextDirection: (language) => {
    return languageService.isRtlLanguage(language) ? 'rtl' : 'ltr';
  },
  
  /**
   * Set page direction based on language
   * @param {string} language - Language code
   */
  setPageDirection: (language) => {
    const direction = languageService.getTextDirection(language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    
    // Add CSS class for RTL-specific styling
    if (direction === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  },
  
  /**
   * Get language name in its native form
   * @param {string} code - Language code
   * @returns {string} Language name in native form
   */
  getLanguageName: (code) => {
    const names = {
      'en': 'English',
      'hi': 'हिन्दी',
      'sa': 'संस्कृतम्',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文',
      'ar': 'العربية',
      'he': 'עברית',
      'ur': 'اردو',
      'fa': 'فارسی'
    };
    
    return names[code] || code;
  },
  
  /**
   * Get all supported languages
   * @returns {Array<string>} Array of language codes
   */
  getSupportedLanguages: () => {
    return i18n.options.supportedLngs.filter(lng => lng !== 'cimode');
  },
  
  /**
   * Get missing translation keys for a language
   * @param {string} language - Language code
   * @returns {Object} Object with namespaces as keys and arrays of missing keys
   */
  getMissingTranslationKeys: (language) => {
    if (!language || language === 'en') return {};
    
    const result = {};
    const namespaces = i18n.options.ns;
    
    namespaces.forEach(ns => {
      const enBundle = i18n.getResourceBundle('en', ns);
      const targetBundle = i18n.getResourceBundle(language, ns);
      
      if (!enBundle) return;
      
      const missingKeys = languageService.extractKeysFromObject(enBundle)
        .filter(key => {
          const keyPath = key.split('.');
          let current = targetBundle;
          
          if (!current) return true;
          
          for (const part of keyPath) {
            if (current[part] === undefined || current[part] === null || current[part] === '') {
              return true;
            }
            current = current[part];
          }
          
          return false;
        });
      
      if (missingKeys.length > 0) {
        result[ns] = missingKeys;
      }
    });
    
    return result;
  },
  
  /**
   * Get all translation keys for a language
   * @param {string} language - Language code
   * @returns {Object} Object with namespaces as keys and arrays of all keys
   */
  getAllTranslationKeys: (language) => {
    const result = {};
    const namespaces = i18n.options.ns;
    
    namespaces.forEach(ns => {
      const bundle = i18n.getResourceBundle(language, ns);
      
      if (!bundle) return;
      
      result[ns] = languageService.extractKeysFromObject(bundle);
    });
    
    return result;
  },
  
  /**
   * Extract keys from nested object
   * @param {Object} obj - Object to extract keys from
   * @param {string} prefix - Key prefix for recursion
   * @returns {Array<string>} Array of dot-notation keys
   */
  extractKeysFromObject: (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.keys(obj).reduce((keys, key) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        return [...keys, ...languageService.extractKeysFromObject(obj[key], newKey)];
      }
      
      return [...keys, newKey];
    }, []);
  },
  
  /**
   * Generate translation statistics
   * @returns {Object} Statistics about translation coverage
   */
  generateTranslationStats: () => {
    const stats = {};
    const languages = languageService.getSupportedLanguages();
    const englishKeys = languageService.extractKeysFromObject(i18n.getResourceBundle('en', 'translation'));
    
    languages.forEach(lang => {
      const langBundle = i18n.getResourceBundle(lang, 'translation');
      let translatedCount = 0;
      
      if (!langBundle) {
        stats[lang] = { percentage: 0, count: 0, total: englishKeys.length };
        return;
      }
      
      englishKeys.forEach(key => {
        const keyParts = key.split('.');
        let current = langBundle;
        let hasTranslation = true;
        
        for (const part of keyParts) {
          if (!current || !current[part]) {
            hasTranslation = false;
            break;
          }
          current = current[part];
        }
        
        if (hasTranslation && typeof current === 'string' && current.trim() !== '') {
          translatedCount++;
        }
      });
      
      const percentage = Math.round((translatedCount / englishKeys.length) * 100);
      stats[lang] = {
        percentage,
        count: translatedCount,
        total: englishKeys.length,
        missing: englishKeys.length - translatedCount
      };
    });
    
    return stats;
  },
  
  /**
   * Register a missing translation key for development
   * @param {string} key - Missing key
   * @param {string} namespace - Namespace
   */
  registerMissingKey: (key, namespace = 'translation') => {
    if (process.env.NODE_ENV !== 'development') return;
    
    if (!window._missingTranslationKeys) {
      window._missingTranslationKeys = {};
    }
    
    const lang = i18n.language;
    
    if (!window._missingTranslationKeys[lang]) {
      window._missingTranslationKeys[lang] = {};
    }
    
    if (!window._missingTranslationKeys[lang][namespace]) {
      window._missingTranslationKeys[lang][namespace] = [];
    }
    
    if (!window._missingTranslationKeys[lang][namespace].includes(key)) {
      window._missingTranslationKeys[lang][namespace].push(key);
    }
  },
  
  /**
   * Get registered missing keys
   * @returns {Object|null} Missing keys by language and namespace
   */
  getRegisteredMissingKeys: () => {
    return window._missingTranslationKeys || null;
  },
  
  /**
   * Clear registered missing keys
   */
  clearRegisteredMissingKeys: () => {
    window._missingTranslationKeys = {};
  },
  
  /**
   * Check if a translation exists
   * @param {string} key - Translation key
   * @param {string} namespace - Namespace
   * @returns {boolean} Whether translation exists
   */
  hasTranslation: (key, namespace = 'translation') => {
    return i18n.exists(key, { ns: namespace });
  }
};

export default languageService;
