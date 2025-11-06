import i18n from '../i18n';
import { Assignment, Schedule, Group, Insights, Summarize } from '@mui/icons-material';

/**
 * Get translation with fallback support
 * @param {string} key - Translation key
 * @param {string} defaultValue - Default value to use if key is not found
 * @returns {string} Translated text or fallback
 */
export const getTranslation = (key, defaultValue = '') => {
  if (!i18n) return defaultValue || key;
  
  if (i18n.exists(key)) {
    return i18n.t(key);
  }
  
  // Try to resolve namespace
  if (key.includes('.')) {
    const parts = key.split('.');
    const namespace = parts[0];
    const nestedKey = parts.slice(1).join('.');
    
    if (i18n.exists(nestedKey, { ns: namespace })) {
      return i18n.t(nestedKey, { ns: namespace });
    }
  }
  
  return defaultValue || key;
};

/**
 * Get AI feature categories with proper translations
 * @returns {Array} Array of categories with translated strings
 */
export const getAIFeatureCategories = () => {
  const t = (key, defaultValue) => getTranslation(key, defaultValue);
  
  return [
    {
      title: "Project and Task Guidance",
      icon: Assignment,
      description: t('features.ai.projectTaskGuidance.desc', 'Our AI generates detailed implementation guides and intelligently breaks down complex tasks'),
      subFeatures: [
        {
          title: t('features.ai.projectTaskGuidance.guides.title', 'Implementation Guides'),
          description: t('features.ai.projectTaskGuidance.guides.desc', 'AI generates detailed, step-by-step implementation guides for tasks based on historical data, best practices, and individual user skills.')
        },
        {
          title: t('features.ai.projectTaskGuidance.decomposition.title', 'Task Decomposition'),
          description: t('features.ai.projectTaskGuidance.decomposition.desc', 'The system intelligently suggests how to divide large tasks into smaller, actionable components.')
        }
      ]
    },
    {
      title: "Time and Resource Estimation",
      icon: Schedule,
      description: t('features.ai.timeResource.desc', 'AI-powered time estimates and resource allocation recommendations'),
      subFeatures: [
        {
          title: t('features.ai.timeResource.estimates.title', 'Accurate Time Estimates'),
          description: t('features.ai.timeResource.estimates.desc', 'Using historical data, the AI calculates optimistic, realistic, and pessimistic time estimates.')
        },
        {
          title: t('features.ai.timeResource.allocation.title', 'Resource Allocation'),
          description: t('features.ai.timeResource.allocation.desc', 'The system recommends optimal resource distribution based on project complexity.')
        }
      ]
    },
    // More categories can be added here as needed
  ];
};

export default {
  getTranslation,
  getAIFeatureCategories
};
