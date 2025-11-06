import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /api/auth/session
 * @desc    Validate user session and return user data
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role, isAdmin } = req.user;
    
    if (!userId) {
      logger.warn('No user ID in token');
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    let userQuery;
    let userResult;
    
    if (isAdmin) {
      userQuery = `
        SELECT 
          admin_id as id, 
          email, 
          'Administrator' as name, 
          'Admin' as role, 
          company_id
        FROM admins
        WHERE admin_id = $1
      `;
      userResult = await pool.query(userQuery, [userId]);    } else {
      userQuery = `
        SELECT 
          u.user_id as id, 
          u.email, 
          u.name, 
          u.company_id,
          u.registration_type,
          CASE 
            WHEN t.leader_id = u.user_id THEN 'Team Leader'
            ELSE u.role 
          END as role
        FROM users u
        LEFT JOIN teams t ON t.leader_id = u.user_id
        WHERE u.user_id = $1
      `;
      userResult = await pool.query(userQuery, [userId]);
    }

    if (userResult.rows.length === 0) {
      logger.warn(`User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    logger.info('Session validated for user:', { id: user.id, email: user.email, role: user.role });
      res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.company_id,
        registration_type: user.registration_type || 'individual',
        isAdmin: isAdmin
      }
    });
  } catch (error) {
    logger.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router; 