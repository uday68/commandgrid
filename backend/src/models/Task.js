import { pool } from '../Config/database.js';
import { ValidationError } from '../utils/errors.js';

class Task {
  static async create({
    title,
    description,
    projectId,
    assignedTo,
    assignedBy,
    dueDate,
    priority,
    status = 'pending',
    tags = [],
    attachments = [],
    estimatedHours,
    actualHours = 0,
    dependencies = [],
    checklist = []
  }) {
    // Validate required fields
    if (!title || !projectId || !assignedBy) {
      throw new ValidationError('Title, project ID, and assigner are required');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      throw new ValidationError('Invalid priority level');
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'review', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert task
      const taskResult = await client.query(
        `INSERT INTO tasks (
          title, description, project_id, assigned_to, assigned_by,
          due_date, priority, status, tags, attachments,
          estimated_hours, actual_hours, dependencies, checklist,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          title,
          description,
          projectId,
          assignedTo,
          assignedBy,
          dueDate,
          priority,
          status,
          tags,
          attachments,
          estimatedHours,
          actualHours,
          dependencies,
          checklist
        ]
      );

      // Create task activity log
      await client.query(
        `INSERT INTO task_activities (
          task_id, user_id, action, details, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          taskResult.rows[0].task_id,
          assignedBy,
          'created',
          { title, status, priority }
        ]
      );

      await client.query('COMMIT');
      return taskResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(taskId, userId) {
    const result = await pool.query(
      `SELECT 
        t.*,
        p.name as project_name,
        a.name as assigned_to_name,
        b.name as assigned_by_name,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'user_id', c.user_id,
              'name', u.name,
              'action', c.action,
              'details', c.details,
              'created_at', c.created_at
            )
          )
          FROM task_activities c
          JOIN users u ON c.user_id = u.user_id
          WHERE c.task_id = t.task_id
          ORDER BY c.created_at DESC
          LIMIT 10), '[]'
        ) as recent_activities
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users a ON t.assigned_to = a.user_id
      LEFT JOIN users b ON t.assigned_by = b.user_id
      WHERE t.task_id = $1
      AND (
        t.assigned_to = $2
        OR t.assigned_by = $2
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = t.project_id
          AND pm.user_id = $2
        )
      )`,
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Task not found or access denied');
    }

    return result.rows[0];
  }

  static async update(taskId, userId, updates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current task state
      const currentTask = await this.findById(taskId, userId);
      if (!currentTask) {
        throw new ValidationError('Task not found or access denied');
      }

      // Validate updates
      if (updates.priority && !['low', 'medium', 'high', 'urgent'].includes(updates.priority)) {
        throw new ValidationError('Invalid priority level');
      }

      if (updates.status && !['pending', 'in_progress', 'review', 'completed', 'blocked'].includes(updates.status)) {
        throw new ValidationError('Invalid status');
      }

      // Update task
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'task_id' && key !== 'created_at') {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
        }
      });

      updateFields.push('updated_at = NOW()');
      updateValues.push(taskId);

      const result = await client.query(
        `UPDATE tasks 
         SET ${updateFields.join(', ')}
         WHERE task_id = $${paramCount}
         RETURNING *`,
        updateValues
      );

      // Log activity
      const changes = Object.entries(updates)
        .filter(([key]) => currentTask[key] !== updates[key])
        .map(([key, value]) => ({ field: key, old: currentTask[key], new: value }));

      if (changes.length > 0) {
        await client.query(
          `INSERT INTO task_activities (
            task_id, user_id, action, details, created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            taskId,
            userId,
            'updated',
            { changes }
          ]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(taskId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user has permission to delete
      const task = await this.findById(taskId, userId);
      if (!task) {
        throw new ValidationError('Task not found or access denied');
      }

      // Check if user is project admin or task creator
      const isAdmin = await client.query(
        `SELECT 1 FROM project_members 
         WHERE project_id = $1 
         AND user_id = $2 
         AND role = 'admin'`,
        [task.project_id, userId]
      );

      if (isAdmin.rows.length === 0 && task.assigned_by !== userId) {
        throw new ValidationError('Insufficient permissions to delete task');
      }

      // Archive task instead of deleting
      await client.query(
        `UPDATE tasks 
         SET status = 'archived', 
             updated_at = NOW()
         WHERE task_id = $1`,
        [taskId]
      );

      // Log deletion
      await client.query(
        `INSERT INTO task_activities (
          task_id, user_id, action, details, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          taskId,
          userId,
          'archived',
          { reason: 'Task deleted by user' }
        ]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Task archived successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async list({
    userId,
    projectId = null,
    status = null,
    priority = null,
    assignedTo = null,
    search = null,
    page = 1,
    limit = 20,
    sortBy = 'due_date',
    sortOrder = 'asc'
  }) {
    const offset = (page - 1) * limit;
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    // Add user access condition
    conditions.push(`(
      t.assigned_to = $${paramCount}
      OR t.assigned_by = $${paramCount}
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = t.project_id
        AND pm.user_id = $${paramCount}
      )
    )`);
    params.push(userId);
    paramCount++;

    if (projectId) {
      conditions.push(`t.project_id = $${paramCount}`);
      params.push(projectId);
      paramCount++;
    }

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount}`);
      params.push(priority);
      paramCount++;
    }

    if (assignedTo) {
      conditions.push(`t.assigned_to = $${paramCount}`);
      params.push(assignedTo);
      paramCount++;
    }

    if (search) {
      conditions.push(`(
        t.title ILIKE $${paramCount}
        OR t.description ILIKE $${paramCount}
        OR EXISTS (
          SELECT 1 FROM unnest(t.tags) tag
          WHERE tag ILIKE $${paramCount}
        )
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Validate sort parameters
    const validSortFields = ['due_date', 'created_at', 'priority', 'status', 'title'];
    const validSortOrders = ['asc', 'desc'];

    if (!validSortFields.includes(sortBy)) {
      sortBy = 'due_date';
    }
    if (!validSortOrders.includes(sortOrder.toLowerCase())) {
      sortOrder = 'asc';
    }

    const result = await pool.query(
      `SELECT 
        t.*,
        p.name as project_name,
        a.name as assigned_to_name,
        b.name as assigned_by_name,
        COUNT(*) OVER() as total_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users a ON t.assigned_to = a.user_id
      LEFT JOIN users b ON t.assigned_by = b.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      tasks: result.rows,
      total: result.rows[0]?.total_count || 0,
      page,
      limit,
      totalPages: Math.ceil((result.rows[0]?.total_count || 0) / limit)
    };
  }
}

export default Task; 