/**
 * Browser-compatible file utility functions
 * Use these instead of fs/fs-extra in browser code
 */

/**
 * Save data to browser's localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to store (will be JSON stringified)
 */
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Error saving to localStorage:', err);
    return false;
  }
};

/**
 * Load data from browser's localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Parsed data or default value
 */
export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error('Error loading from localStorage:', err);
    return defaultValue;
  }
};

/**
 * Download data as a file in the browser
 * @param {string|Blob} content - Content to download
 * @param {string} filename - Name for the downloaded file
 * @param {string} type - MIME type of the file
 */
export const downloadFile = (content, filename, type = 'application/json') => {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Read a file from an input element
 * @param {File} file - File object from input element
 * @returns {Promise<string|ArrayBuffer>} File contents
 */
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file); // Use readAsArrayBuffer() for binary files
  });
};

/**
 * Upload file to server
 * @param {File} file - File to upload
 * @param {string} url - Upload endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const uploadFile = async (file, url, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return fetch(url, {
    method: 'POST',
    body: formData,
    ...options
  });
};
