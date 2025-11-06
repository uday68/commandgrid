import { motion } from 'framer-motion';

export const slideIn = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 15 } },
  exit: { x: 100, opacity: 0 }
};

export const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
};

export const pulse = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

export const morph = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};