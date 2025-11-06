/**
 * Common animation variants for Framer Motion
 */

// Container animations (staggered children)
export const containerVariants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      when: "afterChildren"
    }
  }
};

// List item animations
export const itemVariants = {
  hidden: { 
    y: 20, 
    opacity: 0 
  },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 100 
    }
  },
  exit: { 
    scale: 0.95, 
    opacity: 0,
    transition: { 
      duration: 0.2 
    }
  }
};

// Fade animations
export const fadeVariants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2 
    }
  }
};

// Card animations
export const cardVariants = {
  hidden: { 
    y: 20, 
    opacity: 0 
  },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: 'spring', 
      stiffness: 80,
      damping: 12
    }
  },
  hover: {
    y: -5,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 20 
    }
  },
  tap: {
    scale: 0.98,
    transition: { 
      duration: 0.1 
    }
  },
  exit: { 
    y: 20, 
    opacity: 0,
    transition: { 
      duration: 0.2 
    }
  }
};

// Modal animations
export const modalVariants = {
  hidden: { 
    opacity: 0, 
    y: 50, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 30 
    }
  },
  exit: { 
    opacity: 0, 
    y: 50, 
    scale: 0.9,
    transition: { 
      duration: 0.2 
    }
  }
};

// Page transition animations
export const pageVariants = {
  initial: {
    opacity: 0,
    x: '-2%'
  },
  in: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  out: {
    opacity: 0,
    x: '2%',
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

// Button animations
export const buttonVariants = {
  hover: { 
    scale: 1.05,
    transition: { 
      duration: 0.2 
    }
  },
  tap: { 
    scale: 0.95,
    transition: { 
      duration: 0.1 
    }
  },
  initial: { 
    scale: 1 
  }
};

export default {
  containerVariants,
  itemVariants,
  fadeVariants,
  cardVariants,
  modalVariants,
  pageVariants,
  buttonVariants
};
