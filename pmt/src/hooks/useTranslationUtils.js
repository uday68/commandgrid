import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useCallback, useMemo } from 'react';

/**
 * Enhanced hook for translations with advanced utilities
 */
const useTranslationUtils = (namespaces = ['translation']) => {
  const { t, i18n, ready } = useTranslation([...namespaces, 'images']);
  
  /**
   * Format a date according to the current locale
   * @param {Date|string} date - Date to format
   * @param {string} format - Format string (optional)
   */
  const formatDate = useCallback((date, format = 'LL') => {
    if (!date) return '';
    return moment(date).locale(i18n.language).format(format);
  }, [i18n.language]);
  
  /**
   * Format a number according to the current locale
   * @param {number} number - Number to format
   * @param {object} options - Intl.NumberFormat options
   */
  const formatNumber = useCallback((number, options = {}) => {
    if (typeof number !== 'number') return '';
    return new Intl.NumberFormat(i18n.language, options).format(number);
  }, [i18n.language]);
  
  /**
   * Format a currency value according to the current locale
   * @param {number} value - Value to format
   * @param {string} currencyCode - Currency code (e.g. USD)
   */
  const formatCurrency = useCallback((value, currencyCode = 'USD') => {
    return formatNumber(value, { 
      style: 'currency', 
      currency: currencyCode 
    });
  }, [formatNumber]);
  
  /**
   * Get text direction (rtl/ltr) for current language
   */
  const getDirection = useCallback(() => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language]);
  
  /**
   * Translate with auto-pluralization
   * @param {string} key - Translation key
   * @param {number} count - Count for pluralization
   * @param {object} options - Additional options
   */
  const plural = useCallback((key, count, options = {}) => {
    return t(key, { ...options, count });
  }, [t]);

  /**
   * Get translated alt text for an image
   * @param {string} imageKey - Image key in translations
   * @param {object} options - Additional options
   */
  const getImageAlt = useCallback((imageKey, options = {}) => {
    return t(`alt.${imageKey}`, { ns: 'images', ...options });
  }, [t]);

  /**
   * Get configuration for image processing
   * @param {string} configKey - Configuration key
   */
  const getImageConfig = useCallback((configKey) => {
    return t(`model.${configKey}`, { ns: 'images', returnObjects: true });
  }, [t]);
  
  /**
   * Get language name in its native form
   * @param {string} languageCode - Language code (optional, defaults to current)
   */
  const getLanguageName = useCallback((languageCode = i18n.language) => {
    const languageNames = {
      'en': 'English',
      'hi': 'हिन्दी',
      'sa': 'संस्कृतम्',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文'
    };
    return languageNames[languageCode] || languageCode;
  }, [i18n.language]);
  
  /**
   * Format relative time (2 days ago, in 3 hours, etc.)
   * @param {Date|string|number} date - Date to format
   */
  const formatRelativeTime = useCallback((date) => {
    return moment(date).locale(i18n.language).fromNow();
  }, [i18n.language]);
  
  /**
   * Check if a key exists in current translations
   * @param {string} key - Translation key to check
   * @param {string} ns - Namespace (optional)
   */
  const hasTranslation = useCallback((key, ns = 'translation') => {
    return i18n.exists(key, { ns });
  }, [i18n]);
  
  /**
   * Get supported languages
   */
  const supportedLanguages = useMemo(() => {
    return ['en', 'hi', 'sa', 'es', 'fr', 'de', 'zh', 'ar', 'he'];
  }, []);

  return {
    t,
    i18n,
    ready,
    formatDate,
    formatNumber,
    formatCurrency,
    getDirection,
    plural,
    getImageAlt,
    getImageConfig,
    getLanguageName,
    formatRelativeTime,
    hasTranslation,
    supportedLanguages
  };
};

export default useTranslationUtils;
