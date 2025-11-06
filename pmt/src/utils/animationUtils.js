/**
 * Utility functions for animations and GSAP
 */

/**
 * Safely loads a GSAP plugin
 * @param {string} pluginName - The name of the plugin to load
 * @returns {object|null} - The plugin object or null if not available
 */
export const safelyLoadGsapPlugin = (pluginName) => {
  try {
    const gsap = window.gsap || require('gsap');
    const plugin = require(`gsap/${pluginName}`);
    
    if (plugin && gsap) {
      gsap.registerPlugin(plugin);
      return plugin;
    }
  } catch (error) {
    console.warn(`Failed to load GSAP plugin: ${pluginName}`, error.message);
  }
  return null;
};

/**
 * Checks if GSAP and its core plugins are available
 * @returns {object} - Object with availability status of GSAP and plugins
 */
export const checkGsapAvailability = () => {
  try {
    const gsap = window.gsap || require('gsap');
    
    // Check essential plugins
    const drawSVG = gsap.core?.globals?.DrawSVGPlugin || false;
    const motionPath = gsap.core?.globals?.MotionPathPlugin || false;
    
    return {
      gsap: !!gsap,
      DrawSVGPlugin: !!drawSVG,
      MotionPathPlugin: !!motionPath,
      allAvailable: !!gsap && !!drawSVG && !!motionPath
    };
  } catch (error) {
    return {
      gsap: false,
      DrawSVGPlugin: false,
      MotionPathPlugin: false,
      allAvailable: false,
      error: error.message
    };
  }
};

/**
 * Creates a fallback animation using CSS if GSAP is not available
 * @param {HTMLElement} element - The DOM element to animate
 * @param {string} animationType - Type of animation (fade, slide, etc.)
 */
export const createFallbackAnimation = (element, animationType = 'fade') => {
  if (!element) return;
  
  // Add CSS class for fallback animation
  element.classList.add(`animation-fallback-${animationType}`);
  
  // Remove class after animation would have completed
  setTimeout(() => {
    element.classList.remove(`animation-fallback-${animationType}`);
  }, 1000);
};

/**
 * Animation utilities and fallbacks for when GSAP plugins aren't available
 */

// Check if GSAP and plugins are available
export const hasGSAP = typeof window !== 'undefined' && window.gsap;
export const hasDrawSVGPlugin = hasGSAP && window.DrawSVGPlugin;

/**
 * Simple fallback for stroke animation when DrawSVGPlugin isn't available
 * @param {Element} element - SVG element to animate
 * @param {Object} options - Animation options
 */
export const animateStroke = (element, options = {}) => {
  if (!element) return;
  
  const {
    duration = 1, 
    delay = 0,
    ease = 'power1.inOut',
    onComplete
  } = options;

  // Use GSAP DrawSVGPlugin if available
  if (hasGSAP && hasDrawSVGPlugin) {
    gsap.to(element, {
      drawSVG: '0% 100%',
      duration,
      delay,
      ease,
      onComplete
    });
    return;
  }
  
  // Fallback using CSS animation
  const length = element.getTotalLength ? element.getTotalLength() : 100;
  
  // Set initial state
  element.style.strokeDasharray = length;
  element.style.strokeDashoffset = length;
  
  // Trigger animation
  setTimeout(() => {
    element.style.transition = `stroke-dashoffset ${duration}s ${ease.replace('.', '-')}`;
    element.style.strokeDashoffset = 0;
    
    // Handle completion
    if (onComplete) {
      setTimeout(onComplete, duration * 1000);
    }
  }, delay * 1000);
};

export default {
  safelyLoadGsapPlugin,
  checkGsapAvailability,
  createFallbackAnimation,
  animateStroke
};
