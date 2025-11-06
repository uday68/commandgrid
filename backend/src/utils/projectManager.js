import { logger } from './logger.js';
import { logActivity } from './activityLogger.js';
import { pool } from '../Config/database.js';

/**
 * Create a new project
 * @param {Object} params
 * @param {string} params.name - Project name
 * @param {string} params.creatorId - Creator's user ID 
 * @param {string} [params.description] - Project description
 * @param {string} [params.teamId] - Team ID (optional) - Note: This parameter is currently not used as the column doesn't exist in the schema
 * @returns {Promise<Object>} Created project
 */
export const createProject = async ({ name, creatorId, description = null, teamId = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, check if the company_id is required in the projects table
    const projectTableInfo = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND table_schema = 'public'
    `);
    
    const hasCompanyIdColumn = projectTableInfo.rows.some(row => 
      row.column_name.toLowerCase() === 'company_id'
    );
    
    // Create project with the appropriate columns
    let projectResult;
    if (hasCompanyIdColumn) {
      // Try to find the company_id for the user first
      const userQuery = await client.query(
        `SELECT company_id FROM users WHERE user_id = $1`,
        [creatorId]
      );
      
      let companyId = null;
      
      // If no company_id found in users table, check the admins table
      if (userQuery.rows.length === 0 || !userQuery.rows[0]?.company_id) {
        const adminQuery = await client.query(
          `SELECT company_id FROM admins WHERE admin_id = $1`,
          [creatorId]
        );
        
        companyId = adminQuery.rows[0]?.company_id;
      } else {
        companyId = userQuery.rows[0].company_id;
      }
      
      // If still no company_id found, proceed without it (it might not be required)
      if (companyId) {
        projectResult = await client.query(
          `INSERT INTO projects (name, description, owner_id, created_at, company_id)
           VALUES ($1, $2, $3, NOW(), $4)
           RETURNING *`,
          [name, description, creatorId, companyId]
        );
      } else {
        logger.warn(`No company_id found for user/admin ${creatorId}. Creating project without company_id.`);
        projectResult = await client.query(
          `INSERT INTO projects (name, description, owner_id, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING *`,
          [name, description, creatorId]
        );
      }
    } else {
      projectResult = await client.query(
        `INSERT INTO projects (name, description, owner_id, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [name, description, creatorId]
      );
    };
      const project = projectResult.rows[0];
    
    // Get the project ID field, which could be named project_id or id depending on the schema
    const projectIdField = project.project_id ? 'project_id' : 'id';
    const projectId = project[projectIdField];
    
    // Ensure we have a valid project ID before proceeding
    if (!project || !projectId) {
      throw new Error('Failed to create project: Invalid project ID');
    }
    
    logger.info(`Created project with ID: ${projectId}`);
      // Check if project_members table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_members'
      );
    `);
    
    // Add creator as project admin if the members table exists
    if (tableExists.rows[0].exists) {
      try {
        // Get the field names from the table
        const fieldInfo = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'project_members' 
          AND table_schema = 'public'
        `);
        
        // Get valid roles from check constraint
        const roleConstraintQuery = await client.query(`
          SELECT pg_get_constraintdef(oid) as constraint_def
          FROM pg_constraint
          WHERE conname = 'check_role'
        `);
        
        let validRoles = ['Admin', 'Member', 'Contributor', 'Viewer', 'Project Manager'];
        if (roleConstraintQuery.rows.length > 0) {
          const constraintDef = roleConstraintQuery.rows[0].constraint_def;
          // Extract roles from constraint like CHECK ((role = ANY (ARRAY['Admin'::text, 'Member'::text])))
          const rolesMatch = constraintDef.match(/ARRAY\[(.*?)\]/);
          if (rolesMatch && rolesMatch[1]) {
            validRoles = rolesMatch[1].split(',')
              .map(role => role.trim().replace(/'(.+?)'::.+/, '$1'));
          }
        }
        
        const fieldNames = fieldInfo.rows.map(row => row.column_name.toLowerCase());
        const hasProjectIdField = fieldNames.includes('project_id');        const hasUserIdField = fieldNames.includes('user_id');
        
        // Verify creatorId is not null before inserting
        if (hasProjectIdField && hasUserIdField && creatorId) {
          // Find a valid role that matches the constraint - first check for Admin, then suitable alternatives
          let roleToUse = validRoles.find(role => role === 'Admin') || 
                         validRoles.find(role => role === 'admin') || 
                         validRoles.find(role => role === 'Project Manager') || 
                         validRoles.find(role => role === 'project_manager') || 
                         validRoles[0];
          
          await client.query(
            `INSERT INTO project_members (project_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [projectId, creatorId, roleToUse]
          );
          logger.info(`Added creator ${creatorId} as ${roleToUse} to project ${projectId}`);
        } else {
          logger.warn(`Could not add creator to project: Missing required field values. ProjectId: ${projectId}, CreatorId: ${creatorId}`);
        }
      } catch (memberError) {
        logger.warn(`Could not add member to project: ${memberError.message}`);
        // Continue even if adding the member fails
      }
    }
    
    await client.query('COMMIT');
      // Log the activity, the updated logActivity function will handle both user and admin IDs
    try {      // We already have the project details including ID and can call logActivity directly
      // Check if the creator is in the users table or admins table to determine how to log properly
      const userCheck = await client.query(
        `SELECT 1 FROM users WHERE user_id = $1`,
        [creatorId]
      );
      
      if (userCheck.rows.length > 0) {
        // If it's a regular user
        await logActivity({
          userId: creatorId,
          projectId: project.project_id,
          action: 'create_project',
          details: { projectName: name, teamId }
        });
      } else {
        // If it might be an admin
        const adminCheck = await client.query(
          `SELECT 1 FROM admins WHERE admin_id = $1`,
          [creatorId]
        );
        
        if (adminCheck.rows.length > 0) {
          // Use audit_logs directly for admin activities
          await pool.query(
            `INSERT INTO audit_logs (admin_id, action_type, action_details, timestamp)
             VALUES ($1, $2, $3, NOW())`,
            [creatorId, 'create_project', JSON.stringify({ projectId: project.project_id, projectName: name, teamId })]
          );
        } else {
          logger.warn(`Unknown user/admin ID ${creatorId} when logging project creation`);
        }
      }
    } catch (logError) {
      logger.error('Error when trying to log activity:', logError);
      // Don't let logging errors affect the transaction result
    }

    return project;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Add member to project
 * @param {Object} params
 * @param {string} params.projectId - Project ID
 * @param {string} params.userId - User ID to add
 * @param {string} params.role - Member role (must be one of: 'Admin', 'Member', 'Contributor', 'Viewer')
 * @param {string} params.addedBy - ID of user adding the member
 * @returns {Promise<Object>} Project member record
 */
export const addProjectMember = async ({ projectId, userId, role, addedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user is already a member
    const existingMember = await client.query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (existingMember.rows[0]) {
      throw new Error('User is already a member of this project');
    }
      // Get valid roles from check constraint
    const roleConstraintQuery = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conname = 'check_role'
    `);
    
    let validRoles = ['Admin', 'Member', 'Contributor', 'Viewer', 'Project Manager'];
    if (roleConstraintQuery.rows.length > 0) {
      const constraintDef = roleConstraintQuery.rows[0].constraint_def;
      // Extract roles from constraint like CHECK ((role = ANY (ARRAY['Admin'::text, 'Member'::text])))
      const rolesMatch = constraintDef.match(/ARRAY\[(.*?)\]/);
      if (rolesMatch && rolesMatch[1]) {
        validRoles = rolesMatch[1].split(',')
          .map(role => role.trim().replace(/'(.+?)'::.+/, '$1'));
      }
    }
    
    // Validate role to match the database constraints
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role provided. Role must be one of: " + validRoles.join(", "));
    }

    // Add member - removed joined_at as it doesn't exist in the schema
    const result = await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, userId, role]
    );

    await client.query('COMMIT');    // Log the activity, the updated logActivity function will handle both user and admin IDs
    try {
      await logActivity({
        userId: addedBy,
        projectId,
        action: 'add_project_member',
        details: { userId, role }
      });
    } catch (logError) {
      logger.error('Error when trying to log activity:', logError);
      // Don't let logging errors affect the transaction result
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to add project member:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create a task in a project
 * @param {Object} params
 * @param {string} params.projectId - Project ID
 * @param {string} params.title - Task title
 * @param {string} params.creatorId - Creator's user ID
 * @param {string} [params.description] - Task description
 * @param {string} [params.assigneeId] - Assignee's user ID
 * @param {string} [params.priority] - Task priority
 * @param {Date} [params.dueDate] - Due date
 * @returns {Promise<Object>} Created task
 */
export const createTask = async ({
  projectId,
  title,
  creatorId,
  description = null,
  assigneeId = null,
  priority = 'medium',
  dueDate = null
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create task
    const taskResult = await client.query(
      `INSERT INTO tasks (
        project_id, title, description, creator_id, assignee_id,
        priority, due_date, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo', NOW())
      RETURNING *`,
      [projectId, title, description, creatorId, assigneeId, priority, dueDate]
    );

    const task = taskResult.rows[0];

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: creatorId,
      projectId,
      action: 'create_task',
      details: { taskId: task.id, title, assigneeId }
    });

    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create task:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update task status
 * @param {Object} params
 * @param {string} params.taskId - Task ID
 * @param {string} params.status - New status
 * @param {string} params.updatedBy - ID of user updating the status
 * @returns {Promise<Object>} Updated task
 */
export const updateTaskStatus = async ({ taskId, status, updatedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update task status
    const result = await client.query(
      `UPDATE tasks 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, taskId]
    );

    if (!result.rows[0]) {
      throw new Error('Task not found');
    }

    const task = result.rows[0];

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: updatedBy,
      projectId: task.project_id,
      action: 'update_task_status',
      details: { taskId, status }
    });

    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to update task status:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get project details
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project details with members and tasks
 */
export const getProjectDetails = async (projectId) => {
  try {    const projectResult = await pool.query(
      `SELECT p.*, u.username as creator_name, t.name as team_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.user_id
       LEFT JOIN teams t ON p.team_id = t.team_id
       WHERE p.project_id = $1`,
      [projectId]
    );

    if (!projectResult.rows[0]) {
      throw new Error('Project not found');
    }

    const project = projectResult.rows[0];

    // Get project members
    const membersResult = await pool.query(
      `SELECT pm.*, u.username, u.email
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );

    // Get project tasks
    const tasksResult = await pool.query(
      `SELECT t.*, 
              u1.username as creator_name,
              u2.username as assignee_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.user_id
       LEFT JOIN users u2 ON t.assigned_to = u2.user_id 
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId]
    );

    project.members = membersResult.rows;
    project.tasks = tasksResult.rows;
    return project;
  } catch (error) {
    logger.error('Failed to get project details:', error);
    throw error;
  }
};

/**
 * Get user's projects
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of projects
 */
export const getUserProjects = async (userId) => {
  try {    const result = await pool.query(
      `SELECT p.*, pm.role as user_role
       FROM projects p
       JOIN project_members pm ON p.project_id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to get user projects:', error);
    throw error;
  }
};