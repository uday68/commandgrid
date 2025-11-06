import errorLogger from './errorLogger';

/**
 * Utility to monitor internet connection status
 * and notify listeners when it changes
 */
class ConnectionMonitor {
  constructor() {
    this._listeners = [];
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline);
      window.addEventListener('offline', this._handleOffline);
    }
  }

  /**
   * Handle online event
   * @private
   */
  _handleOnline = () => {
    const wasOffline = !this._isOnline;
    this._isOnline = true;
    
    if (wasOffline) {
      this._notifyListeners(true);
    }
  }

  /**
   * Handle offline event
   * @private
   */
  _handleOffline = () => {
    this._isOnline = false;
    this._notifyListeners(false);
  }

  /**
   * Notify all listeners of connection status change
   * @param {boolean} isOnline - Current online status
   * @private
   */
  _notifyListeners = (isOnline) => {
    this._listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        errorLogger.logError(error, 'ConnectionMonitor.notifyListeners');
      }
    });
  }

  /**
   * Add a connection status change listener
   * @param {Function} listener - Function to call when status changes
   * @returns {Function} Function to remove the listener
   */
  addListener = (listener) => {
    if (typeof listener !== 'function') {
      console.error('ConnectionMonitor: Listener must be a function');
      return () => {};
    }

    this._listeners.push(listener);
    
    // Immediately call with current status
    try {
      listener(this._isOnline);
    } catch (error) {
      errorLogger.logError(error, 'ConnectionMonitor.addListener');
    }
    
    // Return cleanup function
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * Check current connection status
   * @returns {boolean} Whether device is online
   */
  getStatus = () => {
    return this._isOnline;
  }

  /**
   * Manually check connection by making a small request
   * @returns {Promise<boolean>} Whether device has internet access
   */
  checkConnection = async () => {
    try {
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/ping?_=${timestamp}`, {
        method: 'HEAD',
        cache: 'no-store',
        timeout: 5000
      });
      
      const online = response.ok;
      
      // If status changed, notify listeners
      if (online !== this._isOnline) {
        this._isOnline = online;
        this._notifyListeners(online);
      }
      
      return online;
    } catch (error) {
      // If error, we're offline
      if (this._isOnline) {
        this._isOnline = false;
        this._notifyListeners(false);
      }
      
      return false;
    }
  }

  /**
   * Clean up event listeners (important for testing)
   */
  cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline);
      window.removeEventListener('offline', this._handleOffline);
    }
    this._listeners = [];
  }
}

// Export singleton instance
const connectionMonitor = new ConnectionMonitor();
export default connectionMonitor;
