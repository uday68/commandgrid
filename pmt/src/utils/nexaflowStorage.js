/**
 * A utility class for storage operations
 * Used for caching data and offline capabilities
 */
class NexaflowStorage {
  /**
   * Save data to the specified storage type
   * @param {string} key - Unique key for the data
   * @param {any} data - Data to store
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<boolean>} Success status
   */
  async saveData(key, data, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      const serializedData = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      
      storage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve data from the specified storage type
   * @param {string} key - Key to retrieve
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<any>} Retrieved data
   */
  async getData(key, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      const serializedData = storage.getItem(key);
      
      if (!serializedData) return null;
      
      return JSON.parse(serializedData).data;
    } catch (error) {
      console.error('Storage retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Remove data from storage
   * @param {string} key - Key to remove
   * @param {string} type - Storage type ('local', 'session', 'cache')
   * @returns {Promise<boolean>} Success status
   */
  async removeData(key, type = 'local') {
    try {
      const storage = this._getStorageByType(type);
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage removal error:', error);
      return false;
    }
  }
  
  /**
   * Get storage object by type
   * @private
   */
  _getStorageByType(type) {
    switch (type) {
      case 'session':
        return window.sessionStorage;
      case 'cache':
      case 'local':
      default:
        return window.localStorage;
    }
  }
}

export default new NexaflowStorage();
