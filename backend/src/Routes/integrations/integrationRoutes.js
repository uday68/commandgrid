import express from 'express';
import integrationService from '../../services/integrationService.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import integrationSchema from '../../models/schemas/integrationSchema.js';

const router = express.Router();

// Get all integrations for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await integrationService.getIntegrations(req.user.id);
    res.json(integrations);
  } catch (error) {
    console.error('Error getting integrations:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get available integrations
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const integrations = await integrationService.getAvailableIntegrations();
    res.json(integrations);
  } catch (error) {
    console.error('Error getting available integrations:', error);
    res.status(500).json({ error: 'Failed to get available integrations' });
  }
});

// Check integration status
router.get('/:integrationId/status', authenticateToken, async (req, res) => {
  try {
    const status = await integrationService.checkIntegrationStatus(
      req.user.id,
      req.params.integrationId
    );
    res.json(status);
  } catch (error) {
    console.error('Error checking integration status:', error);
    res.status(500).json({ error: 'Failed to check integration status' });
  }
});

// Connect integration
router.post(
  '/:integrationId/connect',
  authenticateToken,
  validateRequest(integrationSchema.connect),
  async (req, res) => {
    try {
      const result = await integrationService.connectIntegration(
        req.user.id,
        req.params.integrationId,
        req.body.credentials
      );
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error connecting integration:', error);
      res.status(500).json({ error: 'Failed to connect integration' });
    }
  }
);

// Disconnect integration
router.post('/:integrationId/disconnect', authenticateToken, async (req, res) => {
  try {
    const result = await integrationService.disconnectIntegration(
      req.user.id,
      req.params.integrationId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router; 