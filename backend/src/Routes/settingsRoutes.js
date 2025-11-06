import express from 'express';
import { pool } from '../config/db.js';

const router = express.Router();

/**
 * @desc    Get system settings
 * @route   GET /api/settings/system
 * @access  Admin
 */
router.get('/system', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const result = await pool.query(
      'SELECT * FROM system_settings WHERE company_id = $1',
      [companyId]
    );
    
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

/**
 * @desc    Update system settings
 * @route   PUT /api/settings/system
 * @access  Admin
 */
router.put('/system', async (req, res) => {
  try {
    const { companyName, timezone, dateFormat, theme, language } = req.body;
    const companyId = req.user.companyId;
    
    const query = `
      INSERT INTO system_settings 
        (company_id, company_name, timezone, date_format, theme, language, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (company_id) 
      DO UPDATE SET 
        company_name = $2,
        timezone = $3,
        date_format = $4,
        theme = $5,
        language = $6,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      companyId, 
      companyName, 
      timezone, 
      dateFormat, 
      theme, 
      language
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

/**
 * @desc    Get user preferences
 * @route   GET /api/settings/preferences
 * @access  Private
 */
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/settings/preferences
 * @access  Private
 */
router.put('/preferences', async (req, res) => {
  try {
    const { theme, notifications, language, dashboard_layout } = req.body;
    const userId = req.user.userId;
    
    const query = `
      INSERT INTO user_preferences 
        (user_id, theme, notifications, language, dashboard_layout, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        theme = $2,
        notifications = $3,
        language = $4,
        dashboard_layout = $5,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, 
      theme, 
      notifications, 
      language, 
      dashboard_layout
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

/**
 * @desc    Get notification settings
 * @route   GET /api/settings/notifications
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );
    
    res.json(result.rows[0] || {
      email_notifications: true,
      push_notifications: true,
      task_reminders: true,
      meeting_reminders: true,
      project_updates: true
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/settings/notifications
 * @access  Private
 */
router.put('/notifications', async (req, res) => {
  try {
    const { 
      email_notifications, 
      push_notifications,
      task_reminders,
      meeting_reminders,
      project_updates
    } = req.body;
    
    const userId = req.user.userId;
    
    const query = `
      INSERT INTO notification_settings 
        (user_id, email_notifications, push_notifications, 
         task_reminders, meeting_reminders, project_updates, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        email_notifications = $2,
        push_notifications = $3,
        task_reminders = $4,
        meeting_reminders = $5,
        project_updates = $6,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, 
      email_notifications, 
      push_notifications, 
      task_reminders, 
      meeting_reminders, 
      project_updates
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

export default router;
