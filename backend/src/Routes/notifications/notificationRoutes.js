import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../Config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import notificationAnalyticsRoutes from './notificationAnalyticsRoutes.js';

// Convert ESM __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import notification service using CommonJS require() in an ESM module
const notificationService = await import('../../Services/notificationService.js')
  .catch(err => {
    console.error('Failed to load notification service:', err);
    return { default: { triggerNotificationsNow: async () => ({ success: false, error: 'Service not available' }) } };
  });

const router = express.Router();

// Mount analytics routes
router.use('/analytics', notificationAnalyticsRoutes);

/**
 * @route   GET /api/notifications/status
 * @desc    Get notification service status
 * @access  Private (Admin)
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    message: 'Notification service is running',
    schedulerActive: true,
    lastRun: new Date().toISOString()
  });
});

/**
 * @route   POST /api/notifications/trigger
 * @desc    Manually trigger notification processing
 * @access  Private (Admin)
 */
router.post('/trigger', async (req, res) => {
  try {
    const result = await notificationService.default.triggerNotificationsNow();
    res.json(result);
  } catch (error) {
    console.error('Error triggering notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to trigger notifications',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/notifications/reminders
 * @desc    Get pending reminders that will be processed on next run
 * @access  Private (Admin)
 */
router.get('/reminders', async (req, res) => {
  try {
    // This is a simplified version - in production, you'd use the actual database pool
    const pool = notificationService.default.pool;
    
    const pendingReminders = await pool.query(`
      SELECT 
        r.reminder_id,
        r.entity_type,
        r.entity_id,
        r.message,
        r.method,
        r.trigger_at,
        r.status,
        r.retry_count,
        r.created_at
      FROM reminders r
      WHERE 
        r.status = 'pending' AND
        r.trigger_at <= NOW() AND
        (r.retry_count < r.max_retries OR r.max_retries IS NULL)
      LIMIT 50
    `);

    res.json({ 
      count: pendingReminders.rows.length,
      reminders: pendingReminders.rows 
    });
  } catch (error) {
    console.error('Error fetching pending reminders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending reminders',
      error: error.message 
    });
  }
});

// Get all notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Support both req.user.id and req.user.userId for compatibility
    const userId = req.user.id || req.user.userId || req.query.user_id;
    const { page = 1, limit = 20, type, status, is_read } = req.query;
    const offset = (page - 1) * limit;

    // Log query parameters for debugging
    console.log('Fetching notifications with params:', { userId, page, limit, type, status, is_read });
    
    // Use parameterized queries with named parameters for PostgreSQL
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const queryParams = [userId];
    let paramCount = 1;

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }
      // Add support for is_read filter using status field
    if (is_read !== undefined) {
      paramCount++;
      // If is_read=true, we look for status='read', otherwise status='unread'
      query += ` AND status = $${paramCount}`;
      queryParams.push(is_read === 'true' || is_read === true ? 'read' : 'unread');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount+1} OFFSET $${paramCount+2}`;
    queryParams.push(parseInt(limit), offset);
    
    console.log('Executing query:', query, 'with params:', queryParams);

    const { rows } = await pool.query(query, queryParams);
    console.log(`Found ${rows.length} notifications`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get notification by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;    const query = `
      SELECT * FROM notifications
      WHERE id = $1 AND user_id = $2
    `;

    const { rows } = await pool.query(query, [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId; 
    
    const query = `
      UPDATE notifications
      SET viewed_at = NOW(),
          is_read = true,
          status = 'read'
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rowCount } = await pool.query(query, [id, userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const query = `
      UPDATE notifications
      SET viewed_at = NOW(),
          is_read = true,
          status = 'read'
      WHERE user_id = $1 AND (viewed_at IS NULL OR status = 'unread' OR is_read = false)
    `;

    await pool.query(query, [userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rowCount } = await pool.query(query, [id, userId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete all notifications
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      DELETE FROM notifications
      WHERE user_id = ?
    `;

    await pool.query(query, [userId]);
    res.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT * FROM notification_preferences
      WHERE user_id = ?
    `;

    const [rows] = await pool.query(query, [userId]);
    if (rows.length === 0) {
      // Return default preferences if none exist
      return res.json({
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        email_preferences: {},
        push_preferences: {},
        in_app_preferences: {}
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_enabled,
      push_enabled,
      in_app_enabled,
      email_preferences,
      push_preferences,
      in_app_preferences
    } = req.body;

    const query = `
      INSERT INTO notification_preferences (
        user_id,
        email_enabled,
        push_enabled,
        in_app_enabled,
        email_preferences,
        push_preferences,
        in_app_preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        email_enabled = VALUES(email_enabled),
        push_enabled = VALUES(push_enabled),
        in_app_enabled = VALUES(in_app_enabled),
        email_preferences = VALUES(email_preferences),
        push_preferences = VALUES(push_preferences),
        in_app_preferences = VALUES(in_app_preferences)
    `;

    await pool.query(query, [
      userId,
      email_enabled,
      push_enabled,
      in_app_enabled,
      JSON.stringify(email_preferences),
      JSON.stringify(push_preferences),
      JSON.stringify(in_app_preferences)
    ]);

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;