/**
 * Check if code is running in Node.js environment
 */
export const isNode = () => {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
};

/**
 * Check if code is running in browser environment
 */
export const isBrowser = () => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Get environment information
 */
export const getEnvironmentInfo = () => {
  if (isNode()) {
    return {
      type: 'node',
      version: process.version,
      platform: process.platform
    };
  } else if (isBrowser()) {
    return {
      type: 'browser',
      userAgent: navigator.userAgent,
      vendor: navigator.vendor
    };
  } else {
    return {
      type: 'unknown'
    };
  }
};
