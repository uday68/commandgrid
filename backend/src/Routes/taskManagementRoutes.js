import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @desc    Update task completion percentage
 * @route   PATCH /api/tasks/:taskId/completion
 * @access  Private (Project Manager, Task Assignee, or Admin)
 */
router.patch('/:taskId/completion', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completion_percentage } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validate completion percentage
    if (completion_percentage < 0 || completion_percentage > 100) {
      return res.status(400).json({ 
        error: 'Completion percentage must be between 0 and 100' 
      });
    }

    // Check if user has permission to update this task
    const taskQuery = `
      SELECT t.*, p.creator_id as project_creator 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = $1 AND t.company_id = $2
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId, req.user.companyId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    
    // Check permissions: Admin, Project Manager of the project, task assignee, or task creator
    const canUpdate = userRole === 'Admin' || 
                     userRole === 'Project Manager' ||
                     task.assigned_to === userId ||
                     task.creator_id === userId ||
                     task.project_creator === userId;

    if (!canUpdate) {
      return res.status(403).json({ 
        error: 'You do not have permission to update this task' 
      });
    }

    // Update the task completion percentage
    let updateQuery = `
      UPDATE tasks 
      SET completion_percentage = $1, updated_at = NOW()
    `;
    
    let queryParams = [completion_percentage];
    
    // If completion is 100%, also set status to Completed and completed_at
    if (completion_percentage === 100) {
      updateQuery += `, status = 'Completed', completed_at = NOW()`;
    } else if (completion_percentage > 0 && task.status === 'To Do') {
      // If starting work, change status to In Progress
      updateQuery += `, status = 'In Progress'`;
    } else if (completion_percentage === 0 && task.status === 'Completed') {
      // If resetting from completed, clear completed_at
      updateQuery += `, status = 'To Do', completed_at = NULL`;
    }
    
    updateQuery += ` WHERE task_id = $${queryParams.length + 1} AND company_id = $${queryParams.length + 2} RETURNING *`;
    queryParams.push(taskId, req.user.companyId);

    const result = await pool.query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not updated' });
    }

    // Log the activity
    try {
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, project_id, details, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          'task_progress_updated',
          task.project_id,
          JSON.stringify({
            task_id: taskId,
            task_title: task.title,
            old_completion: task.completion_percentage,
            new_completion: completion_percentage
          })
        ]
      );
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      message: 'Task completion percentage updated successfully',
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating task completion:', error);
    res.status(500).json({ error: 'Failed to update task completion percentage' });
  }
});

/**
 * @desc    Automatically estimate completion percentage based on task criteria
 * @route   POST /api/tasks/:taskId/estimate-completion
 * @access  Private (Project Manager, Task Assignee, or Admin)
 */
router.post('/:taskId/estimate-completion', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get task details
    const taskQuery = `
      SELECT t.*, p.creator_id as project_creator,
             (SELECT COUNT(*) FROM task_comments WHERE task_id = t.task_id) as comment_count,
             (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.task_id) as attachment_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = $1 AND t.company_id = $2
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId, req.user.companyId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    
    // Check permissions
    const canUpdate = userRole === 'Admin' || 
                     userRole === 'Project Manager' ||
                     task.assigned_to === userId ||
                     task.creator_id === userId ||
                     task.project_creator === userId;

    if (!canUpdate) {
      return res.status(403).json({ 
        error: 'You do not have permission to estimate this task completion' 
      });
    }

    // Calculate estimated completion based on various factors
    let estimatedCompletion = 0;
    const factors = [];

    // Factor 1: Task status
    switch (task.status) {
      case 'To Do':
        estimatedCompletion += 0;
        factors.push('Status: To Do (0%)');
        break;
      case 'In Progress':
        estimatedCompletion += 30;
        factors.push('Status: In Progress (30%)');
        break;
      case 'Review':
        estimatedCompletion += 80;
        factors.push('Status: Review (80%)');
        break;
      case 'Completed':
        estimatedCompletion = 100;
        factors.push('Status: Completed (100%)');
        break;
      default:
        estimatedCompletion += 10;
        factors.push(`Status: ${task.status} (10%)`);
    }

    // Factor 2: Comments activity (max 20%)
    if (task.comment_count > 0) {
      const commentBonus = Math.min(20, task.comment_count * 5);
      estimatedCompletion += commentBonus;
      factors.push(`Comments activity: ${task.comment_count} comments (+${commentBonus}%)`);
    }

    // Factor 3: Attachments (max 15%)
    if (task.attachment_count > 0) {
      const attachmentBonus = Math.min(15, task.attachment_count * 8);
      estimatedCompletion += attachmentBonus;
      factors.push(`Attachments: ${task.attachment_count} files (+${attachmentBonus}%)`);
    }

    // Factor 4: Time spent vs estimated (max 30%)
    if (task.estimated_hours > 0 && task.actual_hours > 0) {
      const timeRatio = task.actual_hours / task.estimated_hours;
      let timeBonus = 0;
      if (timeRatio >= 0.8) {
        timeBonus = 30; // 80%+ of estimated time spent
      } else if (timeRatio >= 0.5) {
        timeBonus = 20; // 50-80% of estimated time spent
      } else if (timeRatio >= 0.25) {
        timeBonus = 10; // 25-50% of estimated time spent
      }
      estimatedCompletion += timeBonus;
      factors.push(`Time progress: ${task.actual_hours}h/${task.estimated_hours}h (+${timeBonus}%)`);
    }

    // Factor 5: Due date pressure (can reduce completion if overdue)
    if (task.due_date) {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        // Overdue - might not be actually complete even if it looks like it
        estimatedCompletion = Math.max(0, estimatedCompletion - 10);
        factors.push(`Overdue by ${Math.abs(daysUntilDue)} days (-10%)`);
      }
    }

    // Ensure completion is between 0 and 100
    estimatedCompletion = Math.max(0, Math.min(100, Math.round(estimatedCompletion)));

    res.json({
      success: true,
      estimated_completion: estimatedCompletion,
      calculation_factors: factors,
      current_completion: task.completion_percentage || 0,
      recommendation: estimatedCompletion !== (task.completion_percentage || 0) 
        ? `Consider updating completion from ${task.completion_percentage || 0}% to ${estimatedCompletion}%`
        : 'Current completion percentage appears accurate'
    });

  } catch (error) {
    console.error('Error estimating task completion:', error);
    res.status(500).json({ error: 'Failed to estimate task completion' });
  }
});

/**
 * @desc    Bulk update completion percentages for multiple tasks
 * @route   PATCH /api/tasks/bulk-completion
 * @access  Private (Project Manager or Admin)
 */
router.patch('/bulk-completion', authenticateToken, async (req, res) => {
  try {
    const { tasks } = req.body; // Array of {task_id, completion_percentage}
    const userId = req.user.userId;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    // Only Project Managers and Admins can bulk update
    if (!['Admin', 'Project Manager'].includes(userRole)) {
      return res.status(403).json({ 
        error: 'Only Project Managers and Admins can bulk update task completion' 
      });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array is required' });
    }

    // Validate all completion percentages
    for (const task of tasks) {
      if (!task.task_id || task.completion_percentage < 0 || task.completion_percentage > 100) {
        return res.status(400).json({ 
          error: 'All tasks must have valid task_id and completion_percentage (0-100)' 
        });
      }
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updatedTasks = [];
      
      for (const taskUpdate of tasks) {
        const { task_id, completion_percentage } = taskUpdate;
        
        // Build update query based on completion percentage
        let updateQuery = `
          UPDATE tasks 
          SET completion_percentage = $1, updated_at = NOW()
        `;
        
        let queryParams = [completion_percentage];
        
        // Auto-update status based on completion
        if (completion_percentage === 100) {
          updateQuery += `, status = 'Completed', completed_at = NOW()`;
        } else if (completion_percentage > 0) {
          updateQuery += `, status = CASE 
                            WHEN status = 'To Do' THEN 'In Progress'
                            WHEN status = 'Completed' THEN 'In Progress'
                            ELSE status
                          END`;
          updateQuery += `, completed_at = CASE 
                            WHEN status = 'Completed' THEN NULL
                            ELSE completed_at
                          END`;
        }
        
        updateQuery += ` WHERE task_id = $${queryParams.length + 1} AND company_id = $${queryParams.length + 2} RETURNING *`;
        queryParams.push(task_id, companyId);

        const result = await client.query(updateQuery, queryParams);
        
        if (result.rows.length > 0) {
          updatedTasks.push(result.rows[0]);
          
          // Log activity
          try {
            await client.query(
              `INSERT INTO activity_logs (user_id, action, project_id, details, timestamp)
               VALUES ($1, $2, $3, $4, NOW())`,
              [
                userId,
                'bulk_task_progress_updated',
                result.rows[0].project_id,
                JSON.stringify({
                  task_id: task_id,
                  task_title: result.rows[0].title,
                  new_completion: completion_percentage
                })
              ]
            );
          } catch (logError) {
            console.error('Failed to log bulk update activity:', logError);
          }
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `Successfully updated ${updatedTasks.length} tasks`,
        updated_tasks: updatedTasks
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error bulk updating task completion:', error);
    res.status(500).json({ error: 'Failed to bulk update task completion' });
  }
});

export default router;
