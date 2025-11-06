import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingSpinner = ({ size = 'md', message }) => {
  const { t } = useTranslation('common');
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className={`${sizeClasses[size]} border-4 border-blue-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-3`} />
      <p className="text-slate-600 dark:text-slate-400 text-center font-medium">
        {message || t('loading')}
      </p>
    </div>
  );
};

export default LoadingSpinner;