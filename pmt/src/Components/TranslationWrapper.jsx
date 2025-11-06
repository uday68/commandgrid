import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDynamicTranslate } from '../hooks/useDynamicTranslate';
import { languageService } from '../utils/languageService';

/**
 * Higher-order component that provides translation capabilities to its children
 * and ensures document title is properly translated and document direction is set
 */
export const withTranslation = (WrappedComponent, options = {}) => {
  const { namespace = 'translation', titleKey = null } = options;
  
  return function TranslationWrapper(props) {
    const { t, i18n } = useTranslation(namespace);
    const { translateText, isOffline } = useDynamicTranslate();
    
    useEffect(() => {
      if (titleKey) {
        document.title = t(titleKey);
      }
      
      // Set page direction based on language
      languageService.setPageDirection(i18n.language);
      
      // Add language class to body for CSS targeting
      document.body.classList.forEach(cls => {
        if (cls.startsWith('lang-')) {
          document.body.classList.remove(cls);
        }
      });
      document.body.classList.add(`lang-${i18n.language}`);
      
    }, [t, i18n.language, titleKey]);
    
    // Get text direction for current language
    const direction = languageService.getTextDirection(i18n.language);
    
    // Pass enhanced translation props to wrapped component
    const enhancedProps = {
      ...props,
      t,
      i18n,
      translateText,
      isOffline,
      direction,
      language: i18n.language,
      languageService
    };
    
    return <WrappedComponent {...enhancedProps} />;
  };
};

/**
 * Component that translates a string directly
 */
export const Trans = ({ i18nKey, values = {}, defaultValue = '', namespace = 'translation' }) => {
  const { t } = useTranslation(namespace);
  return <>{t(i18nKey, values) || defaultValue}</>;
};

/**
 * Component that handles text direction based on current language
 */
export const DirectionProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const direction = languageService.getTextDirection(i18n.language);
  
  return (
    <div dir={direction} lang={i18n.language}>
      {children}
    </div>
  );
};

export default withTranslation;
