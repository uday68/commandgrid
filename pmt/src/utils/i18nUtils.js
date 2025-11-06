/**
 * Utility functions for internationalization (i18n)
 */

import i18n from '../i18n/i18n';

/**
 * Fix missing translations by adding default English entries
 * @param {Object} translations - Translation object
 * @returns {Object} Fixed translations
 */
export const fixMissingTranslations = (translations) => {
  const englishTranslations = {
    errors: {
      general: {
        unknown: "An unknown error occurred",
        serverError: "Server error occurred",
        connectionFailed: "Failed to connect to server",
        timeout: "Request timed out",
        unauthorized: "Unauthorized access",
        forbidden: "Access forbidden",
        notFound: "Resource not found",
        validationFailed: "Validation failed"
      },
      connection: {
        offline: "You are offline. Some features may be limited.",
        reconnecting: "Reconnecting...", 
        reconnected: "Connection restored successfully.",
        failed: "Connection failed",
        checkConnection: "Please check your internet connection"
      },
      tryAgain: "Try Again",
      goBack: "Go Back",
      returnHome: "Return Home",
      somethingWentWrong: "Something went wrong"
    }
  };

  // If no translations provided, create a new object
  const result = translations || {};

  // Helper function to merge missing translations
  const mergeDeep = (target, source) => {
    for (const key in source) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        // If target doesn't have the key, create an empty object
        if (!target[key]) target[key] = {};
        mergeDeep(target[key], source[key]);
      } else {
        // Only copy if the target doesn't have this key
        if (!target[key]) target[key] = source[key];
      }
    }
    return target;
  };

  // Add missing default translations
  return mergeDeep(result, englishTranslations);
};

/**
 * Get translation key with fallback
 * @param {string} key - The translation key
 * @param {object} options - Options for translation
 * @param {string} defaultValue - Default value if translation not found
 * @returns {string} Translated string or fallback
 */
export const getTranslation = (key, options = {}, defaultValue = '') => {
  if (!key) return defaultValue;
  
  try {
    const translated = i18n.t(key, { ...options, defaultValue });
    // If the translation key is returned as is, it means no translation was found
    return (translated === key) ? defaultValue : translated;
  } catch (error) {
    console.error(`Translation error for key '${key}':`, error);
    return defaultValue;
  }
};

/**
 * Add new translation keys to all supported languages
 * @param {object} keys - The keys and values to add
 * @param {string} namespace - The namespace to add keys to
 * @returns {Promise<void>}
 */
export const addTranslationKeys = async (keys, namespace = 'translation') => {
  const supportedLanguages = Object.keys(i18n.options.resources || {});
  
  for (const lang of supportedLanguages) {
    try {
      const currentBundle = i18n.getResourceBundle(lang, namespace) || {};
      const isReferenceLanguage = lang === 'en';
      
      // For languages other than English, we only add the keys, not the values
      const newBundle = { ...currentBundle };
      
      // Helper function to deep merge keys
      const addKeys = (targetObj, sourceObj, targetPath = '') => {
        for (const key in sourceObj) {
          const newPath = targetPath ? `${targetPath}.${key}` : key;
          
          if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null) {
            if (!targetObj[key]) targetObj[key] = {};
            addKeys(targetObj[key], sourceObj[key], newPath);
          } else {
            // Only set value for reference language, empty string for others
            if (!targetObj[key]) {
              targetObj[key] = isReferenceLanguage ? sourceObj[key] : '';
            }
          }
        }
      };
      
      // Add the new keys to the bundle
      addKeys(newBundle, keys);
      
      // Add the bundle to i18next
      i18n.addResourceBundle(lang, namespace, newBundle, true, true);
    } catch (error) {
      console.error(`Failed to add translation keys for ${lang}/${namespace}:`, error);
    }
  }
};

export default {
  fixMissingTranslations,
  getTranslation,
  addTranslationKeys
};
