import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiChevronRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AdminBreadcrumbs = ({ path, theme, onNavigate }) => {
  const pathSegments = path.split('/').filter(segment => segment);

  // Map path segments to tab IDs in Dashboard.jsx
  const tabMapping = {
    // Core tabs
    'dashboard': 'dashboard',
    'projects': 'projects',
    'users': 'users',
    'reports': 'reports',
    'analytics': 'analytics',
    'security': 'security',
    'tools': 'tools',
    'audit': 'audit',
    'meetings': 'meetings',
    'calendar': 'calendar',
    'community': 'community',
    // Enterprise features
    'tasks': 'tasks',
    'notifications': 'notifications',
    'timetracking': 'time',
    'budget': 'budget',
    'integrations': 'integrations',
  };

  const formatSegment = segment => {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  const handleBreadcrumbClick = (segment) => {
    // If the segment maps to a tab, navigate to it
    if (tabMapping[segment.toLowerCase()] && onNavigate) {
      onNavigate(tabMapping[segment.toLowerCase()]);
      return true;
    }
    return false;
  };

  const themeClasses = {
    light: {
      text: 'text-gray-800',
      activeText: 'text-blue-600',
      separatorText: 'text-gray-400',
      hoverBg: 'hover:bg-gray-100'
    },
    dark: {
      text: 'text-gray-300',
      activeText: 'text-blue-400',
      separatorText: 'text-gray-600',
      hoverBg: 'hover:bg-gray-700'
    }
  }[theme];
  
  return (
    <motion.nav 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center text-sm"
    >
      <Link 
        to="#" 
        onClick={(e) => {
          e.preventDefault();
          if (onNavigate) onNavigate('dashboard');
        }}
        className={`${themeClasses.text} hover:${themeClasses.activeText} flex items-center ${themeClasses.hoverBg} p-1 rounded`}
      >
        <FiHome className="mr-1" />
        <span>Admin</span>
      </Link>
      
      {pathSegments.map((segment, index) => (
        <React.Fragment key={index}>
          <span className={`mx-2 ${themeClasses.separatorText}`}>
            <FiChevronRight />
          </span>
          {index === pathSegments.length - 1 ? (
            <span className={`font-medium ${themeClasses.activeText}`}>
              {formatSegment(segment)}
            </span>
          ) : (
            <button 
              onClick={(e) => {
                e.preventDefault();
                // Try to navigate using tab mapping, fallback to URL if not found
                if (!handleBreadcrumbClick(segment)) {
                  window.location.href = `/admin/${pathSegments.slice(0, index + 1).join('/')}`;
                }
              }}
              className={`${themeClasses.text} hover:${themeClasses.activeText} ${themeClasses.hoverBg} p-1 rounded`}
            >
              {formatSegment(segment)}
            </button>
          )}
        </React.Fragment>
      ))}
    </motion.nav>
  );
};

export default AdminBreadcrumbs;