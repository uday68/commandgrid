import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      // Log missing translation keys during development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`\n Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
      }
    },
    saveMissing: true,
    saveMissingTo: 'all',
  });

export default i18n;
