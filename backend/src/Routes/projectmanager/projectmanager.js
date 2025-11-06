import express from 'express';
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { pool } from '../../Config/database.js'; // Import the centralized pool configuration

const router = Router();

// Get all projects assigned to the project manager (READ-ONLY ACCESS)
// Project Managers cannot create projects - only Admin can create projects
// Project Managers can only work on projects assigned to them by Admin
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;

    // Get projects where user is assigned as project manager in project_members
    // Note: Project Managers are subordinate to Admin and can only see assigned projects
    const projects = await pool.query(
      `SELECT DISTINCT p.project_id, p.name, p.description, p.start_date, p.end_date, p.status, 
              COALESCE(u.name, a.first_name || ' ' || a.last_name) AS owner_name,
              p.created_at, p.budget,
              pm.role as assigned_role
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.user_id
       LEFT JOIN admins a ON p.owner_id = a.admin_id
       INNER JOIN project_members pm ON p.project_id = pm.project_id
       WHERE pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'
             AND ($2::uuid IS NULL OR p.company_id = $2)
       ORDER BY p.created_at DESC`, 
      [userId, companyId]
    );
    
    res.json({ 
      success: true,
      projects: projects.rows,
      message: 'Projects assigned to you by Admin'
    });
  } catch (err) {
    console.error('Error fetching assigned projects:', err);
    res.status(500).json({ error: 'Failed to fetch assigned projects' });
  }
});

// Get tasks for a specific project
router.get('/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const tasks = await pool.query(
      `SELECT t.task_id, t.title as name, t.description, t.due_date, t.status, 
              COALESCE(u.name, 'Unassigned') AS assigned_to,
              t.priority, t.created_at
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.user_id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`, 
      [projectId]
    );

    res.json({
      success: true,
      tasks: tasks.rows
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get dashboard metrics for project manager
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.query.companyId || req.user.companyId;
    const projectId = req.query.projectId;
    
    // Get project count for this manager
    const projectsCount = await pool.query(
      projectId 
        ? `SELECT COUNT(*) FROM projects p
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE p.project_id = $1 
           AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`
        : `SELECT COUNT(DISTINCT p.project_id) FROM projects p
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE (p.owner_id = $1 OR (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
           AND ($2::uuid IS NULL OR p.company_id = $2)`,
      projectId ? [projectId, userId] : [userId, companyId]
    );
    
    // Get team members count
    const teamMembersCount = await pool.query(
      projectId 
        ? `SELECT COUNT(DISTINCT pm1.user_id) FROM project_members pm1
           JOIN projects p ON pm1.project_id = p.project_id
           LEFT JOIN project_members pm2 ON p.project_id = pm2.project_id
           WHERE p.project_id = $1 
           AND (p.owner_id = $2 OR (pm2.user_id = $2 AND LOWER(pm2.role) LIKE '%manager%'))`
        : `SELECT COUNT(DISTINCT pm1.user_id) FROM project_members pm1
           JOIN projects p ON pm1.project_id = p.project_id
           LEFT JOIN project_members pm2 ON p.project_id = pm2.project_id
           WHERE (p.owner_id = $1 OR (pm2.user_id = $1 AND LOWER(pm2.role) LIKE '%manager%'))
           AND ($2::uuid IS NULL OR p.company_id = $2)`,
      projectId ? [projectId, userId] : [userId, companyId]
    );
    
    // Get overdue tasks count
    const overdueTasksCount = await pool.query(
      projectId
        ? `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE t.project_id = $1 
           AND t.due_date < CURRENT_DATE 
           AND t.status != 'Completed'
           AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`
        : `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE (p.owner_id = $1 OR (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
           AND ($2::uuid IS NULL OR p.company_id = $2)
           AND t.due_date < CURRENT_DATE AND t.status != 'Completed'`,
      projectId ? [projectId, userId] : [userId, companyId]
    );
    
    // Get completion rate and other metrics
    const completedTasksCount = await pool.query(
      projectId
        ? `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE t.project_id = $1 
           AND t.status = 'Completed'
           AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`
        : `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE (p.owner_id = $1 OR (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
           AND ($2::uuid IS NULL OR p.company_id = $2)
           AND t.status = 'Completed'`,
      projectId ? [projectId, userId] : [userId, companyId]
    );
    
    const totalTasksCount = await pool.query(
      projectId
        ? `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE t.project_id = $1
           AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`
        : `SELECT COUNT(*) FROM tasks t
           JOIN projects p ON t.project_id = p.project_id
           LEFT JOIN project_members pm ON p.project_id = pm.project_id
           WHERE (p.owner_id = $1 OR (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
           AND ($2::uuid IS NULL OR p.company_id = $2)`,
      projectId ? [projectId, userId] : [userId, companyId]
    );

    // Calculate completion rate
    const completionRate = totalTasksCount.rows[0].count > 0 
      ? (completedTasksCount.rows[0].count / totalTasksCount.rows[0].count) * 100 
      : 0;

    // Return all metrics
    res.json({
      success: true,
      projectsCount: parseInt(projectsCount.rows[0].count),
      teamMembersCount: parseInt(teamMembersCount.rows[0].count),
      overdueTasksCount: parseInt(overdueTasksCount.rows[0].count),
      completedTasksCount: parseInt(completedTasksCount.rows[0].count),
      totalTasksCount: parseInt(totalTasksCount.rows[0].count),
      completionRate: parseFloat(completionRate.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      projectsCount: 0,
      teamMembersCount: 0,
      overdueTasksCount: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      completionRate: 0
    });
  }
});

// Get all tasks for project manager
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    // Get all tasks for projects where user is owner or project manager
    const tasks = await pool.query(
      `SELECT 
        t.task_id, 
        t.title as name, 
        t.description, 
        t.due_date, 
        t.status, 
        t.priority,
        t.project_id,
        p.name AS project_name,
        COALESCE(u.name, 'Unassigned') AS assigned_to_name,
        u.email AS assigned_to_email,
        t.created_at
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE (p.owner_id = $1 OR 
             (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
            AND ($2::uuid IS NULL OR p.company_id = $2)
      ORDER BY t.due_date ASC, t.created_at DESC`,
      [userId, companyId]
    );

    res.json({
      success: true,
      tasks: tasks.rows
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tasks' 
    });
  }
});

// Get team members for project manager
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    // Get all teams for this company or created by this user
    const teams = await pool.query(
      `SELECT 
        t.team_id, 
        t.name, 
        t.description, 
        t.created_at,
        COUNT(tm.user_id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      WHERE t.company_id = $1 OR t.created_by = $2
      GROUP BY t.team_id, t.name, t.description, t.created_at
      ORDER BY t.created_at DESC`,
      [companyId, userId]
    );

    res.json({
      success: true,
      data: teams.rows
    });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch teams' 
    });
  }
});

// Get recent activities for project manager
router.get('/activities/recent', authenticateToken, async (req, res) => {  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.query.companyId || req.user.companyId;
      // Get recent activities for projects managed by this user
    const activities = await pool.query(
      `SELECT 
        al.log_id as activity_id,
        al.action,
        al.created_at,
        al.timestamp,
        al.user_id,
        u.name as user_name,
        p.name as project_name,
        p.project_id
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE (p.owner_id = $1 OR 
             (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
            AND ($2::uuid IS NULL OR p.company_id = $2)
            AND al.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY al.created_at DESC
      LIMIT 20`,
      [userId, companyId]
    );

    res.json({
      success: true,
      activities: activities.rows
    });
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recent activities',
      activities: []
    });
  }
});

// Get team members for project manager
router.get('/team/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.query.companyId || req.user.companyId;
    
    // Get team members from projects managed by this user
    const members = await pool.query(
      `SELECT DISTINCT
        u.user_id,
        u.name,
        u.email,
        u.role,
        u.profile_picture_url as avatar_url,
        pm.role as project_role,
        p.name as project_name,
        p.project_id
      FROM users u
      JOIN project_members pm ON u.user_id = pm.user_id
      JOIN projects p ON pm.project_id = p.project_id
      LEFT JOIN project_members pm2 ON p.project_id = pm2.project_id
      WHERE (p.owner_id = $1 OR 
             (pm2.user_id = $1 AND LOWER(pm2.role) LIKE '%manager%'))
            AND ($2::uuid IS NULL OR u.company_id = $2)
      ORDER BY u.name`,
      [userId, companyId]
    );

    res.json({
      success: true,
      members: members.rows
    });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch team members',
      members: []
    });
  }
});

// ENHANCED PROJECT MANAGER CAPABILITIES
// Project Managers can create teams, manage tasks, and view reports from subordinates
// They are still subordinate to Admin but have team leadership capabilities

// Get all teams created by project manager
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        t.team_id,
        t.name as team_name,
        t.description,
        t.created_at,
        t.status,
        COUNT(DISTINCT tm.user_id) as member_count,
        p.project_id,
        p.name as project_name
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      LEFT JOIN projects p ON t.project_id = p.project_id
      WHERE t.created_by = $1 AND (t.company_id = $2 OR t.company_id IS NULL)
        AND (t.status IS NULL OR t.status != 'deleted')
      GROUP BY t.team_id, t.name, t.description, t.created_at, t.status, p.project_id, p.name
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query, [userId, companyId]);
    
    res.json({ 
      success: true,
      teams: result.rows,
      message: 'Teams created by you'
    });
  } catch (err) {
    console.error('Error fetching project manager teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Create a new team (Project Manager capability)
router.post('/teams', authenticateToken, async (req, res) => {
  try {
    const { name, description, project_id } = req.body;
    const userId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    const query = `
      INSERT INTO teams (name, description, created_by, company_id, project_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, userId, companyId, project_id]);
    const team = result.rows[0];
    
    // Add creator as team admin
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [team.team_id, userId]
    );
    
    res.status(201).json({ 
      success: true,
      team: team,
      message: 'Team created successfully'
    });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Add member to team (Project Manager capability)
router.post('/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId: memberUserId, role = 'member' } = req.body;
    const managerId = req.user.userId || req.user.id;
    
    // Verify team is created by this project manager
    const teamCheck = await pool.query(
      'SELECT 1 FROM teams WHERE team_id = $1 AND created_by = $2',
      [teamId, managerId]
    );
    
    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only manage teams you created' });
    }
    
    // Check if user is already a member
    const existingMember = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, memberUserId]
    );
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a team member' });
    }
    
    // Add member
    const result = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, added_by, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [teamId, memberUserId, role, managerId]
    );
    
    res.json({ 
      success: true,
      member: result.rows[0],
      message: 'Team member added successfully'
    });
  } catch (err) {
    console.error('Error adding team member:', err);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Create task (Project Manager capability)
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { 
      project_id, 
      title, 
      description, 
      assigned_to, 
      priority = 'Medium', 
      due_date,
      team_id 
    } = req.body;
    const creatorId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    if (!title || !project_id) {
      return res.status(400).json({ error: 'Title and project_id are required' });
    }
    
    // Verify project manager has access to this project
    const projectCheck = await pool.query(
      `SELECT 1 FROM project_members pm 
       JOIN projects p ON pm.project_id = p.project_id
       WHERE pm.project_id = $1 AND pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'
       AND p.company_id = $3`,
      [project_id, creatorId, companyId]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only create tasks for projects you manage' });
    }
    
    const query = `
      INSERT INTO tasks (
        project_id, title, description, assigned_to, priority, 
        due_date, team_id, project_creator, company_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      project_id, title, description, assigned_to, priority, 
      due_date, team_id, creatorId, companyId
    ]);
    
    res.status(201).json({ 
      success: true,
      task: result.rows[0],
      message: 'Task created successfully'
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get reports from subordinates (team members)
router.get('/reports/subordinates', authenticateToken, async (req, res) => {
  try {
    const managerId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    // Get reports from team members of teams created by this project manager
    const query = `
      SELECT 
        r.report_id,
        r.title,
        r.content,
        r.status,
        r.feedback,
        r.attachment_url,
        r.created_at,
        r.description,
        r.file_path,
        r.recipient,
        u.name as author_name,
        u.email as author_email,
        t.name as team_name
      FROM reports r
      JOIN users u ON r.author_id = u.user_id
      JOIN team_members tm ON u.user_id = tm.user_id
      JOIN teams t ON tm.team_id = t.team_id
      WHERE t.created_by = $1 
        AND u.company_id = $2
        AND r.recipient = 'team'
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [managerId, companyId]);
    
    res.json({
      success: true,
      reports: result.rows,
      message: 'Reports from your team members'
    });
  } catch (err) {
    console.error('Error fetching subordinate reports:', err);
    res.status(500).json({ error: 'Failed to fetch subordinate reports' });
  }
});

// Update task (Project Manager capability)
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, assigned_to, priority, due_date, status } = req.body;
    const managerId = req.user.userId || req.user.id;
    const companyId = req.user.companyId;
    
    // Verify project manager has access to this task
    const taskCheck = await pool.query(
      `SELECT t.task_id FROM tasks t
       JOIN project_members pm ON t.project_id = pm.project_id
       WHERE t.task_id = $1 AND pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'
       AND t.company_id = $3`,
      [taskId, managerId, companyId]
    );
    
    if (taskCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only update tasks for projects you manage' });
    }
    
    const query = `
      UPDATE tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          assigned_to = COALESCE($3, assigned_to),
          priority = COALESCE($4, priority),
          due_date = COALESCE($5, due_date),
          status = COALESCE($6, status),
          updated_at = NOW()
      WHERE task_id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, description, assigned_to, priority, due_date, status, taskId
    ]);
    
    res.json({ 
      success: true,
      task: result.rows[0],
      message: 'Task updated successfully'
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// =======================
// TEAM MANAGEMENT ROUTES
// =======================

// Create a new team (Project Manager can create teams for their projects)
router.post('/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { name, description, project_id } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // If project_id is provided, verify the PM manages this project
    if (project_id) {
      const projectCheck = await pool.query(
        `SELECT p.project_id FROM projects p
         LEFT JOIN project_members pm ON p.project_id = pm.project_id
         WHERE p.project_id = $1 
         AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
        [project_id, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Access denied. You can only create teams for projects you manage.' 
        });
      }
    }

    const query = `
      INSERT INTO teams (name, description, created_by, project_id)
      VALUES ($1, $2, $3, $4)
      RETURNING team_id, name, description, created_at, project_id
    `;

    const values = [name, description, userId, project_id];
    const result = await pool.query(query, values);
    
    // Add creator as team admin
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [result.rows[0].team_id, userId]
    );
    
    res.status(201).json({
      success: true,
      team: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get teams managed by this project manager
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { companyId } = req.user;
    
    const query = `
      SELECT DISTINCT 
        t.team_id,
        t.name,
        t.description,
        t.created_at,
        t.project_id,
        p.name as project_name,
        COUNT(tm.user_id) as member_count
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      WHERE (p.owner_id = $1 OR 
             (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
            AND ($2::uuid IS NULL OR p.company_id = $2)
      GROUP BY t.team_id, t.name, t.description, t.created_at, t.project_id, p.name
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, [userId, companyId]);
    
    res.json({
      success: true,
      teams: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Add member to team
router.post('/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { teamId } = req.params;
    const { user_id, role = 'Member' } = req.body;
    
    // Verify the PM manages the project this team belongs to
    const teamCheck = await pool.query(
      `SELECT t.team_id FROM teams t
       LEFT JOIN projects p ON t.project_id = p.project_id
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE t.team_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [teamId, userId]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only manage teams in your projects.' 
      });
    }

    const query = `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id) DO UPDATE 
      SET role = EXCLUDED.role
      RETURNING *
    `;

    const result = await pool.query(query, [teamId, user_id, role]);
    
    res.status(201).json({
      success: true,
      member: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// =======================
// TASK MANAGEMENT ROUTES
// =======================

// Create a new task (Project Manager can create tasks in their projects)
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { 
      title, 
      description, 
      project_id, 
      assigned_to, 
      due_date, 
      priority = 'Medium',
      status = 'Pending'
    } = req.body;
    
    // Validate required fields
    if (!title || !project_id) {
      return res.status(400).json({ error: 'Title and project_id are required' });
    }

    // Verify the PM manages this project
    const projectCheck = await pool.query(
      `SELECT p.project_id FROM projects p
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE p.project_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [project_id, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only create tasks in projects you manage.' 
      });
    }

    const query = `
      INSERT INTO tasks (title, description, project_id, assigned_to, due_date, priority, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING task_id, title, description, project_id, assigned_to, due_date, priority, status, created_at
    `;

    const values = [title, description, project_id, assigned_to, due_date, priority, status, userId];
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks for projects managed by this project manager
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { companyId } = req.user;
    const { project_id, status } = req.query;
    
    let query = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.project_id,
        p.name as project_name,
        COALESCE(u.name, 'Unassigned') as assigned_to_name,
        t.assigned_to
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE (p.owner_id = $1 OR 
             (pm.user_id = $1 AND LOWER(pm.role) LIKE '%manager%'))
            AND ($2::uuid IS NULL OR p.company_id = $2)
    `;

    const queryParams = [userId, companyId];

    if (project_id) {
      query += ` AND t.project_id = $3`;
      queryParams.push(project_id);
    }

    if (status) {
      query += ` AND t.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      tasks: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update task (Project Manager can update tasks in their projects)
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { taskId } = req.params;
    const updates = req.body;
    
    // Verify the PM manages the project this task belongs to
    const taskCheck = await pool.query(
      `SELECT t.task_id FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.project_id
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE t.task_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only update tasks in your projects.' 
      });
    }

    // Build dynamic update query
    const allowedFields = ['title', 'description', 'assigned_to', 'due_date', 'priority', 'status'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const query = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE task_id = $${paramCount}
      RETURNING *
    `;
    values.push(taskId);

    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// =======================
// PROJECT SUBMISSION ROUTES  
// =======================

// Submit completed project to Admin
router.post('/submit-project', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { 
      project_id, 
      summaryReport, 
      completionNotes, 
      nextSteps, 
      projectFiles, 
      projectReports,
      projectStats 
    } = req.body;
    
    logger.info('Submitting project', { userId, project_id });

    // Validate required fields
    if (!project_id || !summaryReport) {
      return res.status(400).json({ error: 'Project ID and summary report are required' });
    }

    // Verify the PM manages this project
    const projectCheck = await pool.query(
      `SELECT p.project_id, p.name, p.owner_id FROM projects p
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE p.project_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [project_id, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only submit projects you manage' 
      });
    }

    const project = projectCheck.rows[0];

    // Create project submission record
    const submissionQuery = `
      INSERT INTO project_submissions (
        project_id, 
        submitted_by, 
        summary_report, 
        completion_notes, 
        next_steps, 
        files_included, 
        reports_included,
        project_stats,
        status,
        submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
      RETURNING submission_id, submitted_at
    `;

    const submissionValues = [
      project_id,
      userId,
      summaryReport,
      completionNotes,
      nextSteps,
      JSON.stringify(projectFiles || []),
      JSON.stringify(projectReports || []),
      JSON.stringify(projectStats || {})
    ];

    const submissionResult = await pool.query(submissionQuery, submissionValues);

    // Update project status to 'submitted'
    await pool.query(
      `UPDATE projects 
       SET status = 'submitted', updated_at = NOW() 
       WHERE project_id = $1`,
      [project_id]
    );

    // Create notification for Admin
    const notificationQuery = `
      INSERT INTO notifications (
        user_id, 
        title, 
        message, 
        type, 
        related_id, 
        created_at
      )
      SELECT 
        a.admin_id,
        'Project Submitted for Review',
        $1,
        'project_submission',
        $2,
        NOW()
      FROM admins a 
      WHERE a.company_id = (
        SELECT company_id FROM projects WHERE project_id = $2
      )
    `;

    const notificationMessage = `Project "${project.name}" has been submitted by Project Manager for your review. The submission includes ${(projectReports || []).length} reports and ${(projectFiles || []).length} files.`;
    
    await pool.query(notificationQuery, [notificationMessage, project_id]);

    logger.info('Project submitted successfully', { 
      submission_id: submissionResult.rows[0].submission_id,
      project_id 
    });

    res.status(201).json({
      success: true,
      submission: {
        id: submissionResult.rows[0].submission_id,
        project_id,
        submitted_at: submissionResult.rows[0].submitted_at,
        status: 'pending'
      },
      message: 'Project submitted successfully. Admin has been notified for review.'
    });
  } catch (error) {
    logger.error('Error submitting project:', error);
    res.status(500).json({ error: 'Failed to submit project' });
  }
});

// Get project files for submission
router.get('/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { projectId } = req.params;
    
    logger.info('Fetching project files', { userId, projectId });

    // Verify access to project
    const projectCheck = await pool.query(
      `SELECT p.project_id FROM projects p
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE p.project_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only access files from your projects.' 
      });
    }

    const filesQuery = `
      SELECT 
        file_id,
        name,
        file_path,
        file_size as size,
        mime_type,
        uploaded_at,
        uploaded_by
      FROM project_files 
      WHERE project_id = $1
      ORDER BY uploaded_at DESC
    `;

    const result = await pool.query(filesQuery, [projectId]);
    
    logger.info('Project files fetched successfully', { count: result.rows.length });
    res.json({
      success: true,
      files: result.rows
    });
  } catch (error) {
    logger.error('Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
});

// Get project statistics for submission
router.get('/projects/:projectId/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { projectId } = req.params;
    
    logger.info('Fetching project stats', { userId, projectId });

    // Verify access to project
    const projectCheck = await pool.query(
      `SELECT p.project_id FROM projects p
       LEFT JOIN project_members pm ON p.project_id = pm.project_id
       WHERE p.project_id = $1 
       AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You can only access stats from your projects.' 
      });
    }

    // Get comprehensive project statistics
    const [tasksResult, membersResult, daysResult] = await Promise.all([
      // Task statistics
      pool.query(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_tasks,
           COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_tasks,
           COUNT(CASE WHEN due_date < NOW() AND status != 'Completed' THEN 1 END) as overdue_tasks
         FROM tasks WHERE project_id = $1`,
        [projectId]
      ),
      // Team member count
      pool.query(
        `SELECT COUNT(DISTINCT user_id) as team_members
         FROM project_members WHERE project_id = $1`,
        [projectId]
      ),
      // Project duration
      pool.query(
        `SELECT 
           CASE 
             WHEN start_date IS NOT NULL THEN 
               EXTRACT(DAYS FROM NOW() - start_date)::INTEGER
             ELSE 
               EXTRACT(DAYS FROM NOW() - created_at)::INTEGER
           END as days_active
         FROM projects WHERE project_id = $1`,
        [projectId]
      )
    ]);

    const stats = {
      totalTasks: parseInt(tasksResult.rows[0].total_tasks) || 0,
      completedTasks: parseInt(tasksResult.rows[0].completed_tasks) || 0,
      inProgressTasks: parseInt(tasksResult.rows[0].in_progress_tasks) || 0,
      overdueTasks: parseInt(tasksResult.rows[0].overdue_tasks) || 0,
      teamMembers: parseInt(membersResult.rows[0].team_members) || 0,
      daysActive: parseInt(daysResult.rows[0].days_active) || 0,
      completionRate: tasksResult.rows[0].total_tasks > 0 
        ? Math.round((tasksResult.rows[0].completed_tasks / tasksResult.rows[0].total_tasks) * 100)
        : 0
    };
    
    logger.info('Project stats fetched successfully', { stats });
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching project stats:', error);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
});

// Get project submission status  
router.get('/projects/:projectId/submission-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { projectId } = req.params;
    
    logger.info('Fetching project submission status', { userId, projectId });

    const query = `
      SELECT 
        ps.*,
        p.name as project_name,
        u.name as submitted_by_name
      FROM project_submissions ps
      JOIN projects p ON ps.project_id = p.project_id
      LEFT JOIN users u ON ps.submitted_by = u.user_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE ps.project_id = $1 
      AND (p.owner_id = $2 OR (pm.user_id = $2 AND LOWER(pm.role) LIKE '%manager%'))
      ORDER BY ps.submitted_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [projectId, userId]);
    
    logger.info('Project submission status fetched', { hasSubmission: result.rows.length > 0 });
    res.json({
      success: true,
      submission: result.rows[0] || null
    });
  } catch (error) {
    logger.error('Error fetching submission status:', error);
    res.status(500).json({ error: 'Failed to fetch submission status' });
  }
});

// RESTRICTED OPERATIONS FOR PROJECT MANAGERS
// Project Managers are subordinate to Admin and cannot perform these operations

// Block project creation - only Admin can create projects
router.post('/projects', authenticateToken, async (req, res) => {
  return res.status(403).json({ 
    error: 'Access Denied', 
    message: 'Project Managers cannot create projects. Please contact your Admin to create new projects.',
    role: 'Project Manager',
    permissions: 'Read and Manage assigned projects only'
  });
});

// Block project deletion - only Admin can delete projects
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  return res.status(403).json({ 
    error: 'Access Denied', 
    message: 'Project Managers cannot delete projects. Please contact your Admin for project deletion.',
    role: 'Project Manager',
    permissions: 'Read and Manage assigned projects only'
  });
});

// Block company-wide operations - Project Managers work within assigned scope
router.get('/company-overview', authenticateToken, async (req, res) => {
  return res.status(403).json({ 
    error: 'Access Denied', 
    message: 'Project Managers cannot access company-wide overview. This feature is restricted to Admin.',
    role: 'Project Manager',
    permissions: 'Limited to assigned projects and team management'
  });
});

// Project Manager role information endpoint
router.get('/role-info', authenticateToken, async (req, res) => {
  try {
    res.json({
      role: 'Project Manager',
      permissions: {
        canCreate: {
          projects: false,
          teams: false,
          users: false
        },
        canManage: {
          assignedProjects: true,
          projectTasks: true,
          teamMembers: true,
          projectReports: true
        },
        canView: {
          assignedProjects: true,
          projectMetrics: true,
          teamActivity: true
        },
        canDelete: {
          projects: false,
          users: false
        }
      },
      hierarchy: 'Subordinate to Admin',
      description: 'Project Managers work on projects assigned by Admin and manage their execution.',
      restrictions: [
        'Cannot create new projects',
        'Cannot delete projects', 
        'Cannot access company-wide data',
        'Cannot create or remove users',
        'Limited to assigned project scope'
      ]
    });
  } catch (err) {
    console.error('Error fetching role info:', err);
    res.status(500).json({ error: 'Failed to fetch role information' });
  }
});

// Export the router
export default router;
