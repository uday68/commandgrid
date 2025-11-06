import { create } from 'zustand';
import connectionMonitor from '../utils/connectionMonitor';
import { nexaflowStorage } from '../pages/meetings/supabaseClient';

/**
 * Central store for managing application state and cross-component communication
 */
const useCentralStore = create((set, get) => ({
  // Connection state
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  
  // Offline queue
  offlineQueue: [],
  
  // File cache
  fileCache: {},
  
  // User settings and preferences
  userPreferences: {},
  
  // Current session info
  sessionInfo: {
    lastActivity: Date.now(),
    authenticated: false,
    userId: null,
  },
  
  // Initialize the store
  init: async () => {
    // Set up connection monitor
    connectionMonitor.addListener((isOnline) => {
      set({ isOnline });
      if (isOnline) {
        get().processPendingOperations();
      }
    });
    
    // Load offline queue from persistent storage
    try {
      const storedQueue = await nexaflowStorage.getData('offline_queue', 'system');
      if (storedQueue && Array.isArray(storedQueue.data)) {
        set({ offlineQueue: storedQueue.data });
      }
      
      // Load user preferences
      const userPrefs = await nexaflowStorage.getData('user_preferences', 'system');
      if (userPrefs && userPrefs.data) {
        set({ userPreferences: userPrefs.data });
      }
    } catch (err) {
      console.error('Failed to initialize central store:', err);
    }
  },
  
  // Add items to offline queue
  addToOfflineQueue: async (operation) => {
    const { offlineQueue } = get();
    const updatedQueue = [
      ...offlineQueue,
      { ...operation, timestamp: Date.now() }
    ];
    
    set({ offlineQueue: updatedQueue });
    
    // Persist to storage
    try {
      await nexaflowStorage.saveData('offline_queue', updatedQueue, 'system');
    } catch (err) {
      console.error('Failed to save offline queue:', err);
    }
  },
  
  // Process pending operations when back online
  processPendingOperations: async () => {
    const { offlineQueue, isOnline } = get();
    
    if (!isOnline || offlineQueue.length === 0) return;
    
    console.log(`Processing ${offlineQueue.length} pending operations`);
    
    const newQueue = [...offlineQueue];
    const processed = [];
    
    for (let i = 0; i < newQueue.length; i++) {
      const op = newQueue[i];
      
      try {
        // Process based on operation type
        switch (op.type) {
          case 'file-upload':
            // Handle file upload
            console.log('Processing file upload:', op.filename);
            // Implementation would go here
            processed.push(i);
            break;
          
          case 'data-sync':
            // Handle data sync
            console.log('Processing data sync:', op.key);
            // Implementation would go here
            processed.push(i);
            break;
          
          default:
            console.warn('Unknown operation type:', op.type);
        }
      } catch (err) {
        console.error(`Failed to process operation ${op.type}:`, err);
      }
    }
    
    // Remove processed items
    const filteredQueue = newQueue.filter((_, index) => !processed.includes(index));
    set({ offlineQueue: filteredQueue });
    
    // Update storage
    try {
      await nexaflowStorage.saveData('offline_queue', filteredQueue, 'system');
    } catch (err) {
      console.error('Failed to update offline queue:', err);
    }
  },
  
  // Update user preferences
  updateUserPreferences: async (preferences) => {
    const currentPrefs = get().userPreferences;
    const updatedPrefs = {
      ...currentPrefs,
      ...preferences,
      lastUpdated: Date.now()
    };
    
    set({ userPreferences: updatedPrefs });
    
    // Persist to storage
    try {
      await nexaflowStorage.saveData('user_preferences', updatedPrefs, 'system');
    } catch (err) {
      console.error('Failed to save user preferences:', err);
    }
  },
  
  // Update session activity
  updateActivity: () => {
    set(state => ({
      sessionInfo: {
        ...state.sessionInfo,
        lastActivity: Date.now()
      }
    }));
  },
  
  // File cache management
  addToFileCache: (fileId, fileData) => {
    set(state => ({
      fileCache: {
        ...state.fileCache,
        [fileId]: {
          data: fileData,
          timestamp: Date.now()
        }
      }
    }));
  },
  
  getFromFileCache: (fileId) => {
    return get().fileCache[fileId];
  }
}));

export default useCentralStore;
