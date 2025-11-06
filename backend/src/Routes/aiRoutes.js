import express from 'express';
import AIController from '../controllers/AIController.js';  // Note the .js extension
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/ai/sessions
 * @desc    Create a new AI assistance session
 * @access  Private
 */
router.post('/sessions', authenticateToken, AIController.createSession);

/**
 * @route   GET /api/ai/sessions
 * @desc    Get all AI sessions for a user
 * @access  Private
 */
router.get('/sessions', authenticateToken, AIController.getSessions);

/**
 * @route   GET /api/ai/sessions/:sessionId
 * @desc    Get a specific AI session with its interactions
 * @access  Private
 */
router.get('/sessions/:sessionId', authenticateToken, AIController.getSession);

/**
 * @route   PUT /api/ai/sessions/:sessionId/close
 * @desc    Close an AI session
 * @access  Private
 */
router.put('/sessions/:sessionId/close', authenticateToken, AIController.closeSession);

/**
 * @route   POST /api/ai/sessions/:sessionId/interact
 * @desc    Send a message to an existing AI session
 * @access  Private
 */
router.post('/sessions/:sessionId/interact', authenticateToken, AIController.sendMessage);

/**
 * @route   POST /api/ai/feedback
 * @desc    Submit feedback for an AI interaction
 * @access  Private
 */
router.post('/feedback', authenticateToken, AIController.submitFeedback);

/**
 * @route   POST /api/ai/analyze-task/:taskId
 * @desc    Analyze a task using AI
 * @access  Private
 */
router.post('/analyze-task/:taskId', authenticateToken, AIController.analyzeTask);

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get AI recommendations for a user
 * @access  Private
 */
router.get('/recommendations', authenticateToken, AIController.getRecommendations);

/**
 * @route   PATCH /api/ai/recommendations/:recommendationId
 * @desc    Mark AI recommendation as viewed or acted upon
 * @access  Private
 */
router.patch('/recommendations/:recommendationId', authenticateToken, AIController.updateRecommendationStatus);

/**
 * @route   GET /api/ai/analytics
 * @desc    Get AI analytics data
 * @access  Private
 */
router.get('/analytics', authenticateToken, AIController.getAnalytics);

/**
 * @route   POST /api/ai/generate-report
 * @desc    Generate a report using AI
 * @access  Private
 */
router.post('/generate-report', authenticateToken, AIController.generateReportContent);

export default router;
