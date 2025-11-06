import { gsap } from 'gsap';

/**
 * Utility functions for SVG animations without requiring DrawSVGPlugin
 */

/**
 * Animates an SVG path stroke using dasharray/dashoffset technique
 * @param {String|Element} selector - CSS selector or DOM element
 * @param {Object} options - Animation options
 */
export const animateSVGStroke = (selector, options = {}) => {
  const {
    duration = 1,
    delay = 0,
    ease = 'power1.inOut',
    from = true, // true = animate from hidden to visible, false = visible to hidden
    onComplete,
    ...restOptions
  } = options;
  
  const element = typeof selector === 'string' ? 
    document.querySelector(selector) : selector;
  
  if (!element) return;
  
  // Get the total length of the path
  const length = element.getTotalLength ? 
    element.getTotalLength() : 1000;
  
  // Set up the animation
  gsap.set(element, {
    strokeDasharray: length,
    strokeDashoffset: from ? length : 0,
    visibility: 'visible'
  });
  
  // Animate the stroke
  return gsap.to(element, {
    strokeDashoffset: from ? 0 : length,
    duration,
    delay,
    ease,
    onComplete,
    ...restOptions
  });
};

/**
 * Creates a revealing animation for an SVG
 * @param {String|Element} selector - SVG or path element(s)
 * @param {Object} options - Animation options
 */
export const revealSVG = (selector, options = {}) => {
  const paths = typeof selector === 'string' ?
    document.querySelectorAll(`${selector} path`) :
    selector.querySelectorAll('path');
    
  const timeline = gsap.timeline(options);
  
  paths.forEach((path, index) => {
    timeline.add(animateSVGStroke(path, {
      duration: options.duration || 0.5,
      delay: index * (options.stagger || 0.1)
    }), index === 0 ? 0 : '-=0.4');
  });
  
  return timeline;
};
