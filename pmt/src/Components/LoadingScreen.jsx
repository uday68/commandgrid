import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="loading-screen">
      <p>{t('loading')}</p>
    </div>
  );
};

export default LoadingScreen;