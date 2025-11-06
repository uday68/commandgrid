import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validator.js';
import { userContextSchema } from '../../models/schemas/userContextSchema.js';
import { UserContextService } from '../../services/userContextService.js';

const router = express.Router();
const userContextService = new UserContextService();

// Get all available contexts for the user
router.get('/contexts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contexts = await userContextService.getUserContexts(userId);
    const currentContext = await userContextService.getCurrentContext(userId);

    res.json({
      success: true,
      contexts,
      currentContext
    });
  } catch (error) {
    console.error('Error fetching user contexts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user contexts'
    });
  }
});

// Switch user context
router.post('/switch-context', 
  authenticateToken, 
  validate(userContextSchema.switchContext),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { contextId } = req.body;

      const success = await userContextService.switchContext(userId, contextId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid context or insufficient permissions'
        });
      }

      res.json({
        success: true,
        message: 'Context switched successfully'
      });
    } catch (error) {
      console.error('Error switching context:', error);
      res.status(500).json({
        success: false,
        message: 'Error switching context'
      });
    }
  }
);

export default router; 