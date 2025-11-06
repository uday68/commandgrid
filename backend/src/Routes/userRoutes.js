import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all users with filtering
router.get('/', authenticateToken, userController.getUsers);

// Create a new user
router.post('/', authenticateToken, userController.createUser);

// Update an existing user
router.put('/:userId', authenticateToken, userController.updateUser);

// Delete a user
router.delete('/:userId', authenticateToken, userController.deleteUser);

// Send welcome email
router.post('/:userId/send-welcome', authenticateToken, userController.sendWelcomeEmail);

// Get user activity
router.get('/:userId/activity', authenticateToken, userController.getUserActivity);

// Reset user password
router.post('/:userId/reset-password', authenticateToken, userController.resetUserPassword);

// Impersonate a user
router.post('/impersonate', authenticateToken, userController.impersonateUser);

// End impersonation
router.post('/end-impersonation', authenticateToken, userController.endImpersonation);

export default router;
