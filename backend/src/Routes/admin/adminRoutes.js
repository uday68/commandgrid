// filepath: d:\project_management_tool\backend\src\Routes\admin\adminRoutes.js
import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { logAudit } from '../../utils/logger.js';
import { cache } from '../../middleware/cache.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import userController from '../../controllers/userController.js';

const router = express.Router();

// Apply rate limiting to all admin routes
router.use(apiLimiter);

// Import sub-routers
import notificationRouter from './notification.js';
import projectRouter from './projectRoutes.js';
import userRouter from './AdminuserRoutes.js';
import calendarRouter from './calendarEvents.js';
import rolesRouter from './roles/index.js';
import chatAdminRouter from './chatAdminRoutes.js';

// Mount sub-routers
router.use('/notifications', notificationRouter);
router.use('/projects', projectRouter);
router.use('/users', userRouter);
router.use('/calendar', calendarRouter);
router.use('/roles', rolesRouter);
router.use('/chat-rooms', chatAdminRouter);

// Admin impersonation endpoints
router.post('/impersonate/:userId', authenticateToken, isAdmin, (req, res) => {
  // Extract the userId from URL params and add it to request body
  req.body.userId = req.params.userId;
  return userController.impersonateUser(req, res);
});
router.post('/end-impersonation', authenticateToken, userController.endImpersonation);

/**
 * @desc    Get admin stats overview
 * @route   GET /api/admin/stats
 * @access  Admin
 */
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND status != 'deleted') as total_users,
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND last_active > NOW() - INTERVAL '30 days') as active_users,
        (SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'active') as total_projects,
        (SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'active') as active_projects,
        (SELECT COUNT(*) FROM tasks WHERE company_id = $1) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE company_id = $1 AND status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM teams WHERE company_id = $1 AND status = 'active') as total_teams,
        NOW() as last_updated
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // If no results or error, return fallback data
    if (!result.rows || result.rows.length === 0) {
      return res.json({
        total_users: 0,
        active_users: 0,
        total_projects: 0,
        active_projects: 0,
        total_tasks: 0,
        completed_tasks: 0,
        total_teams: 0,
        last_updated: new Date().toISOString()
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Return fallback data on error
    res.json({
      total_users: 0,
      active_users: 0,
      total_projects: 0,
      active_projects: 0,
      total_tasks: 0,
      completed_tasks: 0,
      total_teams: 0,
      last_updated: new Date().toISOString()
    });
  }
});

/**
 * @desc    Get admin tasks overview
 * @route   GET /api/admin/tasks
 * @access  Admin
 */
router.get('/tasks', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        t.project_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        p.name as project_name,
        u.name as assigned_to_name,
        t.company_id
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE t.company_id = $1
      ORDER BY 
        CASE 
          WHEN t.status = 'pending' THEN 1
          WHEN t.status = 'in_progress' THEN 2
          ELSE 3
        END,
        CASE 
          WHEN t.priority = 'high' THEN 1
          WHEN t.priority = 'medium' THEN 2
          ELSE 3
        END,
        t.due_date ASC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // If no results or error, return empty array
    if (!result.rows) {
      return res.json({ tasks: [] });
    }
    
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    // Return empty array on error
    res.json({ tasks: [] });
  }
});

/**
 * @desc    Get all available permissions
 * @route   GET /api/admin/permissions
 * @access  Admin
 */
router.get('/permissions', authenticateToken, isAdmin, async (req, res) => {
  try {
    // These are system-defined permissions
    const permissions = [
      { id: 'view_projects', name: 'view_projects', description: 'View all projects' },
      { id: 'create_projects', name: 'create_projects', description: 'Create new projects' },
      { id: 'edit_projects', name: 'edit_projects', description: 'Edit existing projects' },
      { id: 'delete_projects', name: 'delete_projects', description: 'Delete projects' },
      { id: 'assign_tasks', name: 'assign_tasks', description: 'Assign tasks to users' },
      { id: 'view_reports', name: 'view_reports', description: 'View reports' },
      { id: 'export_data', name: 'export_data', description: 'Export data' },
      { id: 'manage_users', name: 'manage_users', description: 'Manage system users' },
      { id: 'manage_teams', name: 'manage_teams', description: 'Manage teams' },
      { id: 'view_analytics', name: 'view_analytics', description: 'View analytics data' },
      { id: 'schedule_meetings', name: 'schedule_meetings', description: 'Schedule meetings' },
      { id: 'upload_files', name: 'upload_files', description: 'Upload files' },
      { id: 'manage_roles', name: 'manage_roles', description: 'Manage user roles' },
      { id: 'system_settings', name: 'system_settings', description: 'Change system settings' }
    ];
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * @desc    Create a new role
 * @route   POST /api/admin/roles
 * @access  Admin
 */
router.post('/roles', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, permissions = [] } = req.body;
    const companyId = req.user.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    await client.query('BEGIN');
    
    // Create the role
    const roleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING role_id, name, description, company_id, is_system, created_at`,
      [name, description || null, companyId]
    );

    const roleId = roleResult.rows[0].role_id;
    
    // Add permissions if any
    if (permissions && permissions.length > 0) {
      // Build a bulk insert query for better performance
      const permValues = permissions.map((_, index) => `($1, $${index + 2})`).join(', ');
      const permParams = [roleId, ...permissions];
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission)
         VALUES ${permValues}`,
        permParams
      );
    }
    
    await client.query('COMMIT');
    
    // Return the created role with its permissions
    const createdRole = {
      ...roleResult.rows[0],
      permissions: permissions || []
    };
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_created',
      actionDetails: `Role created: ${name}`
    });

    res.status(201).json(createdRole);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating role:', error);
    
    // Handle duplicate role name
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Get all roles
 * @route   GET /api/admin/roles
 * @access  Admin
 */
router.get('/roles', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Get roles with permissions
    const query = `
      SELECT 
        ur.role_id,
        ur.name,
        ur.description,
        ur.is_system,
        ur.created_at,
        ARRAY_AGG(rp.permission) AS permissions
      FROM user_roles ur
      LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE ur.company_id = $1
      GROUP BY ur.role_id
      ORDER BY ur.created_at DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // If no roles exist yet, create default roles
    if (result.rows.length === 0) {
      await createDefaultRoles(companyId);
      const defaultResult = await pool.query(query, [companyId]);
      return res.json(defaultResult.rows);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * @desc    Update a role
 * @route   PUT /api/admin/roles/:roleId
 * @access  Admin
 */
router.put('/roles/:roleId', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const { name, description, permissions = [] } = req.body;
    const companyId = req.user.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check if role exists and belongs to company
    const roleCheck = await client.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Check if it's a system role
    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'System roles cannot be modified' });
    }
    
    await client.query('BEGIN');
    
    // Update the role
    const roleResult = await client.query(
      `UPDATE user_roles 
       SET name = $1, description = $2
       WHERE role_id = $3
       RETURNING role_id, name, description, company_id, is_system, created_at`,
      [name, description || null, roleId]
    );
    
    // Delete existing permissions
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [roleId]
    );
    
    // Add new permissions if any
    if (permissions && permissions.length > 0) {
      // Build a bulk insert query for better performance
      const permValues = permissions.map((_, index) => `($1, $${index + 2})`).join(', ');
      const permParams = [roleId, ...permissions];
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission)
         VALUES ${permValues}`,
        permParams
      );
    }
    
    await client.query('COMMIT');
    
    // Return the updated role with its permissions
    const updatedRole = {
      ...roleResult.rows[0],
      permissions: permissions || []
    };
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_updated',
      actionDetails: `Role updated: ${name}`
    });

    res.json(updatedRole);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role:', error);
    
    // Handle duplicate role name
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Delete a role
 * @route   DELETE /api/admin/roles/:roleId
 * @access  Admin
 */
router.delete('/roles/:roleId', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const companyId = req.user.companyId;
    
    // Check if role exists and belongs to company
    const roleCheck = await client.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const roleName = roleCheck.rows[0].name;
    
    // Check if it's a system role
    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }
    
    await client.query('BEGIN');
    
    // Remove role from all users first
    await client.query(
      'DELETE FROM user_role_assignments WHERE role_id = $1',
      [roleId]
    );
    
    // Delete permissions
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [roleId]
    );
    
    // Delete role
    await client.query(
      'DELETE FROM user_roles WHERE role_id = $1',
      [roleId]
    );
    
    await client.query('COMMIT');
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_deleted',
      actionDetails: `Role deleted: ${roleName}`
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Get user roles
 * @route   GET /api/admin/users/:userId/roles
 * @access  Admin
 */
router.get('/users/:userId/roles', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's roles
    const rolesQuery = `
      SELECT ur.* 
      FROM user_roles ur
      JOIN user_role_assignments ura ON ur.role_id = ura.role_id
      WHERE ura.user_id = $1
    `;
    
    const result = await pool.query(rolesQuery, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

/**
 * @desc    Assign role to user
 * @route   POST /api/admin/users/:userId/roles
 * @access  Admin
 */
router.post('/users/:userId/roles', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const companyId = req.user.companyId;
    
    // Validate role ID
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify role exists and belongs to company
    const roleCheck = await pool.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Assign role to user
    await pool.query(
      `INSERT INTO user_role_assignments (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_assigned',
      actionDetails: `Role '${roleCheck.rows[0].name}' assigned to user ID ${userId}`
    });

    res.status(201).json({ 
      message: `Role '${roleCheck.rows[0].name}' assigned to user successfully`
    });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: 'Failed to assign role to user' });
  }
});

/**
 * @desc    Remove role from user
 * @route   DELETE /api/admin/users/:userId/roles/:roleId
 * @access  Admin
 */
router.delete('/users/:userId/roles/:roleId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const companyId = req.user.companyId;
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove role from user
    await pool.query(
      `DELETE FROM user_role_assignments 
       WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_removed',
      actionDetails: `Role ID ${roleId} removed from user ID ${userId}`
    });

    res.json({ message: 'Role removed from user successfully' });
  } catch (error) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: 'Failed to remove role from user' });
  }
});

/**
 * @desc    Create database backup
 * @route   POST /api/admin/backup
 * @access  Admin
 */
router.post("/backup", authenticateToken, isAdmin, async (req, res) => {
  try {
    // This would typically involve executing a database backup command
    // For example with pg_dump. This is a placeholder implementation.
    
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${backupTimestamp}.sql`;
    
    // Log the backup action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'database_backup',
      actionDetails: `Database backup initiated: ${backupFileName}`
    });
    
    res.json({
      success: true,
      message: "Backup initiated successfully",
      fileName: backupFileName
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
});

/**
 * @desc    Get audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Admin
 */
router.get("/audit-logs", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    
    // Fetch audit logs with pagination
    const query = `
      SELECT 
        al.log_id AS audit_id,
        al.user_id,
        u.name AS user_name,
        al.admin_id,
        a.email AS admin_email,
        al.ip_address,
        al.action_type AS event_type,
        al.action_details AS description,
        al.timestamp,
        al.severity,
        al.location_data,
        al.user_agent
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN admins a ON al.admin_id = a.admin_id
      ORDER BY al.${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) AS total FROM audit_logs`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      audits: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * @desc    Impersonate a user (admin only)
 * @route   POST /api/admin/impersonate
 * @access  Admin
 */
router.post("/impersonate", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.adminId;
    const adminCompanyId = req.user.companyId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Verify the user belongs to the same company
    const userQuery = `
      SELECT user_id, name, email, role, company_id
      FROM users
      WHERE user_id = $1 AND company_id = $2
    `;
    const userResult = await pool.query(userQuery, [userId, adminCompanyId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or not in your company' });
    }
    
    const user = userResult.rows[0];
    
    // Log the impersonation for audit purposes
    await pool.query(`
      INSERT INTO audit_logs (
        admin_id, user_id, action_type, ip_address, action_details, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      adminId,
      userId,
      'impersonation',
      req.ip,
      `Admin impersonated user: ${user.email}`
    ]);
    
    // Create an impersonation token
    const token = jwt.sign(
      {
        userId: user.user_id,
        adminId: adminId, // Keep track of the admin who is impersonating
        role: user.role,
        companyId: user.company_id,
        impersonatedBy: adminId
      },
      process.env.SECRET_KEY,
      { expiresIn: '1h' } // Short expiration for security
    );
    
    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      expiresIn: 3600, // 1 hour in seconds
      isImpersonation: true
    });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ 
      message: 'Failed to impersonate user',
      error: error.message 
    });
  }
});

/**
 * @desc    End impersonation session
 * @route   POST /api/admin/end-impersonation
 * @access  Admin impersonating a user
 */
router.post("/end-impersonation", authenticateToken, async (req, res) => {
  try {
    const { adminId } = req.user;
    
    if (!adminId || !req.user.impersonatedBy) {
      return res.status(400).json({ message: 'Not an impersonation session' });
    }
    
    // Get original admin details
    const adminQuery = `
      SELECT admin_id, email, company_id
      FROM admins
      WHERE admin_id = $1
    `;
    const adminResult = await pool.query(adminQuery, [adminId]);
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    const admin = adminResult.rows[0];
    
    // Create new token with admin credentials
    const token = jwt.sign(
      {
        adminId: admin.admin_id,
        role: 'Admin',
        companyId: admin.company_id
      },
      process.env.SECRET_KEY,
      { expiresIn: '15m' }
    );
    
    // Log the end of impersonation
    await pool.query(`
      INSERT INTO audit_logs (
        admin_id, user_id, action_type, ip_address, timestamp
      )
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      adminId,
      req.user.userId,
      'end_impersonation',
      req.ip
    ]);
    
    res.json({
      token,
      user: {
        id: admin.admin_id,
        email: admin.email,
        role: 'Admin',
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    res.status(500).json({ 
      message: 'Failed to end impersonation',
      error: error.message 
    });
  }
});

/**
 * @desc    Get reports for admin
 * @route   GET /api/admin/reports
 * @access  Admin
 */
router.get('/reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const reportsQuery = `
      SELECT r.*, u.name as author_name
      FROM reports r
      LEFT JOIN users u ON r.author_id = u.user_id
      WHERE r.recipient = 'admin'
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(reportsQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @desc    Process report feedback (approve/reject)
 * @route   PUT /api/admin/reports/:reportId
 * @access  Admin
 */
router.put('/reports/:reportId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, feedback } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
    }
    
    const updateQuery = `
      UPDATE reports
      SET status = $1, feedback = $2
      WHERE report_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, feedback || null, reportId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'report_processed',
      actionDetails: `Report ${reportId} ${status} with feedback: ${feedback || 'None'}`
    });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({ error: 'Failed to process report' });
  }
});

/**
 * Helper function to create default roles for a new company
 */
async function createDefaultRoles(companyId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create Admin role
    const adminRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Admin', 'Administrator with full access', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const adminRoleId = adminRoleResult.rows[0].role_id;
    
    // Add all permissions to Admin role
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'create_projects'),
       ($1, 'edit_projects'),
       ($1, 'delete_projects'),
       ($1, 'assign_tasks'),
       ($1, 'view_reports'),
       ($1, 'export_data'),
       ($1, 'manage_users'),
       ($1, 'manage_teams'),
       ($1, 'view_analytics'),
       ($1, 'schedule_meetings'),
       ($1, 'upload_files'),
       ($1, 'manage_roles'),
       ($1, 'system_settings')`,
      [adminRoleId]
    );
    
    // Create Manager role
    const managerRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Manager', 'Project manager with team access', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const managerRoleId = managerRoleResult.rows[0].role_id;
    
    // Add manager permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'create_projects'),
       ($1, 'edit_projects'),
       ($1, 'assign_tasks'),
       ($1, 'view_reports'),
       ($1, 'manage_teams'),
       ($1, 'schedule_meetings'),
       ($1, 'upload_files')`,
      [managerRoleId]
    );
    
    // Create Member role
    const memberRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Member', 'Regular team member', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const memberRoleId = memberRoleResult.rows[0].role_id;
    
    // Add member permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'upload_files')`,
      [memberRoleId]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating default roles:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get all projects with detailed stats
// Get all projects with detailed stats - renamed to avoid route conflict
router.get('/projects-stats', authenticateToken, isAdmin, cache(300), async (req, res) => {
  try {
    const projectsQuery = `
      SELECT 
        p.*,
        COUNT(DISTINCT t.task_id) as task_count,
        COUNT(DISTINCT pm.user_id) as team_member_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks,
        (SELECT first_name || ' ' || last_name FROM admins WHERE admin_id = p.owner_id) as owner_name
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.owner_id IN (
        SELECT admin_id FROM admins WHERE company_id = $1
      )
      GROUP BY p.project_id, p.owner_id
      ORDER BY p.created_at DESC
    `;

    const projects = await pool.query(projectsQuery, [req.user.companyId]);
    res.json(projects.rows);
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users with activity stats
router.get('/users', cache(300), async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT 
        u.*,
        COUNT(DISTINCT t.id) as assigned_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT al.id) as total_activities,
        MAX(al.timestamp) as last_activity
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assignee_id
      LEFT JOIN activity_logs al ON u.id = al.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(users.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Run security scan
router.post('/security-scan', async (req, res) => {
  try {
    const scanResults = await pool.query(`
      SELECT 
        COUNT(*) as total_threats,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as threats_24h
      FROM security_threats
    `);

    // Check for suspicious activities
    const suspiciousActivities = await pool.query(`
      SELECT 
        COUNT(*) as suspicious_activities
      FROM audit_logs
      WHERE 
        action_type IN ('failed_login', 'unauthorized_access', 'rate_limit_exceeded')
        AND timestamp > NOW() - INTERVAL '24 hours'
    `);

    // Check for outdated dependencies
    const outdatedDependencies = await pool.query(`
      SELECT 
        COUNT(*) as outdated_dependencies
      FROM system_dependencies
      WHERE is_outdated = true
    `);

    res.json({
      ...scanResults.rows[0],
      ...suspiciousActivities.rows[0],
      ...outdatedDependencies.rows[0],
      scan_timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running security scan:', error);
    res.status(500).json({ error: 'Failed to run security scan' });
  }
});

// Get security threats
router.get('/security-threats', cache(300), async (req, res) => {
  try {
    const threats = await pool.query(`
      SELECT 
        st.*,
        u.first_name,
        u.last_name
      FROM security_threats st
      LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
      LIMIT 100
    `);
    res.json(threats.rows);
  } catch (error) {
    console.error('Error fetching security threats:', error);
    res.status(500).json({ error: 'Failed to fetch security threats' });
  }
});

// Get system health
router.get('/system-health', cache(300), async (req, res) => {
  try {
    const health = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM pg_stat_activity) as active_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_queries
    `);
    res.json(health.rows[0]);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

export default router;