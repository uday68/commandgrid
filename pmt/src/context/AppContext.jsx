import React, { createContext, useContext, useEffect, useState } from 'react';
import useCentralStore from '../store/centralStore';
import connectionMonitor from '../utils/connectionMonitor';
import { nexaflowStorage } from '../pages/meetings/supabaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

// Create context
const AppContext = createContext(null);

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Provider component
export const AppProvider = ({ children }) => {
  const { t } = useTranslation(['errors', 'common']);
  const [isReady, setIsReady] = useState(false);
  const centralStore = useCentralStore();
  const isOnline = connectionMonitor.getStatus();
  
  // Initialize everything
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize central store
        await centralStore.init();
        
        // Everything is initialized and ready
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast.error(t('initialization.failed'));
      }
    };
    
    initializeApp();
  }, []);
  
  // Update connection status
  useEffect(() => {
    const handleConnectionChange = (isOnline) => {
      if (isOnline) {
        toast.success(t('connection.reconnected'));
        
        // Process offline queue
        centralStore.processPendingOperations();
      } else {
        toast.error(t('connection.offline'));
      }
    };
    
    // Add connection listener
    const removeListener = connectionMonitor.addListener(handleConnectionChange);
    
    // Cleanup
    return removeListener;
  }, []);
  
  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      centralStore.updateActivity();
    };
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Setup activity check interval
    const activityInterval = setInterval(() => {
      const { lastActivity } = centralStore.sessionInfo;
      const inactiveTime = Date.now() - lastActivity;
      
      // If inactive for more than 30 minutes
      if (inactiveTime > 30 * 60 * 1000) {
        toast.info(t('session.inactive'));
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(activityInterval);
    };
  }, []);
  
  // Context value
  const contextValue = {
    isReady,
    isOnline,
    addOfflineOperation: centralStore.addToOfflineQueue,
    updateUserPreferences: centralStore.updateUserPreferences,
    userPreferences: centralStore.userPreferences,
    fileCache: {
      add: centralStore.addToFileCache,
      get: centralStore.getFromFileCache
    }
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {isReady ? children : (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      )}
    </AppContext.Provider>
  );
};

export default AppProvider;
