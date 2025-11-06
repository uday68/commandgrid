import { useTranslation as useI18nTranslation } from 'react-i18next';
import { namespaces } from './namespaces';

/**
 * Custom hook that wraps react-i18next's useTranslation hook
 * and provides access to all namespaces with type safety
 * 
 * @param {string} ns - The namespace to use (default: 'translation')
 * @returns {Object} - The translation functions and utilities
 */
export const useTranslation = (ns = 'translation') => {
  const { t, i18n, ready } = useI18nTranslation(ns);

  /**
   * Change the current language
   * @param {string} language - Language code to change to
   */
  const changeLanguage = (language) => {
    if (i18n.languages.includes(language)) {
      i18n.changeLanguage(language);
    }
  };

  /**
   * Get the current language
   * @returns {string} - Current language code
   */
  const getCurrentLanguage = () => i18n.language || 'en';

  /**
   * Get the current language direction (rtl or ltr)
   * @returns {string} - 'rtl' for right-to-left languages, 'ltr' otherwise
   */
  const getLanguageDirection = () => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(getCurrentLanguage()) ? 'rtl' : 'ltr';
  };

  /**
   * Check if a translation key exists
   * @param {string} key - The translation key to check
   * @returns {boolean} - True if the key exists, false otherwise
   */
  const hasTranslation = (key) => {
    return i18n.exists(key, { ns });
  };

  /**
   * Get a list of supported languages
   * @returns {Array} - Array of supported language codes
   */
  const getSupportedLanguages = () => {
    return i18n.options.supportedLngs || ['en'];
  };

  return {
    t,
    i18n,
    ready,
    changeLanguage,
    getCurrentLanguage,
    getLanguageDirection,
    hasTranslation,
    getSupportedLanguages,
    namespaces
  };
};

export default useTranslation;
