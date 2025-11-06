import express from 'express';
import aiRoutes from './aiRoutes.js';
import adminProjectRoutes from './admin/projectRoutes.js';
import adminCalendarRoutes from './admin/calendarEvents.js';
import authRoutes from './auth/index.js';
import meetingsRoutes from './meetingsRoutes.js';

const router = express.Router();

// API health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API version endpoint
router.get('/version', (req, res) => {
  res.json({
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Register routes
router.use('/ai', aiRoutes);
router.use('/admin/projects', adminProjectRoutes);
router.use('/admin/calendar', adminCalendarRoutes);
router.use('/auth', authRoutes);
router.use('/meetings', meetingsRoutes);

export default router;
