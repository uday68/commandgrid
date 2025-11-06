import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// Get recent activity
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get recent activity logs with user details
    const companyId = req.user.companyId;
    const activityQuery = `
      SELECT 
        al.log_id,
        al.user_id,
        u.name as user_name,
        u.profile_picture,
        al.project_id,
        p.name as project_name,
        al.action,
        COALESCE(al.timestamp, al.created_at) as timestamp
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      WHERE u.company_id = $1
      ORDER BY COALESCE(al.timestamp, al.created_at) DESC
      LIMIT 20
    `;
    
    // If no activity logs exist yet, create sample data for demo purposes
    const checkActivity = await pool.query(
      'SELECT COUNT(*) as count FROM activity_logs'
    );
    
    if (parseInt(checkActivity.rows[0].count) === 0) {
      await createSampleActivityLogs(companyId);
    }
    
    const result = await pool.query(activityQuery, [companyId]);
    
    // If still no results, return empty array
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Get recent activity (alias for root endpoint)
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    // Get recent activity logs with user details
    const companyId = req.query.companyId || req.user.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    const activityQuery = `
      SELECT 
        al.log_id,
        al.user_id,
        u.name as user_name,
        u.profile_picture,
        al.project_id,
        p.name as project_name,
        al.action,
        COALESCE(al.timestamp, al.created_at) as timestamp
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      WHERE u.company_id = $1
      ORDER BY COALESCE(al.timestamp, al.created_at) DESC
      LIMIT 20
    `;
    
    // If no activity logs exist yet, create sample data for demo purposes
    const checkActivity = await pool.query(
      'SELECT COUNT(*) as count FROM activity_logs WHERE user_id IN (SELECT user_id FROM users WHERE company_id = $1)',
      [companyId]
    );
    
    if (parseInt(checkActivity.rows[0].count) === 0) {
      await createSampleActivityLogs(companyId);
    }
    
    const result = await pool.query(activityQuery, [companyId]);
    
    // If still no results, return empty array
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity feed' });
  }
});

// Helper function to create sample activity logs
async function createSampleActivityLogs(companyId) {
  const sampleActions = [
    'created a new project',
    'completed a task',
    'updated project settings',
    'added a team member',
    'uploaded a file',
    'commented on a task'
  ];

  const users = await pool.query(
    'SELECT user_id FROM users WHERE company_id = $1 LIMIT 5',
    [companyId]
  );

  const projects = await pool.query(
    'SELECT project_id FROM projects WHERE owner_id IN (SELECT admin_id FROM admins WHERE company_id = $1) LIMIT 3',
    [companyId]
  );

  for (let i = 0; i < 10; i++) {
    const user = users.rows[Math.floor(Math.random() * users.rows.length)];
    const project = projects.rows[Math.floor(Math.random() * projects.rows.length)];
    const action = sampleActions[Math.floor(Math.random() * sampleActions.length)];
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

    await pool.query(
      `INSERT INTO activity_logs (user_id, project_id, action, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [user.user_id, project.project_id, action, timestamp]
    );
  }
}

export default router;