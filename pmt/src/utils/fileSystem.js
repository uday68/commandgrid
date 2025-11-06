import { isNode, isBrowser } from './environmentDetection';
import errorHandler from './errorHandler';
import supabaseRealtimeManager from './supabaseRealtimeManager';

/**
 * Safe file system wrapper that works in both Node and browser environments
 */
class SafeFileSystem {
  constructor() {
    this.fs = null;
    this.initialized = false;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.pendingOperations = [];
    
    // Set up online/offline event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  async initialize() {
    if (this.initialized) return;
    
    if (isNode()) {
      // In Node.js environment, use real fs
      try {
        // Use dynamic import to avoid bundlers pulling in fs module in browser builds
        this.fs = await import('fs-extra');
      } catch (err) {
        console.error('Failed to import fs-extra:', err);
        errorHandler.logError(err, 'FileSystem.initialize');
      }
    } else {
      // In browser, use browser-compatible storage
      this.fs = this._createBrowserFs();
      
      // Try to process any pending operations from previous sessions
      try {
        const { nexaflowStorage } = await import('../pages/meetings/supabaseClient');
        const pendingOps = await nexaflowStorage.getData('_pending_fs_operations');
        if (pendingOps && Array.isArray(pendingOps.data)) {
          this.pendingOperations = pendingOps.data;
          this._processPendingOperations();
        }
      } catch (err) {
        console.error('Failed to load pending operations:', err);
      }
    }
    
    this.initialized = true;
  }

  async readFile(path, options = {}) {
    await this.initialize();
    
    if (!this.fs) {
      throw new Error('File system not available in this environment');
    }
    
    // Ensure path is a string, not a Symbol
    if (typeof path !== 'string') {
      throw new TypeError('File path must be a string');
    }
    
    if (isNode()) {
      return this.fs.readFile(path, options);
    } else {
      return this.fs.readFile(path, options);
    }
  }
  
  handleOnline() {
    this.isOnline = true;
    this._processPendingOperations();
  }
  
  handleOffline() {
    this.isOnline = false;
  }
  
  async _processPendingOperations() {
    if (!this.isOnline || this.pendingOperations.length === 0) return;
    
    try {
      const { nexaflowStorage } = await import('../pages/meetings/supabaseClient');
      
      for (let i = 0; i < this.pendingOperations.length; i++) {
        const op = this.pendingOperations[i];
        
        try {
          // Process operation based on type
          if (op.type === 'write') {
            // Handle write operation
            await this.writeFile(op.path, op.data, op.options);
          } else if (op.type === 'delete') {
            // Handle delete operation
            await this.deleteFile(op.path);
          }
          
          // Add to supabase sync queue if needed
          if (op.syncToCloud) {
            supabaseRealtimeManager.addToOfflineQueue({
              type: 'file',
              operation: op.type,
              path: op.path,
              timestamp: Date.now()
            });
          }
        } catch (err) {
          console.error(`Failed to process pending operation: ${op.type}`, err);
        }
      }
      
      // Clear processed operations
      this.pendingOperations = [];
      await nexaflowStorage.saveData('_pending_fs_operations', this.pendingOperations);
    } catch (err) {
      console.error('Error processing pending operations:', err);
    }
  }
  
  _createBrowserFs() {
    // Implement a simple browser-compatible storage API
    // This is just a mock example
    return {
      readFile: async (path) => {
        // Use localStorage or IndexedDB for browser storage
        const content = localStorage.getItem(`file:${path}`);
        if (content === null) throw new Error(`File not found: ${path}`);
        return content;
      },
      writeFile: async (path, data) => {
        localStorage.setItem(`file:${path}`, data);
      },
      // Implement other methods as needed
    };
  }
}

// Export singleton instance
const fileSystem = new SafeFileSystem();
export default fileSystem;
