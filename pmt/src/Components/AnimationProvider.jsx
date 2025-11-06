import React, { createContext, useState, useEffect } from 'react';
import gsap from 'gsap';

// Create context
export const AnimationContext = createContext();

const AnimationProvider = ({ children }) => {
  const [animationsAvailable, setAnimationsAvailable] = useState(false);
  
  useEffect(() => {
    // Try to initialize GSAP
    try {
      // Check if DrawSVGPlugin is available
      if (gsap) {
        // Safely try to register required plugins
        try {
          // This approach prevents the app from crashing if the plugin is not available
          // but still allows it to work if it is
          const registerPlugins = () => {
            // Check for DrawSVGPlugin
            if (window.DrawSVGPlugin) {
              gsap.registerPlugin(window.DrawSVGPlugin);
            } else {
              console.warn("DrawSVGPlugin is not available. Some animations may not work properly.");
            }
            
            // Check for MotionPathPlugin
            if (window.MotionPathPlugin) {
              gsap.registerPlugin(window.MotionPathPlugin);
            } else {
              console.warn("MotionPathPlugin is not available. Some animations may not work properly.");
            }
          };

          registerPlugins();
          setAnimationsAvailable(true);
        } catch (error) {
          console.warn("Failed to register GSAP plugins:", error);
        }
      }
    } catch (error) {
      console.warn("GSAP initialization failed:", error);
    }
  }, []);

  // Simplified animation context
  const value = {
    animationsAvailable,
    gsap: animationsAvailable ? gsap : null,
    // Simple animation alternatives that don't require GSAP
    animate: {
      fadeIn: (element, duration = 0.3) => {
        if (!element) return;
        element.style.transition = `opacity ${duration}s ease`;
        element.style.opacity = 1;
      },
      fadeOut: (element, duration = 0.3) => {
        if (!element) return;
        element.style.transition = `opacity ${duration}s ease`;
        element.style.opacity = 0;
      }
    }
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export default AnimationProvider;