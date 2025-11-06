import express from 'express';
import { cache } from '../middleware/cache.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';
import { recordMetric, getMetrics, generateReport } from '../utils/metrics.js';
import { pool } from '../Config/database.js';

const router = express.Router();

// Apply rate limiting and authentication
router.use(apiLimiter);
router.use(authenticateToken);

// Get project metrics
router.get('/projects', cache(300), async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        AVG(EXTRACT(EPOCH FROM (end_date - start_date))/86400) as avg_duration_days
      FROM projects
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get team metrics
router.get('/teams', cache(300), async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        COUNT(*) as total_teams,
        COUNT(DISTINCT project_id) as teams_with_projects,
        AVG(team_size) as avg_team_size
      FROM (
        SELECT t.id, t.project_id, COUNT(tm.user_id) as team_size
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        GROUP BY t.id, t.project_id
      ) team_sizes
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM teams) as total_teams,
        (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '7 days') as active_users_7d,
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in-progress') as in_progress_tasks,
        (SELECT COUNT(*) FROM security_threats WHERE severity = 'high' AND created_at > NOW() - INTERVAL '24 hours') as high_severity_threats_24h
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user metrics
router.get('/users', cache(300), async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d
      FROM users
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task metrics
router.get('/tasks', cache(300), async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as done_tasks,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_completion_days
      FROM tasks
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    console.error('Error fetching task metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity metrics
router.get('/activities', cache(300), async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_type = 'create' THEN 1 END) as create_actions,
        COUNT(CASE WHEN action_type = 'update' THEN 1 END) as update_actions,
        COUNT(CASE WHEN action_type = 'delete' THEN 1 END) as delete_actions,
        COUNT(DISTINCT user_id) as active_users
      FROM activity_logs
      WHERE timestamp > NOW() - INTERVAL '30 days'
    `);
    res.json(metrics.rows[0]);
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a metric
router.post('/record', async (req, res) => {
  try {
    const { name, value, tags, projectId } = req.body;
    await recordMetric({
      name,
      value,
      tags,
      userId: req.user.id,
      projectId
    });
    res.status(201).json({ message: 'Metric recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics for a specific time range
router.get('/', async (req, res) => {
  try {
    const { name, startDate, endDate, filters } = req.query;
    const metrics = await getMetrics({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      filters: filters ? JSON.parse(filters) : {}
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate a report
router.post('/reports', async (req, res) => {
  try {
    const { type, startDate, endDate, filters } = req.body;
    const report = await generateReport({
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      filters
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system metrics (CPU, memory, disk, etc.)
router.get('/system', cache(60), async (req, res) => {
  try {
    const os = await import('os');
    const fs = await import('fs').then(m => m.promises);
    
    // Get CPU information
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    
    // Calculate average CPU usage (simplified approach)
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50% range for demo
    
    // Memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.round((1 - freeMem / totalMem) * 100);
    
    // Get system uptime in days
    const uptimeDays = Math.floor(os.uptime() / 86400);
    
    // Disk usage (simplified - actual implementation would check specific drives)
    const diskUsage = Math.floor(Math.random() * 40) + 30; // 30-70% range for demo
    
    // Network stats (mock data for demo)
    const networkIn = Math.floor(Math.random() * 1000000); // bytes
    const networkOut = Math.floor(Math.random() * 500000); // bytes
    
    // System services (mock data)
    const activeServices = 45;
    const totalServices = 52;
    
    // Temperature (mock data)
    const temperature = Math.floor(Math.random() * 20) + 35; // 35-55°C
    
    const metrics = {
      cpu: cpuUsage,
      cpuCount: cpuCount,
      memory: memoryUsage,
      totalMemory: Math.round(totalMem / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(freeMem / 1024 / 1024 / 1024), // GB
      disk: diskUsage,
      uptime: uptimeDays,
      network: {
        in: networkIn,
        out: networkOut
      },
      services: {
        active: activeServices,
        total: totalServices
      },
      temperature: temperature,
      lastReboot: new Date(Date.now() - (uptimeDays * 24 * 60 * 60 * 1000)).toISOString(),
      timestamp: new Date().toISOString()
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve system metrics',
      cpu: 0,
      cpuCount: 0,
      memory: 0,
      disk: 0,
      uptime: 0,
      network: { in: 0, out: 0 },
      services: { active: 0, total: 0 },
      temperature: 0,
      lastReboot: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;