import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, Button, 
  CircularProgress, Alert, Divider
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  LightbulbOutlined as LightbulbIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AIRecommendation from './AIRecommendation';
import useAI from '../../Hooks/useAI';
import { useTranslation } from 'react-i18next';

const AIRecommendations = () => {
  const { t } = useTranslation();
  const { 
    loading, 
    error, 
    recommendations, 
    loadRecommendations,
    markRecommendationAsViewed
  } = useAI();
  const [activeTab, setActiveTab] = useState(0);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);

  // Load recommendations on component mount
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Filter recommendations when tab changes or recommendations are loaded/updated
  useEffect(() => {
    if (!recommendations) {
      setFilteredRecommendations([]);
      return;
    }

    if (activeTab === 0) {
      // All recommendations
      setFilteredRecommendations(recommendations);
    } else {
      // Filter by type based on activeTab
      const types = ['project', 'task', 'team', 'performance', 'security'];
      const selectedType = types[activeTab - 1];
      
      setFilteredRecommendations(
        recommendations.filter(r => 
          r.recommendation_type.toLowerCase() === selectedType
        )
      );
    }
  }, [activeTab, recommendations]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadRecommendations();
  };

  const handleActionTaken = async (recommendation) => {
    // Here you would typically navigate to the relevant page or open a modal
    // For this example, we'll just mark the recommendation as acted upon
    try {
      await markRecommendationAsViewed(recommendation.recommendation_id);
    } catch (error) {
      console.error("Error marking recommendation as acted upon:", error);
    }
  };

  const handleDismiss = async (recommendation) => {
    // Here you would typically call an API to dismiss the recommendation
    try {
      await markRecommendationAsViewed(recommendation.recommendation_id);
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LightbulbIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            {t('ai.recommendations.title')}
          </Typography>
          <Box 
            sx={{ 
              ml: 2, 
              px: 1.5, 
              py: 0.5, 
              borderRadius: 10, 
              fontSize: '0.875rem',
              fontWeight: 'medium',
              backgroundColor: 'primary.main',
              color: 'white'
            }}
          >
            {recommendations?.length || 0}
          </Box>
        </Box>

        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {t('common.refresh')}
        </Button>
      </Box>

      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={t('ai.recommendations.tabs.all')} />
          <Tab label={t('ai.recommendations.tabs.project')} />
          <Tab label={t('ai.recommendations.tabs.task')} />
          <Tab label={t('ai.recommendations.tabs.team')} />
          <Tab label={t('ai.recommendations.tabs.performance')} />
          <Tab label={t('ai.recommendations.tabs.security')} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredRecommendations.length > 0 ? (
          <AnimatePresence>
            {filteredRecommendations.map((recommendation) => (
              <AIRecommendation
                key={recommendation.recommendation_id}
                recommendation={recommendation}
                onActionTaken={handleActionTaken}
                onDismiss={handleDismiss}
              />
            ))}
          </AnimatePresence>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4,
              height: '100%',
              minHeight: 200
            }}
          >
            <LightbulbIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('ai.recommendations.noRecommendations')}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {t('ai.recommendations.checkLater')}
            </Typography>
            <Button 
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={handleRefresh}
            >
              {t('ai.recommendations.generateRecommendations')}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AIRecommendations;
