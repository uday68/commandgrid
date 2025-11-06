import { pool } from '../Config/database.js';
import { logger } from './logger.js';

/**
 * Log user activity
 * @param {Object} params
 * @param {string} params.userId - User ID or Admin ID
 * @param {string} [params.projectId] - Project ID (optional)
 * @param {string} params.action - Action performed
 * @param {Object} [params.details] - Additional details (optional)
 */
export const logActivity = async ({ userId, projectId = null, action, details = null }) => {
  try {
    // Skip activity logging if no userId is provided
    if (!userId) {
      logger.warn('Activity logging skipped: No userId provided');
      return;
    }
    
    // Check if we're running in a browser environment with localStorage (if so, this is likely a client-side call)
    let userType = 'user';
    let actualUserId = userId;
    
    // First check if the activity_logs table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);
    
    // If activity_logs table doesn't exist, try to use audit_logs instead
    if (!tableExists.rows[0].exists) {
      logger.warn('activity_logs table does not exist, attempting to use audit_logs instead');
      try {
        await logAudit({ 
          userId, 
          actionType: action, 
          actionDetails: { projectId, details },
          ip: 'local'
        });
      } catch (auditError) {
        logger.warn(`Could not log to audit_logs: ${auditError.message}`);
      }
      return;
    }

    // Check if the userId exists in users table
    const userExists = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1',
      [userId]
    );
    
    // If user doesn't exist in users table, check if it's an admin
    if (userExists.rows.length === 0) {
      const adminExists = await pool.query(
        'SELECT 1 FROM admins WHERE admin_id = $1',
        [userId]
      );
      
      // If it's an admin, log to audit_logs instead
      if (adminExists.rows.length > 0) {
        userType = 'admin';
        // Use audit_logs which supports both user_id and admin_id
        await pool.query(
          `INSERT INTO audit_logs (admin_id, action_type, action_details, timestamp)
           VALUES ($1, $2, $3, NOW())`,
          [userId, action, JSON.stringify({ projectId, details })]
        );
        return; // Exit after logging to audit_logs
      }
      
      // If not found in either table, log warning and return
      logger.warn(`Could not log activity: User/Admin ID ${userId} not found in users or admins table`);
      return;
    }
      // Get all column names in activity_logs table
    const columnInfo = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columnInfo.rows.map(row => row.column_name.toLowerCase());
    const hasDetailsColumn = columnNames.includes('details');
    
    // Check if the table has user_id but doesn't have a details column
    if (!hasDetailsColumn && details) {
      // If no details column but we have details to log, try to use audit_logs instead
      // This avoids SQL errors from missing columns
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action_type, action_details, timestamp)
           VALUES ($1, $2, $3, NOW())`,
          [userId, action, JSON.stringify({ projectId, details })]
        );
        return; // Exit after logging to audit_logs
      } catch (auditError) {
        logger.warn(`Could not log to audit_logs either: ${auditError.message}`);
        // Fall back to using activity_logs without the details column
      }
    }
    
    // Construct dynamic SQL based on available columns
    let query = `INSERT INTO activity_logs (`;
    let values = [];
    let placeholders = [];
    let paramIndex = 1;
    
    // Always include user_id
    query += `user_id`;
    values.push(userId);
    placeholders.push(`$${paramIndex++}`);
    
    // Include project_id if provided
    if (projectId && columnNames.includes('project_id')) {
      query += `, project_id`;
      values.push(projectId);
      placeholders.push(`$${paramIndex++}`);
    }
    
    // Include action if column exists
    if (columnNames.includes('action')) {
      query += `, action`;
      values.push(action);
      placeholders.push(`$${paramIndex++}`);
    }
      // Include details if column exists and details provided
    if (hasDetailsColumn && details) {
      query += `, details`;
      values.push(JSON.stringify(details));
      placeholders.push(`$${paramIndex++}`);
    } else if (details && columnNames.includes('metadata')) {
      // Use metadata column as fallback if it exists
      query += `, metadata`;
      values.push(JSON.stringify(details));
      placeholders.push(`$${paramIndex++}`);
    } else if (details && columnNames.includes('action_details')) {
      // Use action_details column as another fallback
      query += `, action_details`;
      values.push(JSON.stringify(details));
      placeholders.push(`$${paramIndex++}`);
    }
    
    // Include timestamp if column exists
    if (columnNames.includes('timestamp')) {
      query += `, timestamp`;
      placeholders.push(`NOW()`);
    } else if (columnNames.includes('created_at')) {
      query += `, created_at`;
      placeholders.push(`NOW()`);
    }
    
    // Complete the query
    query += `) VALUES (${placeholders.join(', ')})`;
    
    // Execute the dynamic query    await pool.query(query, values);
    logger.info('Activity logged successfully', { userId, action });
    return true;
  } catch (error) {
    logger.error('Failed to log activity:', error);
    // Return false but don't throw the error to prevent disrupting the main flow
    return false;
  }
};

/**
 * Log audit events
 * @param {Object} params
 * @param {string} [params.userId] - User ID (optional)
 * @param {string} [params.adminId] - Admin ID (optional)
 * @param {string} params.ip - IP address
 * @param {string} params.actionType - Type of action
 * @param {Object} params.actionDetails - Details of the action
 */
export const logAudit = async ({ userId = null, adminId = null, ip, actionType, actionDetails }) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, admin_id, ip_address, action_type, action_details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, adminId, ip, actionType, JSON.stringify(actionDetails)]
    );
  } catch (error) {
    logger.error('Failed to log audit:', error);
  }
};

/**
 * Log security threats
 * @param {Object} params
 * @param {string} params.type - Type of threat
 * @param {string} params.description - Description of the threat
 * @param {string} [params.severity='medium'] - Severity level
 * @param {string} [params.ip] - IP address
 */
export const logSecurityThreat = async ({ type, description, severity = 'medium', ip }) => {
  try {
    await pool.query(
      `INSERT INTO security_threats (threat_name, description, severity, ip_address, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [type, description, severity, ip]
    );
  } catch (error) {
    logger.error('Failed to log security threat:', error);
  }
};

/**
 * Get activity logs for a user
 * @param {string} userId - User ID
 * @param {number} [limit=50] - Number of logs to return
 * @returns {Promise<Array>} Activity logs
 */
export const getUserActivityLogs = async (userId, limit = 50) => {
  try {
    const result = await pool.query(
      `SELECT * FROM activity_logs 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to get user activity logs:', error);
    return [];
  }
};

/**
 * Get audit logs with optional filters
 * @param {Object} [filters] - Filter criteria
 * @param {string} [filters.userId] - User ID
 * @param {string} [filters.adminId] - Admin ID
 * @param {string} [filters.actionType] - Action type
 * @param {Date} [filters.startDate] - Start date
 * @param {Date} [filters.endDate] - End date
 * @param {number} [limit=50] - Number of logs to return
 * @returns {Promise<Array>} Audit logs
 */
export const getAuditLogs = async (filters = {}, limit = 50) => {
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let valueIndex = 1;

    if (filters.userId) {
      query += ` AND user_id = $${valueIndex}`;
      values.push(filters.userId);
      valueIndex++;
    }

    if (filters.adminId) {
      query += ` AND admin_id = $${valueIndex}`;
      values.push(filters.adminId);
      valueIndex++;
    }

    if (filters.actionType) {
      query += ` AND action_type = $${valueIndex}`;
      values.push(filters.actionType);
      valueIndex++;
    }

    if (filters.startDate) {
      query += ` AND timestamp >= $${valueIndex}`;
      values.push(filters.startDate);
      valueIndex++;
    }

    if (filters.endDate) {
      query += ` AND timestamp <= $${valueIndex}`;
      values.push(filters.endDate);
      valueIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${valueIndex}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    return [];
  }
};