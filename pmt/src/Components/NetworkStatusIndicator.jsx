import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'react-feather';
import { useTranslation } from 'react-i18next';
import connectionMonitor from '../utils/connectionMonitor';

/**
 * Component to show network status in the application
 * Can be placed in headers or navigation bars
 */
const NetworkStatusIndicator = ({ className = '', variant = 'default' }) => {
  const [isOnline, setIsOnline] = useState(connectionMonitor.getStatus());
  const { t } = useTranslation('errors');
  
  useEffect(() => {
    const cleanup = connectionMonitor.addListener((online) => {
      setIsOnline(online);
    });
    
    return cleanup;
  }, []);
  
  // Check if we want a minimal variant (icon only)
  if (variant === 'minimal') {
    return (
      <div 
        className={`inline-flex items-center ${className}`}
        title={isOnline ? t('connection.online') : t('connection.offline')}
      >
        {isOnline ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff size={16} className="text-red-500" />
        )}
      </div>
    );
  }
  
  // Default variant with text and icon
  return (
    <div className={`inline-flex items-center gap-2 py-1 px-2 rounded-full text-sm ${className} ${
      isOnline 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }`}>
      {isOnline ? (
        <>
          <Wifi size={14} />
          <span>{t('connection.online')}</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>{t('connection.offline')}</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
