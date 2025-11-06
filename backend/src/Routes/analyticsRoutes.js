import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

/**
 * @desc    Get analytics metrics
 * @route   GET /api/analytics/metrics
 * @access  Admin
 */
router.get('/metrics', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const companyId = req.user.companyId;
    
    // Define date range based on timeframe
    let dateFilter;
    switch (timeframe) {
      case 'week':
        dateFilter = "NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "NOW() - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "NOW() - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "NOW() - INTERVAL '30 days'";
    }    // Get current metrics
    const currentMetricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE company_id = $1) as total_users,
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND last_active > ${dateFilter}) as active_users,
        (SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'completed') as completed_projects,        (SELECT COALESCE(AVG(COALESCE(completion_percentage, 0)), 0) FROM tasks 
          WHERE company_id = $1 AND created_at > ${dateFilter}) as avg_task_completion
    `;

    // Get previous period metrics for comparison
    const previousMetricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND created_at < ${dateFilter}) as prev_total_users,
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND last_active > (${dateFilter} - INTERVAL '${timeframe === 'week' ? '7 days' : timeframe === 'month' ? '30 days' : timeframe === 'quarter' ? '90 days' : '365 days'}') 
          AND last_active < ${dateFilter}) as prev_active_users,
        (SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'completed' 
          AND completed_at < ${dateFilter}) as prev_completed_projects,        (SELECT COALESCE(AVG(COALESCE(completion_percentage, 0)), 0) FROM tasks 
          WHERE company_id = $1 AND created_at < ${dateFilter}) as prev_avg_task_completion
    `;
    
    const [currentMetrics, previousMetrics] = await Promise.all([
      pool.query(currentMetricsQuery, [companyId]),
      pool.query(previousMetricsQuery, [companyId])
    ]);

    const result = {
      totalUsers: parseInt(currentMetrics.rows[0]?.total_users || 0),
      activeUsers: parseInt(currentMetrics.rows[0]?.active_users || 0),
      completedProjects: parseInt(currentMetrics.rows[0]?.completed_projects || 0),
      avgTaskCompletion: parseFloat(currentMetrics.rows[0]?.avg_task_completion || 0).toFixed(2),
      prevTotalUsers: parseInt(previousMetrics.rows[0]?.prev_total_users || 0),
      prevActiveUsers: parseInt(previousMetrics.rows[0]?.prev_active_users || 0),
      prevCompletedProjects: parseInt(previousMetrics.rows[0]?.prev_completed_projects || 0),
      prevAvgTaskCompletion: parseFloat(previousMetrics.rows[0]?.prev_avg_task_completion || 0).toFixed(2)
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics metrics' });
  }
});

/**
 * @desc    Get user activity data
 * @route   GET /api/analytics/user-activity
 * @access  Admin
 */
router.get('/user-activity', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const companyId = req.user.companyId;
    
    // Define date range based on timeframe
    let interval, groupBy;
    switch (timeframe) {
      case 'week':
        interval = '7 days';
        groupBy = 'day';
        break;
      case 'month':
        interval = '30 days';
        groupBy = 'day';
        break;
      case 'quarter':
        interval = '90 days';
        groupBy = 'week';
        break;
      case 'year':
        interval = '365 days';
        groupBy = 'month';
        break;
      default:
        interval = '30 days';
        groupBy = 'day';
    }

    let groupByClause;
    if (groupBy === 'day') {
      groupByClause = "DATE_TRUNC('day', al.created_at)";
    } else if (groupBy === 'week') {
      groupByClause = "DATE_TRUNC('week', al.created_at)";
    } else {
      groupByClause = "DATE_TRUNC('month', al.created_at)";
    }

    const query = `
      SELECT 
        ${groupByClause} as time_period,
        COUNT(*) as total_activities,
        COUNT(DISTINCT al.user_id) as active_users,
        COUNT(CASE WHEN al.action = 'login' THEN 1 ELSE NULL END) as logins,
        COUNT(CASE WHEN al.action = 'task_created' THEN 1 ELSE NULL END) as tasks_created,
        COUNT(CASE WHEN al.action = 'task_completed' THEN 1 ELSE NULL END) as tasks_completed
      FROM 
        activity_logs al
      JOIN 
        users u ON al.user_id = u.user_id
      WHERE 
        u.company_id = $1
        AND al.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY 
        time_period
      ORDER BY 
        time_period
    `;

    const result = await pool.query(query, [companyId]);
    
    // Format dates and parse numbers
    const formattedData = result.rows.map(row => ({
      date: row.time_period,
      totalActivities: parseInt(row.total_activities),
      activeUsers: parseInt(row.active_users),
      logins: parseInt(row.logins),
      tasksCreated: parseInt(row.tasks_created),
      tasksCompleted: parseInt(row.tasks_completed)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching user activity data:', error);
    res.status(500).json({ error: 'Failed to fetch user activity data' });
  }
});

/**
 * @desc    Get project status data
 * @route   GET /api/analytics/project-status
 * @access  Admin
 */
router.get('/project-status', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM 
        projects
      WHERE 
        company_id = $1
      GROUP BY 
        status
      ORDER BY 
        count DESC
    `;

    const result = await pool.query(query, [companyId]);
    
    // Format data for frontend chart
    const formattedData = result.rows.map(row => ({
      name: row.status.charAt(0).toUpperCase() + row.status.slice(1), // Capitalize status
      value: parseInt(row.count)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching project status data:', error);
    res.status(500).json({ error: 'Failed to fetch project status data' });
  }
});

/**
 * @desc    Get task completion data
 * @route   GET /api/analytics/task-completion
 * @access  Admin
 */
router.get('/task-completion', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const companyId = req.user.companyId;
    
    // Define date range based on timeframe
    let interval, groupBy;
    switch (timeframe) {
      case 'week':
        interval = '7 days';
        groupBy = 'day';
        break;
      case 'month':
        interval = '30 days';
        groupBy = 'day';
        break;
      case 'quarter':
        interval = '90 days';
        groupBy = 'week';
        break;
      case 'year':
        interval = '365 days';
        groupBy = 'month';
        break;
      default:
        interval = '30 days';
        groupBy = 'day';
    }

    let groupByClause;
    if (groupBy === 'day') {
      groupByClause = "DATE_TRUNC('day', completed_at)";
    } else if (groupBy === 'week') {
      groupByClause = "DATE_TRUNC('week', completed_at)";
    } else {
      groupByClause = "DATE_TRUNC('month', completed_at)";
    }    const query = `
      SELECT 
        ${groupByClause} as time_period,
        COUNT(*) as completed_tasks,
        AVG(COALESCE(completion_percentage, 0)) as avg_completion_rate
      FROM 
        tasks
      WHERE 
        company_id = $1
        AND status = 'Completed'
        AND completed_at > NOW() - INTERVAL '${interval}'
        AND completed_at IS NOT NULL
      GROUP BY 
        time_period
      ORDER BY 
        time_period
    `;

    const result = await pool.query(query, [companyId]);
    
    // Format dates and parse numbers
    const formattedData = result.rows.map(row => ({
      date: row.time_period,
      completed: parseInt(row.completed_tasks),
      completion: parseFloat(row.avg_completion_rate || 0).toFixed(2)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching task completion data:', error);
    res.status(500).json({ error: 'Failed to fetch task completion data' });
  }
});

/**
 * @desc    Get resource utilization data
 * @route   GET /api/analytics/resource-utilization
 * @access  Admin
 */
router.get('/resource-utilization', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const companyId = req.user.companyId;
      const query = `
      SELECT 
        u.user_id,
        u.name,
        COUNT(t.task_id) as assigned_tasks,
        COUNT(CASE WHEN t.status = 'Completed' THEN 1 ELSE NULL END) as completed_tasks,
        SUM(COALESCE(t.estimated_hours, 0)) as allocated,
        SUM(COALESCE(t.actual_hours, 0)) as used,
        AVG(COALESCE(t.completion_percentage, 0)) as avg_completion
      FROM 
        users u
      LEFT JOIN 
        tasks t ON u.user_id = t.assigned_to AND t.created_at > NOW() - INTERVAL '30 days'
      WHERE 
        u.company_id = $1
        AND u.status = 'active'
      GROUP BY 
        u.user_id, u.name
      HAVING 
        COUNT(t.task_id) > 0
      ORDER BY 
        assigned_tasks DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [companyId]);
    
    // Format data for frontend chart
    const formattedData = result.rows.map(row => ({
      name: row.name,
      allocated: parseFloat(row.allocated || 0),
      used: parseFloat(row.used || 0),
      assignedTasks: parseInt(row.assigned_tasks),
      completedTasks: parseInt(row.completed_tasks),
      avgCompletion: parseFloat(row.avg_completion || 0)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching resource utilization data:', error);
    res.status(500).json({ error: 'Failed to fetch resource utilization data' });
  }
});

export default router;
