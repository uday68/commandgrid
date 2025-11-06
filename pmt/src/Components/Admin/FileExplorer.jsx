import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFolderPlus, FiHome, FiUpload, FiSearch, FiFolderMinus } from 'react-icons/fi';
import { CircularProgress, Alert, IconButton, Typography } from '@mui/material';
import { FolderOpen, Visibility, Download, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const FileExplorer = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState('/');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Animation variants for enhanced UI
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  // Enhanced theme settings
  const themeStyles = {
    light: {
      bg: 'bg-white',
      paper: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300',
      shadow: 'shadow-lg shadow-blue-500/10',
      highlight: 'bg-blue-50',
    },
    dark: {
      bg: 'bg-gray-900',
      paper: 'bg-gray-800',
      text: 'text-gray-100',
      border: 'border-gray-700',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600',
      shadow: 'shadow-lg shadow-black/30',
      highlight: 'bg-gray-700',
    }
  }[theme];

  const getItemIcon = (item) => {
    // Logic to determine the icon based on item type
    return item.type === 'folder' ? <FiFolderPlus className="text-4xl text-blue-500" /> : <FiFolderMinus className="text-4xl text-gray-400" />;
  };

  const formatFileSize = (size) => {
    // Logic to format file size
    return `${(size / 1024).toFixed(2)} KB`;
  };

  const handlePreview = (item) => {
    // Logic to handle preview
  };

  const handleDownload = (item) => {
    // Logic to handle download
  };

  const handleDelete = (item) => {
    // Logic to handle delete
  };

  useEffect(() => {
    // Logic to fetch and filter items based on currentPath, searchTerm, filter, and sortBy
  }, [currentPath, searchTerm, filter, sortBy]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${themeStyles.card} ${themeStyles.shadow} rounded-xl border ${themeStyles.border} overflow-hidden`}
      style={{ width: '90%', margin: '0 auto' }}
    >
      <div className={`p-4 border-b ${themeStyles.border} flex justify-between items-center`}>
        <div className="flex items-center">
          <FiFolderPlus className="mr-2 text-blue-500" />
          <Typography variant="h6" className={themeStyles.text}>
            {t('fileExplorer.title')}
          </Typography>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${themeStyles.buttonSecondary}`}
            onClick={() => setCurrentPath('/')}
          >
            <FiHome className="text-sm" />
            {t('fileExplorer.home')}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${themeStyles.buttonPrimary}`}
            onClick={() => setShowUploadModal(true)}
          >
            <FiUpload className="text-sm" />
            {t('fileExplorer.upload')}
          </motion.button>
        </div>
      </div>
      
      {/* Navigation breadcrumb with animations */}
      <div className={`px-4 py-2 border-b ${themeStyles.border} flex items-center overflow-x-auto`}>
        <button 
          className={`px-2 py-1 rounded hover:${themeStyles.highlight} transition-colors`}
          onClick={() => setCurrentPath('/')}
        >
          <FiHome />
        </button>
        <span className="mx-1 text-gray-400">/</span>
        
        {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, index, array) => {
          const pathToHere = '/' + array.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={pathToHere}>
              <motion.button 
                className={`px-2 py-1 rounded hover:${themeStyles.highlight} transition-colors whitespace-nowrap`}
                onClick={() => setCurrentPath(pathToHere)}
                whileHover={{ scale: 1.05 }}
              >
                {segment}
              </motion.button>
              {index < array.length - 1 && (
                <span className="mx-1 text-gray-400">/</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="p-4">
        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('fileExplorer.search')}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${themeStyles.border} ${themeStyles.bg} ${themeStyles.text} focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${themeStyles.border} ${themeStyles.bg} ${themeStyles.text}`}
          >
            <option value="all">{t('fileExplorer.filterAll')}</option>
            <option value="documents">{t('fileExplorer.filterDocuments')}</option>
            <option value="images">{t('fileExplorer.filterImages')}</option>
            <option value="videos">{t('fileExplorer.filterVideos')}</option>
          </select>
          
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${themeStyles.border} ${themeStyles.bg} ${themeStyles.text}`}
          >
            <option value="name">{t('fileExplorer.sortName')}</option>
            <option value="date">{t('fileExplorer.sortDate')}</option>
            <option value="size">{t('fileExplorer.sortSize')}</option>
          </select>
        </div>
        
        {/* Files and folders grid with animations */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <CircularProgress />
            </motion.div>
          </div>
        ) : error ? (
          <Alert severity="error" className="my-4">{error}</Alert>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FiFolderMinus className="mx-auto text-4xl text-gray-400 mb-2" />
              <Typography variant="body1" className="text-gray-500">
                {searchTerm ? t('fileExplorer.noSearchResults') : t('fileExplorer.emptyFolder')}
              </Typography>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  className={`relative rounded-xl border ${themeStyles.border} ${themeStyles.bg} overflow-hidden transition-all duration-300`}
                >
                  <div 
                    className={`absolute inset-0 opacity-0 hover:opacity-100 bg-black/50 flex items-center justify-center gap-2 transition-opacity z-10`}
                    onClick={e => e.stopPropagation()}
                  >
                    {item.type === 'folder' ? (
                      <IconButton 
                        size="small" 
                        onClick={() => setCurrentPath(`${currentPath === '/' ? '' : currentPath}/${item.name}`)}
                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'white' } }}
                      >
                        <FolderOpen fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton 
                        size="small" 
                        onClick={() => handlePreview(item)}
                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'white' } }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    )}
                    
                    <IconButton 
                      size="small" 
                      onClick={() => handleDownload(item)}
                      sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'white' } }}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                    
                    <IconButton 
                      size="small"
                      onClick={() => handleDelete(item)}
                      sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'white' } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </div>
                  
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      if (item.type === 'folder') {
                        setCurrentPath(`${currentPath === '/' ? '' : currentPath}/${item.name}`);
                      } else {
                        handlePreview(item);
                      }
                    }}
                  >
                    <div className="flex justify-center mb-2">
                      {getItemIcon(item)}
                    </div>
                    <Typography 
                      variant="body2" 
                      className={`${themeStyles.text} text-center font-medium truncate`}
                    >
                      {item.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      className="text-gray-500 block text-center"
                    >
                      {item.type === 'folder' 
                        ? `${item.itemCount || 0} items` 
                        : formatFileSize(item.size)}
                    </Typography>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Enhanced modals with animations */}
      {/* ...existing code for modals with motion components added... */}
    </motion.div>
  );
};

export default FileExplorer;