import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @desc    Update task completion percentage
 * @route   PATCH /api/tasks/:taskId/completion
 * @access  Private (Project Manager or Task Assignee)
 */
router.patch('/:taskId/completion', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completion_percentage, actual_hours, estimated_hours, notes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validate completion percentage
    if (completion_percentage !== undefined) {
      if (completion_percentage < 0 || completion_percentage > 100) {
        return res.status(400).json({ 
          error: 'Completion percentage must be between 0 and 100' 
        });
      }
    }

    // Check if user has permission to update this task
    const taskQuery = `
      SELECT 
        t.*,
        p.owner_id as project_owner,
        pm.user_id as project_member
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
      WHERE t.task_id = $1
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId, userId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    
    // Check permissions: task assignee, project owner, project manager role, or project member
    const canUpdate = (
      task.assigned_to === userId || // Task assignee
      task.project_owner === userId || // Project owner
      userRole === 'Project Manager' || // Project Manager role
      userRole === 'Admin' || // Admin
      task.project_member === userId // Project member
    );

    if (!canUpdate) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to update this task' 
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (completion_percentage !== undefined) {
      updateFields.push(`completion_percentage = $${paramCount++}`);
      updateValues.push(completion_percentage);
      
      // If completion is 100%, automatically set status to Completed and completed_at
      if (completion_percentage === 100 && task.status !== 'Completed') {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push('Completed');
        updateFields.push(`completed_at = $${paramCount++}`);
        updateValues.push(new Date());
      }
      // If completion is less than 100% and was previously completed, reset
      else if (completion_percentage < 100 && task.status === 'Completed') {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push('In Progress');
        updateFields.push(`completed_at = $${paramCount++}`);
        updateValues.push(null);
      }
    }

    if (actual_hours !== undefined) {
      updateFields.push(`actual_hours = $${paramCount++}`);
      updateValues.push(actual_hours);
    }

    if (estimated_hours !== undefined) {
      updateFields.push(`estimated_hours = $${paramCount++}`);
      updateValues.push(estimated_hours);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    updateValues.push(new Date());

    updateValues.push(taskId);
    const taskIdParam = `$${paramCount}`;

    const updateQuery = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE task_id = ${taskIdParam}
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, updateValues);
    
    // Log the update for activity tracking
    if (notes) {
      await pool.query(
        `INSERT INTO task_comments (task_id, user_id, comment_text) 
         VALUES ($1, $2, $3)`,
        [taskId, userId, `Completion updated: ${notes}`]
      );
    }

    res.json({
      success: true,
      message: 'Task completion updated successfully',
      task: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating task completion:', error);
    res.status(500).json({ error: 'Failed to update task completion' });
  }
});

/**
 * @desc    Get task completion history/analytics
 * @route   GET /api/tasks/:taskId/completion-history
 * @access  Private
 */
router.get('/:taskId/completion-history', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Check if user has access to this task
    const accessQuery = `
      SELECT 1 FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
      WHERE t.task_id = $1 
      AND (
        t.assigned_to = $2 OR 
        p.owner_id = $2 OR 
        pm.user_id = $2
      )
    `;
    
    const accessResult = await pool.query(accessQuery, [taskId, userId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get task details with completion history from comments
    const historyQuery = `
      SELECT 
        t.completion_percentage,
        t.estimated_hours,
        t.actual_hours,
        t.status,
        t.completed_at,
        t.updated_at,
        json_agg(
          json_build_object(
            'comment_id', tc.comment_id,
            'comment_text', tc.comment_text,
            'created_at', tc.created_at,
            'user_name', u.name
          ) ORDER BY tc.created_at DESC
        ) FILTER (WHERE tc.comment_id IS NOT NULL) as comments
      FROM tasks t
      LEFT JOIN task_comments tc ON t.task_id = tc.task_id
      LEFT JOIN users u ON tc.user_id = u.user_id
      WHERE t.task_id = $1
      GROUP BY t.task_id, t.completion_percentage, t.estimated_hours, 
               t.actual_hours, t.status, t.completed_at, t.updated_at
    `;
    
    const historyResult = await pool.query(historyQuery, [taskId]);
    
    res.json({
      success: true,
      data: historyResult.rows[0] || {}
    });

  } catch (error) {
    console.error('Error fetching task completion history:', error);
    res.status(500).json({ error: 'Failed to fetch task completion history' });
  }
});

/**
 * @desc    Auto-calculate completion percentage based on subtasks or criteria
 * @route   POST /api/tasks/:taskId/auto-calculate-completion
 * @access  Private (Project Manager or Task Assignee)
 */
router.post('/:taskId/auto-calculate-completion', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { method = 'time_based' } = req.body; // time_based, milestone_based, or manual
    const userId = req.user.userId;

    // Check permissions (same logic as update)
    const taskQuery = `
      SELECT 
        t.*,
        p.owner_id as project_owner,
        pm.user_id as project_member
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
      WHERE t.task_id = $1
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId, userId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const userRole = req.user.role;
    
    const canUpdate = (
      task.assigned_to === userId ||
      task.project_owner === userId ||
      userRole === 'Project Manager' ||
      userRole === 'Admin' ||
      task.project_member === userId
    );

    if (!canUpdate) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to update this task' 
      });
    }

    let calculatedPercentage = 0;

    switch (method) {
      case 'time_based':
        // Calculate based on actual_hours vs estimated_hours
        if (task.estimated_hours > 0) {
          calculatedPercentage = Math.min(
            Math.round((task.actual_hours / task.estimated_hours) * 100), 
            100
          );
        }
        break;
        
      case 'milestone_based':
        // This could be extended to check subtasks or milestones
        // For now, use a simple algorithm based on task status
        switch (task.status) {
          case 'Pending':
            calculatedPercentage = 0;
            break;
          case 'In Progress':
            calculatedPercentage = 25;
            break;
          case 'Review':
            calculatedPercentage = 75;
            break;
          case 'Completed':
            calculatedPercentage = 100;
            break;
          default:
            calculatedPercentage = task.completion_percentage || 0;
        }
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid calculation method. Use time_based or milestone_based.' 
        });
    }

    // Update the task with calculated percentage
    const updateQuery = `
      UPDATE tasks 
      SET completion_percentage = $1, updated_at = NOW()
      WHERE task_id = $2
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, [calculatedPercentage, taskId]);
    
    // Log the auto-calculation
    await pool.query(
      `INSERT INTO task_comments (task_id, user_id, comment_text) 
       VALUES ($1, $2, $3)`,
      [
        taskId, 
        userId, 
        `Auto-calculated completion: ${calculatedPercentage}% using ${method} method`
      ]
    );

    res.json({
      success: true,
      message: 'Task completion auto-calculated successfully',
      task: updateResult.rows[0],
      method,
      calculatedPercentage
    });

  } catch (error) {
    console.error('Error auto-calculating task completion:', error);
    res.status(500).json({ error: 'Failed to auto-calculate task completion' });
  }
});

export default router;
