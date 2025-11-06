/**
 * A utility for logging errors and retrieving error logs
 */
class ErrorLogger {
  constructor() {
    this.storageKey = 'pmt_error_logs';
    this.maxLogs = 100;
  }
  
  /**
   * Log an error to local storage and optionally to a remote server
   * @param {string|Error} error - The error to log
   * @param {string} context - The context where the error occurred
   * @param {Object} metadata - Additional metadata about the error
   * @returns {Object} The logged error entry
   */
  logError(error, context = 'general', metadata = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    const errorEntry = {
      message: errorMessage,
      stack: errorStack,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      user: this.getCurrentUser()
    };
    
    // Store in local storage
    const logs = this.getErrorLogs();
    logs.unshift(errorEntry); // Add to the beginning
    
    // Keep only a specified number of recent logs
    const trimmedLogs = logs.slice(0, this.maxLogs);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
    
    // In a real app, you might send this to a remote server
    // this.sendToRemoteServer(errorEntry);
    
    return errorEntry;
  }
  
  /**
   * Get all stored error logs
   * @returns {Array} Array of error log entries
   */
  getErrorLogs() {
    try {
      const storedLogs = localStorage.getItem(this.storageKey);
      return storedLogs ? JSON.parse(storedLogs) : [];
    } catch (e) {
      console.error('Failed to retrieve error logs:', e);
      return [];
    }
  }
  
  /**
   * Clear all stored error logs
   */
  clearErrorLogs() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Failed to clear error logs:', e);
    }
  }
  
  /**
   * Get information about the current user
   * @returns {Object} User information or null
   * @private
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return {
        id: user.id || user.user_id,
        username: user.username,
        role: user.role
      };
    } catch (e) {
      return null;
    }
  }
}

export default new ErrorLogger();
