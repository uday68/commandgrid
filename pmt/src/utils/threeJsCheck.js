/**
 * Utility functions to check and ensure Three.js is properly loaded
 */

// Required Three.js libraries to check for
const requiredLibraries = [
  { name: 'THREE', path: 'three' },
  { name: 'OrbitControls', path: 'three/examples/jsm/controls/OrbitControls' },
  { name: 'EffectComposer', path: 'three/examples/jsm/postprocessing/EffectComposer' },
  { name: 'RenderPass', path: 'three/examples/jsm/postprocessing/RenderPass' },
  { name: 'ShaderPass', path: 'three/examples/jsm/postprocessing/ShaderPass' },
  { name: 'UnrealBloomPass', path: 'three/examples/jsm/postprocessing/UnrealBloomPass' }
];

/**
 * Check if Three.js is available and return status
 * @returns {Object} Status object with isAvailable and missing libraries
 */
export const checkThreeJsAvailability = () => {
  try {
    // Initialize missing array
    const missing = [];
    
    // Check if THREE is available globally
    const THREE = window.THREE || window.THREEJS;
    
    // Log availability of core THREE
    if (!THREE) {
      missing.push('THREE');
    }
    
    // Try importing other required libraries
    try { 
      require('three/examples/jsm/controls/OrbitControls');
    } catch (e) { 
      missing.push('OrbitControls'); 
    }
    
    try { 
      require('three/examples/jsm/postprocessing/EffectComposer');
    } catch (e) { 
      missing.push('EffectComposer'); 
    }
    
    try { 
      require('three/examples/jsm/postprocessing/RenderPass');
    } catch (e) { 
      missing.push('RenderPass'); 
    }
    
    try { 
      require('three/examples/jsm/postprocessing/ShaderPass');
    } catch (e) { 
      missing.push('ShaderPass'); 
    }
    
    try { 
      require('three/examples/jsm/postprocessing/UnrealBloomPass');
    } catch (e) { 
      missing.push('UnrealBloomPass'); 
    }

    return {
      isAvailable: missing.length === 0,
      missing
    };
  } catch (error) {
    console.error('Error checking ThreeJS availability:', error);
    return {
      isAvailable: false,
      missing: ['THREE_ERROR_CHECK'],
      error
    };
  }
};

/**
 * Logs the status of Three.js availability
 */
export const logThreeJsStatus = () => {
  const status = checkThreeJsAvailability();
  
  if (status.isAvailable) {
    console.log('✅ Three.js fully loaded and ready to use');
  } else {
    console.log('❌ Some THREE.js libraries are missing:', status.missing);
    console.log(status);
  }
  
  return status;
};

/**
 * Creates a placeholder object with empty methods to prevent errors
 * when THREE is not available
 */
export const createThreePlaceholder = () => {
  return {
    Scene: class Scene {},
    PerspectiveCamera: class PerspectiveCamera {},
    WebGLRenderer: class WebGLRenderer {
      setSize() {}
      render() {}
      dispose() {}
    },
    BoxGeometry: class BoxGeometry {},
    SphereGeometry: class SphereGeometry {},
    MeshBasicMaterial: class MeshBasicMaterial {},
    Mesh: class Mesh {},
    Vector2: class Vector2 {},
    Vector3: class Vector3 {},
    Color: class Color {},
    Group: class Group {},
    BufferGeometry: class BufferGeometry {},
    Clock: class Clock {}
  };
};

/**
 * Fix the Three.js namespace if some components are missing
 */
export const fixThreeJsNamespace = () => {
  try {
    // Import THREE even if it throws to provide fallbacks
    let THREE;
    try {
      THREE = require('three');
    } catch (e) {
      console.warn('Creating THREE placeholder due to import failure');
      window.THREE = createThreePlaceholder();
      return false;
    }

    // Fix global THREE reference if needed
    if (!window.THREE) {
      window.THREE = THREE;
    }

    // Create a proper export for IDE support and imports
    return true;
  } catch (error) {
    console.error('Error fixing THREE namespace:', error);
    return false;
  }
};

/**
 * Initialize Three.js and ensure it's properly loaded
 */
export const initThreeJs = async () => {
  try {
    // Check availability
    const status = checkThreeJsAvailability();
    
    // If already available, return early
    if (status.isAvailable) {
      return { success: true };
    }
    
    // Attempt to fix namespace
    const fixed = fixThreeJsNamespace();
    
    // Dynamic import remaining modules if needed
    if (status.missing.includes('OrbitControls')) {
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls');
      window.THREE.OrbitControls = OrbitControls;
    }
    
    if (status.missing.includes('EffectComposer')) {
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer');
      window.THREE.EffectComposer = EffectComposer;
    }
    
    if (status.missing.includes('RenderPass')) {
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass');
      window.THREE.RenderPass = RenderPass;
    }
    
    if (status.missing.includes('ShaderPass')) {
      const { ShaderPass } = await import('three/examples/jsm/postprocessing/ShaderPass');
      window.THREE.ShaderPass = ShaderPass;
    }
    
    if (status.missing.includes('UnrealBloomPass')) {
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass');
      window.THREE.UnrealBloomPass = UnrealBloomPass;
    }
    
    // Check again after fixing
    const finalStatus = checkThreeJsAvailability();
    
    return { 
      success: finalStatus.isAvailable,
      missing: finalStatus.missing
    };
  } catch (error) {
    console.error('Failed to initialize Three.js:', error);
    return {
      success: false,
      error
    };
  }
};

export default {
  checkThreeJsAvailability,
  logThreeJsStatus,
  createThreePlaceholder,
  fixThreeJsNamespace,
  initThreeJs
};
