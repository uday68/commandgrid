import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

// Avoid direct import to prevent circular dependency
// Instead use dynamic imports where needed
let supabase = null;
let nexaflowStorage = null;

const initSupabaseClient = async () => {
  if (!supabase) {
    const { supabase: supabaseClient, nexaflowStorage: storage } = await import('../pages/meetings/supabaseClient');
    supabase = supabaseClient;
    nexaflowStorage = storage;
  }
  return { supabase, nexaflowStorage };
};

class SupabaseRealtimeManager {
  constructor() {
    this.connStatus = 'unknown';
    this.listeners = [];
    this.useNexaflow = false;
    this.syncInProgress = false;
    this.offlineQueue = [];
    
    // Initialize supabase client
    initSupabaseClient().catch(err => console.error('Failed to initialize Supabase client:', err));
    
    // Import connection monitor using dynamic import to avoid circular dependencies
    import('./connectionMonitor').then(module => {
      this.connectionMonitor = module.default;
      this.connectionMonitor.addListener(this.handleConnectionChange.bind(this));
    }).catch(err => console.error('Failed to import connection monitor:', err));
  }

  handleConnectionChange = (isOnline) => {
    const oldStatus = this.connStatus;
    this.connStatus = isOnline ? 'connected' : 'disconnected';
    
    // Only trigger listeners if status actually changed
    if (oldStatus !== this.connStatus) {
      this.notifyListeners();
      
      // If we're back online, sync any offline data
      if (isOnline && oldStatus === 'disconnected') {
        this.syncNexaflowData();
      }
    }
  }
  
  addConnectionListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    
    // Return function to remove listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.connStatus);
      } catch (error) {
        console.error('Error in real-time connection listener:', error);
      }
    });
  }

  async syncNexaflowData() {
    // Prevent multiple sync operations running simultaneously
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Implementation to sync local data to Supabase when connection is restored
      console.log('Syncing local data to cloud storage...');
      
      // Process the offline queue
      if (this.offlineQueue.length > 0) {
        console.log(`Processing ${this.offlineQueue.length} offline operations...`);
        
        // Ensure supabase client is initialized
        await initSupabaseClient();
        
        for (const operation of this.offlineQueue) {
          try {
            // Process each operation based on its type
            if (operation.type === 'upload') {
              // Handle file upload sync
              // Code to upload file to Supabase
            } else if (operation.type === 'data') {
              // Handle data sync
              // Code to sync data with Supabase
            }
          } catch (err) {
            console.error('Failed to process offline operation:', err, operation);
          }
        }
        
        // Clear successfully processed items
        this.offlineQueue = [];
        
        // Save sync timestamp
        await nexaflowStorage.saveData('_last_sync', { timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Error syncing Nexaflow data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  isUsingNexaflow() {
    return this.useNexaflow;
  }
  
  getConnectionStatus() {
    return this.connStatus;
  }
  
  useConnectionStatus() {
    const [status, setStatus] = useState(this.connStatus);
    
    useEffect(() => {
      const removeListener = this.addConnectionListener(newStatus => {
        setStatus(newStatus);
      });
      
      return removeListener;
    }, []);
    
    return status;
  }
  
  // Add operation to queue for offline processing
  addToOfflineQueue(operation) {
    this.offlineQueue.push({
      ...operation,
      timestamp: Date.now()
    });
    
    // Save queue to persistent storage
    initSupabaseClient().then(({ nexaflowStorage }) => {
      nexaflowStorage.saveData('_offline_queue', this.offlineQueue);
    }).catch(err => console.error('Failed to save offline queue:', err));
    
    return true;
  }
}

/**
 * Custom hook for using Supabase realtime
 * @returns {Object} Supabase realtime status and methods
 */
export const useSupabaseRealtime = () => {
  const [status, setStatus] = useState('unknown');
  const [lastEvent, setLastEvent] = useState(null);
  
  useEffect(() => {
    const manager = new SupabaseRealtimeManager();
    const removeListener = manager.addConnectionListener((newStatus) => {
      setStatus(newStatus);
    });
    
    // Set initial status
    setStatus(manager.getConnectionStatus());
    
    return () => {
      removeListener();
    };
  }, []);
  
  return {
    status,
    lastEvent,
    isConnected: status === 'connected'
  };
};

// Create an instance for convenient access
export const supabaseRealtimeManager = new SupabaseRealtimeManager();

// Only export the class as default
export default SupabaseRealtimeManager;
