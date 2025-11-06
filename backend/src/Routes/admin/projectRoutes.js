import express from 'express';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { pool } from '../../Config/database.js';

const router = express.Router();

// Admin: Get all projects across company
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        p.*,
        a.first_name || ' ' || a.last_name AS admin_owner,
        COUNT(t.task_id) AS task_count,
        COUNT(pm.user_id) AS member_count
      FROM projects p
      LEFT JOIN admins a ON p.owner_id = a.admin_id
      LEFT JOIN tasks t ON p.project_id = t.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.company_id = $1
      GROUP BY p.project_id, a.first_name, a.last_name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [companyId]);
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Admin project fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Create new project
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      budget,
      start_date,
      end_date,
      status,
      assigned_team_ids = []
    } = req.body;

    const companyId = req.user.companyId;
    const adminId = req.user.adminId;

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create project
      const projectQuery = `
        INSERT INTO projects (
          name, description, budget, start_date, end_date, status,
          company_id, owner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const projectValues = [
        name,
        description,
        budget,
        start_date,
        end_date,
        status || 'pending',
        companyId,
        adminId
      ];

      const projectResult = await client.query(projectQuery, projectValues);
      const project = projectResult.rows[0];
      console.log('created project:',projectResult);

      // Add assigned teams if specified
      if (assigned_team_ids.length > 0) {
        await client.query(
          `INSERT INTO project_teams (project_id, team_id)
           SELECT $1, unnest($2::uuid[])`,
          [project.project_id, assigned_team_ids]
        );
      }      const user_id = req.user.userId || req.user.adminId;
      console.log('user_id:',user_id);
      
      // Check for valid roles from check constraint to avoid constraint violation
      const roleConstraintQuery = await client.query(`
        SELECT pg_get_constraintdef(oid) as constraint_def
        FROM pg_constraint
        WHERE conname = 'check_role'
      `);
      
      let roleToUse = 'Admin'; // Default role
      if (roleConstraintQuery.rows.length > 0) {
        const constraintDef = roleConstraintQuery.rows[0].constraint_def;
        // Extract roles from constraint like CHECK ((role = ANY (ARRAY['Admin'::text, 'Member'::text])))
        const rolesMatch = constraintDef.match(/ARRAY\[(.*?)\]/);
        if (rolesMatch && rolesMatch[1]) {
          const validRoles = rolesMatch[1].split(',')
            .map(role => role.trim().replace(/'(.+?)'::.+/, '$1'));
          
          // Try to find 'Project Manager' or 'Admin' in the valid roles
          roleToUse = validRoles.find(r => r === 'Project Manager') || 
                      validRoles.find(r => r === 'Admin') || 
                      validRoles[0]; // Use first available role as fallback
        }
      }
   
      // Add admin as project manager with the valid role
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role, is_admin)
         VALUES ($1, $2, $3, true)`,
        [project.project_id, project.owner_id || user_id, roleToUse]
      );

      await client.query('COMMIT');
      res.status(201).json({ project });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin project creation error:', error);
    res.status(500).json({ error: 'Project creation failed' });
  }
});

// Admin: Get project details
router.get('/:projectId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;

    const projectQuery = `
      SELECT 
        p.*,
        a.first_name || ' ' || a.last_name AS admin_owner,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.project_id) AS task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.project_id) AS member_count
      FROM projects p
      LEFT JOIN admins a ON p.owner_id = a.admin_id
      WHERE p.project_id = $1 AND p.company_id = $2
    `;

    const membersQuery = `
      SELECT 
        pm.user_id,
        COALESCE(u.name, a.first_name || ' ' || a.last_name) AS name,
        COALESCE(u.email, a.email) AS email,
        pm.role,
        pm.is_admin
      FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.user_id
      LEFT JOIN admins a ON pm.user_id = a.admin_id
      WHERE pm.project_id = $1
    `;

    const teamsQuery = `
      SELECT t.team_id, t.name 
      FROM project_teams pt
      JOIN teams t ON pt.team_id = t.team_id
      WHERE pt.project_id = $1
    `;

    const [projectResult, membersResult, teamsResult] = await Promise.all([
      pool.query(projectQuery, [projectId, companyId]),
      pool.query(membersQuery, [projectId]),
      pool.query(teamsQuery, [projectId])
    ]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      project: projectResult.rows[0],
      members: membersResult.rows,
      teams: teamsResult.rows
    });
  } catch (error) {
    console.error('Admin project details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update project
router.put('/:projectId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    const companyId = req.user.companyId;

    // Verify project exists and belongs to company
    const verifyQuery = `
      SELECT 1 FROM projects 
      WHERE project_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [projectId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const addField = (field, value) => {
      if (value !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    };

    addField('name', updates.name);
    addField('description', updates.description);
    addField('budget', updates.budget);
    addField('start_date', updates.start_date);
    addField('end_date', updates.end_date);
    addField('status', updates.status);
    addField('updated_at', new Date());

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const query = `
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE project_id = $${paramCount}
      RETURNING *
    `;
    values.push(projectId);

    const result = await pool.query(query, values);
    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Admin project update error:', error);
    res.status(500).json({ error: 'Project update failed' });
  }
});

// Admin: Archive project
router.patch('/:projectId/archive', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;

    const query = `
      UPDATE projects
      SET status = 'archived', updated_at = NOW()
      WHERE project_id = $1 AND company_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [projectId, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Admin project archive error:', error);
    res.status(500).json({ error: 'Project archive failed' });
  }
});

// Admin: Delete project
router.delete('/:projectId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;

    // Verify project exists and belongs to company
    const verifyQuery = `
      SELECT 1 FROM projects 
      WHERE project_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [projectId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete dependent records first
      await client.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM project_teams WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM project_files WHERE project_id = $1', [projectId]);

      // Then delete the project
      await client.query('DELETE FROM projects WHERE project_id = $1', [projectId]);

      await client.query('COMMIT');
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin project deletion error:', error);
    res.status(500).json({ error: 'Project deletion failed' });
  }
});

// Admin: Get project members
router.get('/:projectId/members', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;

    // Verify project belongs to company
    const verifyQuery = `
      SELECT 1 FROM projects 
      WHERE project_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [projectId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const query = `
      SELECT 
        pm.user_id,
        COALESCE(u.name, a.first_name || ' ' || a.last_name) AS name,
        COALESCE(u.email, a.email) AS email,
        pm.role,
        pm.is_admin
      FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.user_id AND u.company_id = $2
      LEFT JOIN admins a ON pm.user_id = a.admin_id AND a.company_id = $2
      WHERE pm.project_id = $1
    `;

    const result = await pool.query(query, [projectId, companyId]);
    res.json({ members: result.rows });
  } catch (error) {
    console.error('Admin project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Add members to project
router.post('/:projectId/members', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { members } = req.body; // Array of { user_id, role }
    const companyId = req.user.companyId;

    // Verify project belongs to company
    const verifyQuery = `
      SELECT 1 FROM projects 
      WHERE project_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [projectId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Add each member
      for (const member of members) {
        // Verify user belongs to company
        const userQuery = `
          SELECT 1 FROM users 
          WHERE user_id = $1 AND company_id = $2
          UNION
          SELECT 1 FROM admins
          WHERE admin_id = $1 AND company_id = $2
        `;
        const userResult = await client.query(userQuery, [member.user_id, companyId]);
        
        if (userResult.rows.length === 0) {
          throw new Error(`User ${member.user_id} not found in company`);
        }

        await client.query(
          `INSERT INTO project_members (project_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (project_id, user_id) DO UPDATE
           SET role = EXCLUDED.role`,
          [projectId, member.user_id, member.role || 'Member']
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Members added successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin add members error:', error);
    res.status(500).json({ 
      error: 'Failed to add members',
      details: error.message 
    });
  }
});

export default router;