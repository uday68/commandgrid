import React, { useContext, forwardRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // Using framer-motion for simple animations
import { AnimationContext } from '../AnimationProvider';

const SimpleAnimation = forwardRef((props, ref) => {
  // Handle all possible context property names and provide fallback
  const context = useContext(AnimationContext) || {};
  const [error, setError] = useState(null);
  
  // Check for animations being enabled through multiple possible properties
  const isAnimationEnabled = context.animationsEnabled || context.animationsAvailable || false;
  
  useEffect(() => {
    // Reset error state when component mounts or remounts
    setError(null);
  }, []);
  
  // If there's an error, render nothing or a minimal fallback
  if (error) {
    console.warn("Animation error:", error);
    return <div ref={ref} style={{ display: 'none' }} />; 
  }
  
  // If animations are disabled, render an empty div with the ref instead of null
  if (!isAnimationEnabled) {
    return <div ref={ref} style={{ display: 'none' }} />;
  }

  try {
    return (
      <div 
        ref={ref}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 0.5, 0.2],
            scale: [0.8, 1.2, 1],
            x: [-10, 10, 0],
            y: [10, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            ease: "easeInOut",
            repeat: 0
          }}
          style={{
            position: 'absolute',
            bottom: '5%',
            right: '5%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
            filter: 'blur(20px)',
          }}
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0.1] }}
          transition={{ 
            duration: 4, 
            ease: "easeInOut", 
            repeat: 0,
            delay: 1
          }}
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #42e695, #3bb2b8)',
            filter: 'blur(15px)',
          }}
        />
      </div>
    );
  } catch (err) {
    // Catch any rendering errors and handle gracefully
    console.error("Error rendering animation:", err);
    setError(err);
    return <div ref={ref} style={{ display: 'none' }} />;
  }
});

// Add display name for better debugging
SimpleAnimation.displayName = 'SimpleAnimation';

export default SimpleAnimation;
