import React from 'react';
import { useTranslation } from 'react-i18next';

const AnyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome_message')}</h1>
    </div>
  );
};

export default AnyComponent;