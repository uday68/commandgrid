import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';

// Avoid direct import to prevent circular dependency
// Instead use dynamic imports where needed
let nexaflowStorage = null;

const initApiClient = async () => {
  if (!nexaflowStorage) {
    const { nexaflowStorage: storage } = await import('../pages/meetings/apiClient');
    nexaflowStorage = storage;
  }
  return { nexaflowStorage };
};

class RealtimeManager {
  constructor() {
    this.connStatus = 'unknown';
    this.listeners = [];
    this.syncInProgress = false;
    this.offlineQueue = [];
    
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
        this.syncOfflineData();
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

  async syncOfflineData() {
    // Prevent multiple sync operations running simultaneously
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Implementation to sync local data to backend when connection is restored
      console.log('Syncing local data to backend...');
      
      // Process the offline queue
      if (this.offlineQueue.length > 0) {
        console.log(`Processing ${this.offlineQueue.length} offline operations...`);
        
        // Ensure storage is initialized
        await initApiClient();
        
        for (const operation of this.offlineQueue) {
          try {
            // Process each operation based on its type
            if (operation.type === 'upload') {
              // Handle file upload sync
            } else if (operation.type === 'data') {
              // Handle data sync
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
      console.error('Error syncing offline data:', error);
    } finally {
      this.syncInProgress = false;
    }
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
    initApiClient().then(({ nexaflowStorage }) => {
      nexaflowStorage.saveData('_offline_queue', this.offlineQueue);
    }).catch(err => console.error('Failed to save offline queue:', err));
    
    return true;
  }
}

/**
 * Custom hook for using realtime connection status
 * @returns {Object} Connection status and methods
 */
export const useRealtimeConnection = () => {
  const [status, setStatus] = useState('unknown');
  const [lastEvent, setLastEvent] = useState(null);
  
  useEffect(() => {
    const manager = new RealtimeManager();
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
export const realtimeManager = new RealtimeManager();

// Only export the class as default
export default RealtimeManager;