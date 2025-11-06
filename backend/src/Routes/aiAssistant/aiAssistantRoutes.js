const express = require('express');
const router = express.Router();
const aiAssistantService = require('../../services/aiAssistantService');
const { authenticateToken } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const aiAssistantSchema = require('../../models/schemas/aiAssistantSchema');

// Create a new AI assistant session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const session = await aiAssistantService.createSession(req.user.id, req.body.context);
    res.json(session);
  } catch (error) {
    console.error('Error creating AI assistant session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session history
router.get('/sessions/:sessionId/history', authenticateToken, async (req, res) => {
  try {
    const history = await aiAssistantService.getSessionHistory(req.params.sessionId);
    res.json(history);
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

// Process user message
router.post('/sessions/:sessionId/message', 
  authenticateToken,
  validateRequest(aiAssistantSchema.message),
  async (req, res) => {
    try {
      const response = await aiAssistantService.processUserInput(
        req.params.sessionId,
        req.user.id,
        req.body.input,
        req.body.context
      );
      res.json(response);
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
);

// Get personalized recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const recommendations = await aiAssistantService.getPersonalizedRecommendations(
      req.user.id,
      req.query.context
    );
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Update user preferences
router.put('/preferences',
  authenticateToken,
  validateRequest(aiAssistantSchema.preferences),
  async (req, res) => {
    try {
      const preferences = await aiAssistantService.updateUserPreferences(
        req.user.id,
        req.body.preferences
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await aiAssistantService.getUserPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

module.exports = router; 