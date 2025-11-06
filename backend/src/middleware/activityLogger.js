import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

export const logActivity = async (userId, projectId, taskId, action, metadata = {}) => {
  try {
    const query = `
      INSERT INTO activity_logs (
        user_id,
        project_id,
        task_id,
        action,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const values = [
      userId,
      projectId,
      taskId,
      action,
      JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    logger.info('Activity logged successfully', {
      userId,
      projectId,
      taskId,
      action,
      metadata
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error logging activity:', error);
    // Don't throw the error to prevent disrupting the main flow
    return null;
  }
};

export const getActivityLogs = async (filters = {}, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        al.*,
        u.first_name,
        u.last_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.userId) {
      query += ` AND al.user_id = $${paramCount}`;
      values.push(filters.userId);
      paramCount++;
    }

    if (filters.projectId) {
      query += ` AND al.project_id = $${paramCount}`;
      values.push(filters.projectId);
      paramCount++;
    }

    if (filters.taskId) {
      query += ` AND al.task_id = $${paramCount}`;
      values.push(filters.taskId);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND al.action = $${paramCount}`;
      values.push(filters.action);
      paramCount++;
    }

    query += `
      ORDER BY al.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    throw error;
  }
}; 