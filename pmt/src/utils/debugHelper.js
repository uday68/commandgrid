/**
 * Debug helper function to log package versions
 */
export const logPackageVersions = async () => {
  try {
    // Implementation for checking package versions
    const packageInfo = {
      react: require('react').version,
      reactDom: require('react-dom').version,
      mui: require('@mui/material/package.json').version,
      i18next: require('i18next').version
    };
    
    console.log('Package versions:', packageInfo);
    return packageInfo;
  } catch (err) {
    console.error('Failed to check package versions:', err);
    return null;
  }
};

/**
 * Debug helper for animation components
 * @param {string} message - Debug message
 * @param {Object} data - Optional data to log
 */
export const debugAnimation = (message, data = null) => {
  const isDev = process.env.NODE_ENV === 'development';
  const debugEnabled = localStorage.getItem('pmt_debug_animations') === 'true';
  
  if (isDev && debugEnabled) {
    if (data) {
      console.log(`%c[Animation] ${message}`, 'color: #9c27b0', data);
    } else {
      console.log(`%c[Animation] ${message}`, 'color: #9c27b0');
    }
  }
};

/**
 * Check if the browser supports WebGL
 * @returns {boolean} Whether WebGL is available
 */
export const checkWebGLAvailability = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

export default {
  logPackageVersions,
  debugAnimation,
  checkWebGLAvailability
};
