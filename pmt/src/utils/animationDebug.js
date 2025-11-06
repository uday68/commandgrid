/**
 * Helper utility for debugging animations
 */

// Enable or disable animation debugging
const DEBUG_ANIMATIONS = true; 

/**
 * Logs animation messages if debugging is enabled
 * @param {string} message - Debug message to log
 * @param {any} data - Optional data to include
 */
export const debugAnimation = (message, data = null) => {
  if (!DEBUG_ANIMATIONS) return;
  
  if (data) {
    console.log(`[Animation Debug] ${message}`, data);
  } else {
    console.log(`[Animation Debug] ${message}`);
  }
};

/**
 * Check if WebGL is available and working
 * @returns {boolean} - Whether WebGL is available
 */
export const checkWebGLAvailability = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!window.WebGLRenderingContext && 
           (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
};

/**
 * Check if the animation system requirements are met
 */
export const checkAnimationRequirements = () => {
  const results = {
    webgl: checkWebGLAvailability(),
    threeJs: typeof THREE !== 'undefined',
    satisfiesBrowserVersions: true // Add logic to check browser versions if needed
  };
  
  debugAnimation('Animation system requirements check:', results);
  return results;
};
