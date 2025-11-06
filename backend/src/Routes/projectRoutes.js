import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';
import {
  createProject,
  addProjectMember,
  createTask,
  updateTaskStatus,
  getProjectDetails,
  getUserProjects
} from '../utils/projectManager.js';

const router = express.Router();

// Get all projects for a company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        p.*,
        COUNT(t.task_id) as task_count,
        COUNT(pm.user_id) as member_count,
        COALESCE(u.name, a.first_name || ' ' || a.last_name) as owner_name
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      LEFT JOIN users u ON p.owner_id = u.user_id
      LEFT JOIN admins a ON p.owner_id = a.admin_id
      WHERE p.company_id = $1
      GROUP BY p.project_id, u.name, a.first_name, a.last_name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [companyId]);
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, teamId } = req.body;
      // Get the creator ID from the token - could be userId or adminId depending on user type
    const creatorId = req.user.userId || req.user.adminId;
    
    if (!creatorId) {
      return res.status(400).json({ error: 'User ID or Admin ID not found in token' });
    }
    
    const project = await createProject({
      name,
      description,
      teamId,
      creatorId
    });
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project members endpoint
router.get('/:projectId/members', authenticateToken, getProjectMembers);

// Import project controller for better organization
import { getProjectManager, getProjectMembers } from '../controllers/projectController.js';

// Get project manager endpoint
router.get('/:projectId/manager', authenticateToken, getProjectManager);

// Get user's projects
router.get('/my-projects', authenticateToken, async (req, res) => {
  try {
    const projects = await getUserProjects(req.user.id);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project details
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const project = await getProjectDetails(req.params.projectId);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to project
router.post('/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const projectId = req.params.projectId;
    
    // Validate project exists first
    const projectCheck = await pool.query(
      `SELECT * FROM projects WHERE project_id = $1`,
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get valid roles from check constraint
    const roleConstraintQuery = await pool.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conname = 'check_role'
    `);
    
    let validRoles = ['Admin', 'Member', 'Contributor', 'Viewer', 'Project Manager'];
    let roleToUse = role || 'Member'; // Default to Member
    
    if (roleConstraintQuery.rows.length > 0) {
      const constraintDef = roleConstraintQuery.rows[0].constraint_def;
      const rolesMatch = constraintDef.match(/ARRAY\[(.*?)\]/);
      
      if (rolesMatch && rolesMatch[1]) {
        validRoles = rolesMatch[1].split(',')
          .map(r => r.trim().replace(/'(.+?)'::.+/, '$1'));
          
        // Ensure the role is valid according to the constraint
        if (!validRoles.find(r => r.toLowerCase() === roleToUse.toLowerCase())) {
          roleToUse = validRoles[0]; // Use first valid role as default
        }
      }
    }
    
    const member = await addProjectMember({
      projectId: projectId,
      userId,
      role: roleToUse,
      addedBy: req.user.userId || req.user.adminId || req.user.id
    });
    
    res.status(201).json(member);
  } catch (error){
    console.error('Error adding project member:', error);
    res.status(500).json({ error: error.message || 'Failed to add member to project' });
  }
});

// Create task in project
router.post('/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate } = req.body;
    const task = await createTask({
      projectId: req.params.projectId,
      title,
      description,
      assigneeId,
      priority,
      dueDate,
      creatorId: req.user.id
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:projectId/tasks/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await updateTaskStatus({
      taskId: req.params.taskId,
      status,
      updatedBy: req.user.id
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;