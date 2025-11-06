import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

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
    errors: enErrors
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
    profile: hiProfile
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

i18n
  // load translation using http -> see /public/locales
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    },
    react: {
      useSuspense: false
    },
    supportedLngs: ['en', 'hi', 'sa', 'es', 'fr', 'de', 'zh', 'ar', 'he', 'ur', 'fa'],
    ns: Object.keys(resources.en) // All namespaces from English
  });

export default i18n;
