import React from 'react';
import { motion } from 'framer-motion';

const AdminWrapper = ({ children, initialAnimation = true }) => {
  return (
    <motion.div
      initial={initialAnimation ? { opacity: 0 } : false}
      animate={initialAnimation ? { opacity: 1 } : false}
      transition={{ duration: 0.5 }}
      style={{ width: '85%', margin: '0 auto' }}
    >
      {children}
    </motion.div>
  );
};

export default AdminWrapper;
