import { pool } from '../Config/database.js';
import { logger } from './logger.js';
import { redisClient } from '../Config/redis.js';

/**
 * Record a metric
 * @param {Object} params
 * @param {string} params.name - Metric name
 * @param {number} params.value - Metric value
 * @param {Object} [params.tags] - Metric tags
 * @param {string} [params.userId] - User ID (optional)
 * @param {string} [params.projectId] - Project ID (optional)
 */
export const recordMetric = async ({ name, value, tags = {}, userId = null, projectId = null }) => {
  try {
    // Store in Redis for real-time metrics
    const metricKey = `metric:${name}:${Date.now()}`;
    await redisClient.hSet(metricKey, {
      value: value.toString(),
      tags: JSON.stringify(tags),
      userId: userId || '',
      projectId: projectId || '',
      timestamp: Date.now().toString()
    });

    // Set expiration for Redis key (24 hours)
    await redisClient.expire(metricKey, 86400);

    // Store in PostgreSQL for historical data
    await pool.query(
      `INSERT INTO metrics (name, value, tags, user_id, project_id, recorded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [name, value, JSON.stringify(tags), userId, projectId]
    );
  } catch (error) {
    logger.error('Failed to record metric:', error);
  }
};

/**
 * Get metrics for a specific time range
 * @param {Object} params
 * @param {string} params.name - Metric name
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {Object} [params.filters] - Additional filters
 * @returns {Promise<Array>} Metrics data
 */
export const getMetrics = async ({ name, startDate, endDate, filters = {} }) => {
  try {
    let query = `
      SELECT * FROM metrics 
      WHERE name = $1 
      AND recorded_at BETWEEN $2 AND $3
    `;
    const values = [name, startDate, endDate];
    let valueIndex = 4;

    if (filters.userId) {
      query += ` AND user_id = $${valueIndex}`;
      values.push(filters.userId);
      valueIndex++;
    }

    if (filters.projectId) {
      query += ` AND project_id = $${valueIndex}`;
      values.push(filters.projectId);
      valueIndex++;
    }

    query += ' ORDER BY recorded_at ASC';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    throw error;
  }
};

/**
 * Generate a report
 * @param {Object} params
 * @param {string} params.type - Report type
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {Object} [params.filters] - Additional filters
 * @returns {Promise<Object>} Report data
 */
export const generateReport = async ({ type, startDate, endDate, filters = {} }) => {
  try {
    let reportData = {};

    switch (type) {
      case 'user_activity':
        reportData = await generateUserActivityReport(startDate, endDate, filters);
        break;
      case 'project_metrics':
        reportData = await generateProjectMetricsReport(startDate, endDate, filters);
        break;
      case 'system_health':
        reportData = await generateSystemHealthReport(startDate, endDate);
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Store report in database
    await pool.query(
      `INSERT INTO reports (type, data, generated_at, filters)
       VALUES ($1, $2, NOW(), $3)`,
      [type, JSON.stringify(reportData), JSON.stringify(filters)]
    );

    return reportData;
  } catch (error) {
    logger.error('Failed to generate report:', error);
    throw error;
  }
};

/**
 * Generate user activity report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} User activity report
 */
async function generateUserActivityReport(startDate, endDate, filters) {
  const result = await pool.query(
    `SELECT 
      u.id as user_id,
      u.username,
      COUNT(DISTINCT al.id) as total_activities,
      COUNT(DISTINCT CASE WHEN al.action = 'login' THEN al.id END) as login_count,
      COUNT(DISTINCT CASE WHEN al.action = 'file_upload' THEN al.id END) as file_uploads,
      MAX(al.timestamp) as last_activity
     FROM users u
     LEFT JOIN activity_logs al ON u.id = al.user_id
     WHERE al.timestamp BETWEEN $1 AND $2
     GROUP BY u.id, u.username
     ORDER BY total_activities DESC`,
    [startDate, endDate]
  );

  return {
    type: 'user_activity',
    period: { startDate, endDate },
    data: result.rows
  };
}

/**
 * Generate project metrics report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Project metrics report
 */
async function generateProjectMetricsReport(startDate, endDate, filters) {
  const result = await pool.query(    `SELECT 
      p.project_id,
      p.name as project_name,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
      COUNT(DISTINCT f.id) as total_files,
      COUNT(DISTINCT u.id) as active_users
     FROM projects p
     LEFT JOIN tasks t ON p.project_id = t.project_id
     LEFT JOIN file_uploads f ON p.project_id = f.project_id
     LEFT JOIN activity_logs al ON p.project_id = al.project_id
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.timestamp BETWEEN $1 AND $2
     GROUP BY p.project_id, p.name
     ORDER BY total_tasks DESC`,
    [startDate, endDate]
  );

  return {
    type: 'project_metrics',
    period: { startDate, endDate },
    data: result.rows
  };
}

/**
 * Generate system health report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} System health report
 */
async function generateSystemHealthReport(startDate, endDate) {
  const result = await pool.query(
    `SELECT 
      name,
      AVG(value) as average_value,
      MIN(value) as min_value,
      MAX(value) as max_value,
      COUNT(*) as sample_count
     FROM metrics
     WHERE recorded_at BETWEEN $1 AND $2
     GROUP BY name
     ORDER BY name`,
    [startDate, endDate]
  );

  return {
    type: 'system_health',
    period: { startDate, endDate },
    data: result.rows
  };
} 