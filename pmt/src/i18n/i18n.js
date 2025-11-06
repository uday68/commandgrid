import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// English
import enTranslation from './locales/en/translation.json';
import enComponents from './locales/en/components.json';
import enPages from './locales/en/pages.json';
import enCommon from './locales/en/common.json';
import enDocs from './locales/en/docs.json';
import enImages from './locales/en/images.json';
import enRegistration from './locales/en/registration.json';
import enValidation from './locales/en/validation.json';
import enErrors from './locales/en/errors.json';
import enMeetings from './locales/en/meetings.json';

// Spanish
import esTranslation from './locales/es/translation.json';
import esPages from './locales/es/pages.json';
import esDocs from './locales/es/docs.json';
import esRegistration from './locales/es/registration.json';
import esValidation from './locales/es/validation.json';
import esErrors from './locales/es/errors.json';
import esFeatures from './locales/es/features.json';
import esComponents from './locales/es/components.json';
import esCommon from './locales/es/common.json';
import esChatRoom from './locales/es/chatRoom.json';
import esProfile from './locales/es/profile.json';
import esAdmin from './locales/es/admin.json';

// French
import frTranslation from './locales/fr/translation.json';
import frPages from './locales/fr/pages.json';
import frComponents from './locales/fr/components.json';
import frHome from './locales/fr/home.json';
import frRegistration from './locales/fr/registration.json';
import frValidation from './locales/fr/validation.json';

// Chinese
import zhTranslation from './locales/zh/translation.json';
import zhPages from './locales/zh/pages.json';
import zhCommon from './locales/zh/common.json';
import zhRegistration from './locales/zh/registration.json';
import zhValidation from './locales/zh/validation.json';

// Hindi
import hiTranslation from './locales/hi/translation.json';
import hiPages from './locales/hi/pages.json';
import hiDocs from './locales/hi/docs.json';
import hiImages from './locales/hi/images.json';
import hiRegistration from './locales/hi/registration.json';
import hiValidation from './locales/hi/validation.json';
import hiErrors from './locales/hi/errors.json';
import hiFeatures from './locales/hi/features.json';
import hiHome from './locales/hi/home.json';
import hiComponents from './locales/hi/components.json';
import hiAdmin from './locales/hi/admin.json';
import hiCommon from './locales/hi/common.json';
import hiChatRoom from './locales/hi/chatRoom.json';
import hiProfile from './locales/hi/profile.json';
import hiMeetings from './locales/hi/meetings.json';

// Sanskrit
import saTranslation from './locales/sa/translation.json';

// Hebrew
import heTranslation from './locales/he/translation.json';
import heHome from './locales/he/home.json';
import heRegistration from './locales/he/registration.json';
import heValidation from './locales/he/validation.json';

// Arabic
import arTranslation from './locales/ar/translation.json';
import arHome from './locales/ar/home.json';
import arRegistration from './locales/ar/registration.json';
import arValidation from './locales/ar/validation.json';

// German
import deTranslation from './locales/de/translation.json';

// Resources object containing all translations
const resources = {
  en: {
    translation: enTranslation,
    components: enComponents,
    pages: enPages,
    common: enCommon,
    docs: enDocs,
    images: enImages,
    registration: enRegistration,
    validation: enValidation,
    errors: enErrors,
    meetings: enMeetings
  },
  es: {
    translation: esTranslation,
    pages: esPages,
    docs: esDocs,
    registration: esRegistration,
    validation: esValidation,
    errors: esErrors,
    features: esFeatures,
    components: esComponents,
    common: esCommon,
    chatRoom: esChatRoom,
    profile: esProfile,
    admin: esAdmin
  },
  fr: {
    translation: frTranslation,
    pages: frPages,
    components: frComponents,
    home: frHome,
    registration: frRegistration,
    validation: frValidation
  },
  zh: {
    translation: zhTranslation,
    pages: zhPages,
    common: zhCommon,
    registration: zhRegistration,
    validation: zhValidation
  },
  hi: {
    translation: hiTranslation,
    pages: hiPages,
    docs: hiDocs,
    images: hiImages,
    registration: hiRegistration,
    validation: hiValidation,
    errors: hiErrors,
    features: hiFeatures,
    home: hiHome,
    components: hiComponents,
    admin: hiAdmin,
    common: hiCommon,
    chatRoom: hiChatRoom,
    profile: hiProfile,
    meetings: hiMeetings
  },
  sa: {
    translation: saTranslation
  },
  he: {
    translation: heTranslation,
    home: heHome,
    registration: heRegistration,
    validation: heValidation
  },
  ar: {
    translation: arTranslation,
    home: arHome,
    registration: arRegistration,
    validation: arValidation
  },
  de: {
    translation: deTranslation
  }
};

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false // not needed for React
    },
    react: {
      useSuspense: false
    },
    supportedLngs: ['en', 'hi', 'sa', 'es', 'fr', 'de', 'zh', 'ar', 'he'],
    ns: ['translation', 'components', 'pages', 'common', 'docs', 'images', 'registration', 'validation', 'admin', 'errors', 'features', 'home', 'chatRoom', 'profile', 'meetings'],
    defaultNS: 'translation',
    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',
    fallbackNS: ['common', 'translation'],
    saveMissing: true,
    saveMissingTo: 'all',
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      // Log missing key to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
      }
      // Return fallback value or key as fallback
      return fallbackValue || key;
    },
    parseMissingKeyHandler: (key) => {
      // Return a more user-friendly format of the key
      return key.split('.').pop().replace(/_/g, ' ');
    }
  });

// Helper to detect missing translations for devs
if (process.env.NODE_ENV === 'development') {
  window.i18nDebug = {
    getMissingKeys: () => {
      const missingKeys = {};
      Object.keys(resources).forEach(lang => {
        missingKeys[lang] = [];
        Object.keys(resources.en).forEach(ns => {
          const nsKeys = getAllKeysFromObject(resources.en[ns]);
          nsKeys.forEach(key => {
            try {
              const hasTranslation = i18n.exists(key, { lng: lang, ns });
              if (!hasTranslation) {
                missingKeys[lang].push(`${ns}:${key}`);
              }
            } catch (e) {
              console.error(`Error checking key ${key} in ${lang}/${ns}:`, e);
            }
          });
        });
      });
      return missingKeys;
    }
  };

  // Helper function to get all keys from nested objects
  function getAllKeysFromObject(obj, prefix = '') {
    return Object.keys(obj).reduce((keys, key) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = [...keys, ...getAllKeysFromObject(obj[key], newKey)];
      } else {
        keys.push(newKey);
      }
      return keys;
    }, []);
  }
}

export default i18n;