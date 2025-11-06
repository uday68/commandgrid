import { pool } from '../Config/database.js';

/**
 * Get all notifications for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { is_read, status } = req.query;
    
    // Log query parameters for debugging
    console.log('Fetching notifications with params:', { userId, is_read, status });
    
    let query = `
      SELECT 
        notification_id,
        user_id,
        title,
        message,
        type,
        related_entity_id,
        related_entity_type,
        is_read,
        status,
        created_at
      FROM notifications 
      WHERE user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    // Handle status filtering
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    // Handle is_read filtering (for backward compatibility)
    if (is_read !== undefined && !status) {
      paramCount++;
      query += ` AND is_read = $${paramCount}`;
      params.push(is_read === 'true');
    }
    
    // Order by creation date, newest first
    query += ` ORDER BY created_at DESC`;
    
    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log(`Found ${result.rows.length} notifications`);
    
    res.json({
      notifications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;
    
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Create a new notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createNotification = async (req, res) => {
  try {
    const { 
      userId, 
      title, 
      message, 
      type, 
      relatedEntityId, 
      relatedEntityType 
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO notifications 
        (user_id, title, message, type, related_entity_id, related_entity_type, is_read, created_at) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, false, NOW())
       RETURNING *`,
      [userId, title, message, type, relatedEntityId, relatedEntityType]
    );
    
    res.status(201).json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;
    
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted', notification: result.rows[0] });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
