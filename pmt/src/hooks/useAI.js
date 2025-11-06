import { useState, useCallback, useEffect } from 'react';
import AIService from '../Services/AIService';

/**
 * Custom hook to interact with the AI service
 */
const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Detect offline/online status
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    setOfflineMode(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Initialize a new AI session
   */
  const startSession = useCallback(async (context, initialPrompt) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.createSession(context, initialPrompt);
      setSession(response.session);
      setInteractions([response.interaction]);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start AI session';
      setError(errorMsg);
      
      // Create a fallback session and interaction
      const fallbackSession = {
        session_id: `offline-${Date.now()}`,
        context,
        initial_prompt: initialPrompt,
        status: 'active',
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      const fallbackInteraction = {
        interaction_id: `offline-int-${Date.now()}`,
        session_id: fallbackSession.session_id,
        user_message: initialPrompt,
        ai_response: "I'm operating in offline mode right now. I can provide basic assistance, but my capabilities are limited until the connection is restored.",
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      setSession(fallbackSession);
      setInteractions([fallbackInteraction]);
      
      return {
        session: fallbackSession,
        interaction: fallbackInteraction
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send a message to the AI and get response
   */
  const sendMessage = useCallback(async (sessionId, message, contextData = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.sendMessage(sessionId, message, contextData);
      const newInteraction = response.interaction;
      
      setInteractions(prev => [...prev, newInteraction]);
      return newInteraction;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to get AI response';
      setError(errorMsg);
      
      // Create a fallback interaction
      const fallbackInteraction = {
        interaction_id: `offline-int-${Date.now()}`,
        session_id: sessionId,
        user_message: message,
        ai_response: "I'm having trouble connecting to the server. Please check your connection and try again.",
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      setInteractions(prev => [...prev, fallbackInteraction]);
      return fallbackInteraction;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load an existing session
   */
  const loadSession = useCallback(async (sessionId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.getSession(sessionId);
      setSession(response.session);
      setInteractions(response.interactions);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load AI session';
      setError(errorMsg);
      
      // Create a fallback session with a single interaction
      const fallbackSession = {
        session_id: sessionId,
        context: 'general',
        initial_prompt: 'Session data unavailable',
        status: 'active',
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      const fallbackInteraction = {
        interaction_id: `offline-int-${Date.now()}`,
        session_id: sessionId,
        user_message: 'Session data unavailable',
        ai_response: "I couldn't retrieve your previous conversation. Let's start a new one. How can I help you today?",
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      setSession(fallbackSession);
      setInteractions([fallbackInteraction]);
      
      return {
        session: fallbackSession,
        interactions: [fallbackInteraction]
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Close the current session
   */
  const closeSession = useCallback(async () => {
    if (!session) return;
    
    try {
      await AIService.closeSession(session.session_id);
      setSession(null);
      setInteractions([]);
    } catch (err) {
      console.error('Failed to close AI session:', err);
    }
  }, [session]);

  /**
   * Load AI recommendations
   */
  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.getRecommendations();
      setRecommendations(response);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load AI recommendations';
      setError(errorMsg);
      
      // Create fallback recommendations
      const fallbackRecommendations = [
        {
          recommendation_id: 'offline-rec-1',
          recommendation_type: 'task',
          content: 'Consider breaking down complex tasks into smaller, more manageable subtasks.',
          confidence_score: 0.85,
          created_at: new Date().toISOString(),
          is_offline: true
        },
        {
          recommendation_id: 'offline-rec-2',
          recommendation_type: 'project',
          content: 'Regular team check-ins can help identify potential issues early.',
          confidence_score: 0.78,
          created_at: new Date().toISOString(),
          is_offline: true
        }
      ];
      
      setRecommendations(fallbackRecommendations);
      return fallbackRecommendations;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark a recommendation as viewed
   */
  const markRecommendationAsViewed = useCallback(async (recommendationId) => {
    try {
      await AIService.updateRecommendationStatus(recommendationId, { viewed: true });
      setRecommendations(prev => 
        prev.map(rec => 
          rec.recommendation_id === recommendationId 
            ? { ...rec, viewed: true } 
            : rec
        )
      );
    } catch (err) {
      console.error('Failed to update recommendation:', err);
    }
  }, []);

  /**
   * Load AI analytics data
   */
  const loadAnalytics = useCallback(async (timeRange = 'month') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.getAnalytics(timeRange);
      setAnalyticsData(response);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load AI analytics';
      setError(errorMsg);
      
      // Create fallback analytics data
      const fallbackAnalyticsData = {
        time_range: timeRange,
        insights: [
          {
            insight_id: 'offline-insight-1',
            description: 'Offline mode: Unable to fetch analytics data.',
            created_at: new Date().toISOString(),
            is_offline: true
          }
        ]
      };
      
      setAnalyticsData(fallbackAnalyticsData);
      return fallbackAnalyticsData;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Submit feedback for an AI interaction
   */
  const submitFeedback = useCallback(async (interactionId, rating, comments, correctedResponse) => {
    try {
      await AIService.submitFeedback(interactionId, rating, comments, correctedResponse);
    } catch (err) {
      console.error('Failed to submit AI feedback:', err);
      throw err;
    }
  }, []);

  /**
   * Analyze a task using AI
   */
  const analyzeTask = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIService.analyzeTask(taskId);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to analyze task';
      setError(errorMsg);
      
      // Create fallback analysis data
      const fallbackAnalysisData = {
        task_id: taskId,
        analysis: 'Offline mode: Unable to analyze task.',
        created_at: new Date().toISOString(),
        is_offline: true
      };
      
      return fallbackAnalysisData;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Close any active session when component unmounts
      if (session?.status === 'active') {
        closeSession().catch(console.error);
      }
    };
  }, [session, closeSession]);

  return {
    loading,
    error,
    session,
    interactions,
    recommendations,
    analyticsData,
    offlineMode,
    startSession,
    sendMessage,
    loadSession,
    closeSession,
    loadRecommendations,
    markRecommendationAsViewed,
    loadAnalytics,
    submitFeedback,
    analyzeTask
  };
};

export default useAI;
