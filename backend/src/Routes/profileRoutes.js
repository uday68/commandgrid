import express from 'express';
import profileController from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// General profile endpoint for current user
router.get('/profile', authenticateToken, profileController.getCurrentUserProfile);

// User profile routes
// Get user profile
router.get('/users/profile/:userId', authenticateToken, profileController.getUserProfile);

// Update user profile
router.put('/users/:userId', authenticateToken, profileController.updateProfile);

// Update user profile picture
router.post(
  '/users/:userId/profile-picture',
  authenticateToken,
  profileController.upload.single('profilePicture'),
  profileController.updateProfilePicture
);

// Admin profile routes
// Get admin profile
router.get('/admins/profile/:userId', authenticateToken, (req, res, next) => {
  req.query.userType = 'admin';
  next();
}, profileController.getUserProfile);

// Update admin profile
router.put('/admins/:userId', authenticateToken, (req, res, next) => {
  req.query.userType = 'admin';
  next();
}, profileController.updateProfile);

// Update admin profile picture
router.post(
  '/admins/:userId/profile-picture',
  authenticateToken,
  (req, res, next) => {
    req.query.userType = 'admin';
    next();
  },
  profileController.upload.single('profilePicture'),
  profileController.updateProfilePicture
);

export default router;
