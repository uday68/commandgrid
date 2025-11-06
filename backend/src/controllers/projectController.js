import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Get project manager for a specific project
 */
export const getProjectManager = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info(`Controller: Fetching project manager for project ID: ${projectId}`);
    
    if (!projectId) {
      logger.warn('Project ID is missing in request');
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Check if project exists
    const projectCheck = await pool.query(
      `SELECT * FROM projects WHERE project_id = $1`,
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      logger.warn(`Project not found with ID: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // First check if there's a designated project manager in project_members
    const managerQuery = `
      SELECT 
        pm.user_id,
        COALESCE(u.name, a.first_name || ' ' || a.last_name) as name,
        COALESCE(u.email, a.email) as email,
        COALESCE(u.profile_picture, a.profile_picture) as profile_picture,
        'Project Manager' as role
      FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.user_id
      LEFT JOIN admins a ON pm.user_id = a.admin_id
      WHERE pm.project_id = $1 AND (
        LOWER(pm.role) LIKE LOWER('%manager%') OR 
        LOWER(pm.role) LIKE LOWER('%admin%')
      )
      LIMIT 1
    `;
    
    let result = await pool.query(managerQuery, [projectId]);
    logger.info(`Manager query result count: ${result.rows.length}`);
    
    // If no designated project manager, return the project owner
    if (result.rows.length === 0) {
      logger.info(`No designated manager found, looking for project owner`);
      const ownerQuery = `
        SELECT 
          p.owner_id as user_id,
          COALESCE(u.name, a.first_name || ' ' || a.last_name) as name,
          COALESCE(u.email, a.email) as email,
          COALESCE(u.profile_picture, a.profile_picture) as profile_picture,
          'Project Owner' as role
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.user_id
        LEFT JOIN admins a ON p.owner_id = a.admin_id
        WHERE p.project_id = $1
        LIMIT 1
      `;
      
      result = await pool.query(ownerQuery, [projectId]);
      logger.info(`Owner query result count: ${result.rows.length}`);
    }
    
    if (result.rows.length === 0) {
      // Return a default response instead of error to avoid 404
      logger.info(`No manager or owner found, returning default response`);
      return res.json({
        user_id: null,
        name: "Unassigned",
        email: "",
        profile_picture: null,
        role: "Unassigned"
      });
    }
    
    logger.info(`Successfully returning manager for project ${projectId}`);
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Error in getProjectManager: ${error.message}`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get project members for a specific project
 */
export const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info(`Controller: Fetching project members for project ID: ${projectId}`);
    
    if (!projectId) {
      logger.warn('Project ID is missing in request');
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Check if project exists
    const projectCheck = await pool.query(
      `SELECT * FROM projects WHERE project_id = $1`,
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      logger.warn(`Project not found with ID: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all project members including both users and admins
    const query = `
      SELECT 
        pm.user_id,
        COALESCE(u.name, a.first_name || ' ' || a.last_name) as name,
        COALESCE(u.email, a.email) as email,
        COALESCE(u.profile_picture, a.profile_picture) as profile_picture,
        pm.role
      FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.user_id
      LEFT JOIN admins a ON pm.user_id = a.admin_id
      WHERE pm.project_id = $1
    `;
    
    const result = await pool.query(query, [projectId]);
    logger.info(`Found ${result.rows.length} members for project ${projectId}`);
    
    return res.json(result.rows);
  } catch (error) {
    logger.error(`Error in getProjectMembers: ${error.message}`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
