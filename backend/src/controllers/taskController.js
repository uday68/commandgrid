import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';
import { logActivity } from '../middleware/activityLogger.js';

export const assignTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { taskId } = req.params;
    const { assigneeId } = req.body;

    await client.query('BEGIN');

    // Check if task exists
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    // Check if assignee exists
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [assigneeId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Assignee not found', 404);
    }

    // Update task assignee
    const result = await client.query(
      `UPDATE tasks 
       SET assignee_id = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [assigneeId, taskId]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, null, taskId, 'assign_task', {
      taskId,
      assigneeId
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const createTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, description, dueDate, status, priority, projectId } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO tasks (
        title, 
        description, 
        due_date, 
        status, 
        priority, 
        project_id, 
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *`,
      [title, description, dueDate, status, priority, projectId, req.user.id]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, projectId, result.rows[0].id, 'create_task', {
      taskId: result.rows[0].id,
      title
    });

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const updateTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, status, priority } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE tasks 
       SET title = $1,
           description = $2,
           due_date = $3,
           status = $4,
           priority = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, description, dueDate, status, priority, taskId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, result.rows[0].project_id, taskId, 'update_task', {
      taskId,
      title
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const deleteTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { taskId } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [taskId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, result.rows[0].project_id, taskId, 'delete_task', {
      taskId
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `SELECT 
        t.*,
        u.first_name as assignee_first_name,
        u.last_name as assignee_last_name,
        p.name as project_name
       FROM tasks t       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.project_id
       WHERE t.id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const { projectId, status, priority, assigneeId } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (projectId) {
      conditions.push(`project_id = $${paramCount}`);
      values.push(projectId);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (priority) {
      conditions.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (assigneeId) {
      conditions.push(`assignee_id = $${paramCount}`);
      values.push(assigneeId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const result = await pool.query(
      `SELECT 
        t.*,
        u.first_name as assignee_first_name,
        u.last_name as assignee_last_name,
        p.name as project_name       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.project_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      values
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
}; 