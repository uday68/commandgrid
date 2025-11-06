import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', authenticateToken, getNotifications);

// Mark a notification as read
router.patch('/:notificationId/read', authenticateToken, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, markAllAsRead);

// Create a new notification (protected to admin or service)
router.post('/', authenticateToken, createNotification);

// Delete a notification
router.delete('/:notificationId', authenticateToken, deleteNotification);

export default router;
