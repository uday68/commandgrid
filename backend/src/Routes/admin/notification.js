// routes/admin/notifications.js
import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { logAudit } from '../../utils/logger.js';

const router = express.Router();

/**
 * @desc    Get all notifications for admin
 * @route   GET /api/admin/notifications
 * @access  Admin
 */
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM admin_notifications 
       WHERE admin_id = $1
       ORDER BY is_read, created_at DESC`,
      [req.user.adminId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/admin/notifications/:id/read
 * @access  Admin
 */
router.patch('/:id/read', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE notification_id = $1',
      [id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/admin/notifications/mark-all-read
 * @access  Admin
 */
router.patch('/mark-all-read', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE is_read = false AND admin_id = $1',
      [req.user.adminId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/admin/notifications/:id
 * @access  Admin
 */
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM admin_notifications WHERE notification_id = $1',
      [id]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'notification_deleted',
      actionDetails: `Notification ID ${id} deleted`
    });
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/admin/notifications/all
 * @access  Admin
 */
router.delete('/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM admin_notifications WHERE admin_id = $1',
      [req.user.adminId]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'all_notifications_deleted',
      actionDetails: `All notifications deleted by admin ID ${req.user.adminId}`
    });
    
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    console.error('Error deleting all notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;