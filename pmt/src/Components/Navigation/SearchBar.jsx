import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, TextField, Box, Typography, 
  List, ListItem, ListItemIcon, ListItemText, IconButton,
  Divider, InputAdornment, CircularProgress
} from '@mui/material';
import { 
  Search, Close, Description, People, Event, Task, 
  LightbulbOutlined, ChatBubbleOutline, FolderOpen
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
    }
  }, [open]);

  // Handle search query
  const handleSearch = async (value) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // In a real app, replace with actual API call
      // const response = await axios.get(`/api/search?query=${encodeURIComponent(value)}`);
      // setResults(response.data);
      
      // For demo, simulate results after a delay
      setTimeout(() => {
        // Fallback data in case API fails
        const demoResults = [
          { id: '1', type: 'project', title: 'Website Redesign', path: '/projects/1' },
          { id: '2', type: 'task', title: 'Update API Documentation', path: '/tasks/2' },
          { id: '3', type: 'meeting', title: 'Weekly Standup', path: '/meetings/3' },
          { id: '4', type: 'user', title: 'John Smith', path: '/users/4' },
          { id: '5', type: 'document', title: 'Product Roadmap', path: '/documents/5' },
        ].filter(item => item.title.toLowerCase().includes(value.toLowerCase()));
        
        setResults(demoResults);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Search error:', error);
      // Provide static fallback data
      const fallbackResults = [
        { id: 'f1', type: 'project', title: 'Fallback Project', path: '/projects/fallback' },
        { id: 'f2', type: 'task', title: 'Fallback Task', path: '/tasks/fallback' }
      ].filter(item => item.title.toLowerCase().includes(value.toLowerCase()));
      
      setResults(fallbackResults);
      setLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      handleResultClick(results[selectedIndex]);
    }
  };

  // Handle result click
  const handleResultClick = (result) => {
    navigate(result.path);
    onClose();
  };

  // Get icon based on result type
  const getIconByType = (type) => {
    switch (type) {
      case 'project': return <FolderOpen color="primary" />;
      case 'task': return <Task color="secondary" />;
      case 'meeting': return <Event color="error" />;
      case 'user': return <People color="success" />;
      case 'document': return <Description color="info" />;
      case 'idea': return <LightbulbOutlined color="warning" />;
      case 'chat': return <ChatBubbleOutline color="action" />;
      default: return <Search />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { 
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ position: 'relative', p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading && <CircularProgress size={20} />}
              </InputAdornment>
            ),
            sx: { 
              py: 0.5,
              fontSize: '1.1rem',
              borderRadius: 2
            }
          }}
        />
        <IconButton
          sx={{ position: 'absolute', top: 10, right: 10 }}
          onClick={onClose}
        >
          <Close />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ p: 0, maxHeight: 400 }}>
        <AnimatePresence>
          {query.length > 0 && (
            <>
              {results.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <List sx={{ p: 0 }}>
                    {results.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ListItem 
                          button 
                          onClick={() => handleResultClick(result)}
                          selected={index === selectedIndex}
                          sx={{
                            px: 3,
                            py: 1.5,
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <ListItemIcon>
                            {getIconByType(result.type)}
                          </ListItemIcon>
                          <ListItemText 
                            primary={result.title}
                            secondary={t(`search.types.${result.type}`)}
                          />
                        </ListItem>
                        {index < results.length - 1 && (
                          <Divider variant="inset" component="li" />
                        )}
                      </motion.div>
                    ))}
                  </List>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    {loading ? (
                      <CircularProgress size={40} />
                    ) : (
                      <>
                        <Search sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                        <Typography variant="body1" color="text.secondary" mt={2}>
                          {t('search.noResults')}
                        </Typography>
                      </>
                    )}
                  </Box>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
        
        {query.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Search sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
            <Typography variant="body1" color="text.secondary" mt={2}>
              {t('search.startTyping')}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchBar;
