import React from 'react';
import AdminHeader from './AdminHeader';
import AdminFooter from './AdminFooter';
import AdminBreadcrumbs from './AdminBreadcrumbs';
import { motion } from 'framer-motion';

const AdminLayout = ({ children, user, notifications, theme, location }) => {
  const themeClasses = {
    bg: theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}>
      <AdminHeader 
        user={user}
        notifications={notifications}
        theme={theme}
      />
      
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Admin breadcrumbs */}
          <AdminBreadcrumbs path={location.pathname} theme={theme} />
          
          {/* Main content */}
          <div className="mt-6">
            {children}
          </div>
        </motion.div>
      </div>
      
      <AdminFooter theme={theme} />
    </div>
  );
};

export default AdminLayout;