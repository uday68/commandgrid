import i18n from '../i18n/i18n';

export const translationValidator = {
  hasTranslation: (key, lng = i18n.language, ns = undefined) => {
    return i18n.exists(key, { lng, ns });
  },
  
  getMissingKeys: (language, namespaces) => {
    
    const nsToCheck = namespaces || Object.keys(i18n.options.resources.en);
    const result = {};
    
    nsToCheck.forEach(ns => {
      const refResource = i18n.getResourceBundle('en', ns);
      if (!refResource) return;
      
      const targetResource = i18n.getResourceBundle(language, ns);
      const missingKeys = [];
      
      // Find missing keys in the target language
      const findMissingKeys = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            findMissingKeys(obj[key], fullKey);
          } else if (!i18n.exists(fullKey, { lng: language, ns })) {
            missingKeys.push(fullKey);
          }
        });
      };
      
      findMissingKeys(refResource);
      
      if (missingKeys.length > 0) {
        result[ns] = missingKeys;
      }
    });
    
    return result;
  },

  /**
   * Register a missing translation key for later collection
   * @param {string} key - Key that's missing
   * @param {string} ns - Namespace
   * @param {string} lng - Language
   */
  registerMissingKey: (key, ns = 'translation', lng = i18n.language) => {
    // Implementation depends on how you want to collect missing keys
    if (!window._missingTranslations) {
      window._missingTranslations = {};
    }
    if (!window._missingTranslations[lng]) {
      window._missingTranslations[lng] = {};
    }
    if (!window._missingTranslations[lng][ns]) {
      window._missingTranslations[lng][ns] = [];
    }
    if (!window._missingTranslations[lng][ns].includes(key)) {
      window._missingTranslations[lng][ns].push(key);
    }
  },
  
  getRegisteredMissingKeys: () => {
    return window._missingTranslations || {};
  },
  
  generateCoverageReport: () => {
    const languages = Object.keys(i18n.options.resources);
    const report = {};
    
    languages.forEach(lang => {
      if (lang === 'en') return; // Skip reference language
      
      const missingKeys = translationValidator.getMissingKeys(lang);
      let totalMissing = 0;
      let totalKeys = 0;
      
      Object.entries(missingKeys).forEach(([ns, keys]) => {
        totalMissing += keys.length;
        const refBundle = i18n.getResourceBundle('en', ns);
        if (refBundle) {
          const count = Object.keys(flattenObject(refBundle)).length;
          totalKeys += count;
        }
      });
      
      const coveragePercent = totalKeys > 0 ? ((totalKeys - totalMissing) / totalKeys) * 100 : 100;
      
      report[lang] = {
        missingCount: totalMissing,
        totalKeys: totalKeys,
        coveragePercent: coveragePercent.toFixed(2)
      };
    });
    
    return report;
  }
};

// Helper function to flatten an object
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(acc, flattenObject(obj[key], newPrefix));
    } else {
      acc[newPrefix] = obj[key];
    }
    return acc;
  }, {});
}

// Add global access in development environment
if (process.env.NODE_ENV === 'development') {
  window.translationValidator = translationValidator;
}

export default translationValidator;
