import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validator.js';
import { marketplaceSchema } from '../../models/schemas/marketplaceSchema.js';
import { MarketplaceService } from '../../services/marketplaceService.js';

const router = express.Router();
const marketplaceService = new MarketplaceService();

// Get available tools
router.get('/tools', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contextType = req.query.contextType || 'user';
    const contextId = req.query.contextId;

    const tools = await marketplaceService.getTools(userId, contextType, contextId);

    res.json({
      success: true,
      tools
    });
  } catch (error) {
    console.error('Error fetching marketplace tools:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching marketplace tools'
    });
  }
});

// Purchase a tool
router.post('/purchase', 
  authenticateToken,
  validateRequest(marketplaceSchema.purchase),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { toolId } = req.body;

      await marketplaceService.purchaseTool(userId, toolId);

      res.json({
        success: true,
        message: 'Tool purchased successfully'
      });
    } catch (error) {
      console.error('Error purchasing tool:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error purchasing tool'
      });
    }
  }
);

// Get purchased tools
router.get('/purchased', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tools = await marketplaceService.getPurchasedTools(userId);

    res.json({
      success: true,
      tools
    });
  } catch (error) {
    console.error('Error fetching purchased tools:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchased tools'
    });
  }
});

// Add a review
router.post('/review',
  authenticateToken,
  validateRequest(marketplaceSchema.review),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { toolId, rating, comment } = req.body;

      await marketplaceService.addReview(userId, toolId, rating, comment);

      res.json({
        success: true,
        message: 'Review added successfully'
      });
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error adding review'
      });
    }
  }
);

export default router; 