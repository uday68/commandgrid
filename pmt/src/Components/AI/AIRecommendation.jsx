import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Button, Chip, IconButton,
  Collapse, Tooltip, Divider, Rating, TextField, CircularProgress, Alert
} from '@mui/material';
import {
  LightbulbOutlined as LightbulbIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Feedback as FeedbackIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import useAI from '../../Hooks/useAI';
import { useTranslation } from 'react-i18next';

/**
 * Component for displaying a single AI recommendation
 */
const AIRecommendation = ({ 
  recommendation,
  onActionTaken = () => {},
  onDismiss = () => {}
}) => {
  const { t } = useTranslation();
  const { markRecommendationAsViewed, submitFeedback } = useAI();
  const [expanded, setExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackValue, setFeedbackValue] = useState({
    rating: 0,
    comment: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Mark as viewed when component mounts
  useEffect(() => {
    const markAsViewed = async () => {
      if (!recommendation.viewed && !recommendation.is_offline) {
        try {
          await markRecommendationAsViewed(recommendation.recommendation_id);
        } catch (err) {
          console.error("Error marking recommendation as viewed:", err);
          // No UI feedback needed for this silent operation
        }
      }
    };
    
    markAsViewed();
  }, [recommendation, markRecommendationAsViewed]);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleActionClick = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await onActionTaken(recommendation);
    } catch (err) {
      setActionError(t('ai.recommendations.actionError'));
      // Error will auto-hide after 3 seconds
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissClick = async () => {
    setActionLoading(true);
    try {
      await onDismiss(recommendation);
    } catch (err) {
      console.error("Error dismissing recommendation:", err);
      // If dismiss fails, we'll leave the recommendation visible
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await submitFeedback(
        recommendation.recommendation_id,
        feedbackValue.rating,
        feedbackValue.comment
      );
      setShowFeedback(false);
      setFeedbackValue({ rating: 0, comment: '' });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      // Show an error message to the user
      alert(t('ai.recommendations.feedbackError'));
    }
  };

  // Get appropriate color and icon based on recommendation type
  const getRecommendationMeta = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'task':
        return { color: '#3b82f6', icon: 'task' };
      case 'project':
        return { color: '#8b5cf6', icon: 'project' };
      case 'team':
        return { color: '#10b981', icon: 'team' };
      case 'performance':
        return { color: '#f59e0b', icon: 'performance' };
      case 'security':
        return { color: '#ef4444', icon: 'security' };
      default:
        return { color: '#6b7280', icon: 'general' };
    }
  };

  // Make sure recommendation has all needed fields, using defaults if not provided
  const safeRecommendation = {
    recommendation_id: recommendation.recommendation_id || `temp-${Date.now()}`,
    recommendation_type: recommendation.recommendation_type || 'general',
    content: recommendation.content || 'No content available',
    confidence_score: recommendation.confidence_score || 0.7,
    created_at: recommendation.created_at || new Date().toISOString(),
    related_entity_type: recommendation.related_entity_type,
    is_offline: recommendation.is_offline || false
  };

  const { color, icon } = getRecommendationMeta(safeRecommendation.recommendation_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
          borderLeft: 4,
          borderLeftColor: color,
          borderRadius: 1,
          position: 'relative',
          overflow: 'hidden',
          opacity: safeRecommendation.is_offline ? 0.8 : 1
        }}
      >
        {safeRecommendation.is_offline && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: 5,
              right: 5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: 'warning.light',
              color: 'warning.contrastText',
              fontSize: '0.7rem'
            }}
          >
            {t('common.offline')}
          </Box>
        )}
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LightbulbIcon sx={{ color, mr: 1 }} />
            <Typography variant="subtitle1" fontWeight="medium">
              {t(`ai.recommendations.types.${icon}`)}
            </Typography>
            <Chip 
              label={`${Math.round(safeRecommendation.confidence_score * 100)}% ${t('ai.confidence')}`}
              size="small"
              sx={{ ml: 1, height: 20 }}
            />
          </Box>
          
          <Box>
            <IconButton size="small" onClick={handleExpandClick}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleDismissClick}
              disabled={actionLoading}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Typography variant="body2" sx={{ mb: 1 }}>
          {safeRecommendation.content.length > 120 && !expanded
            ? `${safeRecommendation.content.substring(0, 120)}...`
            : safeRecommendation.content}
        </Typography>
        
        <Collapse in={expanded} timeout="auto">
          {safeRecommendation.content.length > 120 && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {safeRecommendation.content}
            </Typography>
          )}
          
          {/* Optional related entity info */}
          {safeRecommendation.related_entity_type && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {t('ai.recommendations.relatedTo')}:{' '}
                <Typography 
                  component="span" 
                  variant="caption" 
                  fontWeight="medium"
                  sx={{ 
                    display: 'inline-block',
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1,
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    color: 'primary.main'
                  }}
                >
                  {safeRecommendation.related_entity_type}
                </Typography>
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Feedback section */}
          {!showFeedback ? (
            <Button 
              startIcon={<FeedbackIcon />} 
              size="small" 
              onClick={() => setShowFeedback(true)}
              sx={{ mr: 1 }}
            >
              {t('ai.recommendations.giveFeedback')}
            </Button>
          ) : (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('ai.recommendations.rateRecommendation')}
              </Typography>
              
              <Rating 
                value={feedbackValue.rating}
                onChange={(e, newValue) => setFeedbackValue(prev => ({ ...prev, rating: newValue }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder={t('ai.recommendations.feedbackPlaceholder')}
                value={feedbackValue.comment}
                onChange={(e) => setFeedbackValue(prev => ({ ...prev, comment: e.target.value }))}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button 
                  size="small" 
                  onClick={() => setShowFeedback(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackValue.rating === 0}
                >
                  {t('common.submit')}
                </Button>
              </Box>
            </Box>
          )}
        </Collapse>

        {/* Action error */}
        {actionError && (
          <Box sx={{ my: 1 }}>
            <Alert severity="error" sx={{ py: 0 }}>
              {actionError}
            </Alert>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1 }}>
          <Box>
            <Tooltip title={t('ai.recommendations.createdAt')}>
              <Typography variant="caption" color="text.secondary">
                {new Date(safeRecommendation.created_at).toLocaleDateString()}
              </Typography>
            </Tooltip>
          </Box>
          <Box>
            <Tooltip title={t('ai.recommendations.actionsTooltip')}>
              <Button
                variant="outlined"
                size="small"
                startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckIcon />}
                onClick={handleActionClick}
                color="primary"
                disabled={actionLoading}
              >
                {t('ai.recommendations.takeAction')}
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default AIRecommendation;
