import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const ErrorMessage = ({ message, retry }) => {
  const { t } = useTranslation('common');
  
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
        <FiAlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
        {t('errors.title')}
      </h3>
      
      <p className="text-center text-slate-600 dark:text-slate-400 mb-4 max-w-md">
        {message || t('errors.generic')}
      </p>
      
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('retry')}
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;