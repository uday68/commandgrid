// Animation variants for registration components

// Standard fade up animation
export const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 500
    }
  }
};

// Slide in from side animation
export const slideIn = (direction = 'right', delay = 0) => ({
  hidden: { 
    x: direction === 'right' ? 50 : -50, 
    opacity: 0 
  },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 500,
      delay
    }
  }
});

// Pulse animation for highlighting
export const pulse = {
  hidden: { scale: 1 },
  visible: { 
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};

// Morphing animation for smooth transitions
export const morph = {
  hidden: { 
    borderRadius: '16px', 
    opacity: 0,
    scale: 0.9
  },
  visible: { 
    borderRadius: ['16px', '24px', '16px'],
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.2,
      ease: 'easeInOut'
    }
  }
};

// Stagger animation for children elements
export const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Light effects animation
export const lightRay = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: [0, 0.5, 0.2],
    scale: 2,
    transition: {
      duration: 2.5,
      repeat: Infinity,
      repeatType: 'reverse'
    }
  }
};

// Typing animation
export const typing = {
  hidden: { width: '0%' },
  visible: { 
    width: '100%',
    transition: {
      duration: 1.5,
      ease: 'easeInOut'
    }
  }
};

// Path drawing animation
export const pathDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 1.5, bounce: 0 },
      opacity: { duration: 0.3 }
    }
  }
};

// Particle effects
export const particleEffect = (index) => ({
  hidden: { 
    opacity: 0,
    y: 0,
    x: 0
  },
  visible: { 
    opacity: [0, 1, 0],
    y: [0, -50 - Math.random() * 30],
    x: [0, (Math.random() - 0.5) * 100],
    transition: {
      duration: 1.5 + Math.random(),
      repeat: Infinity,
      delay: index * 0.1
    }
  }
});
