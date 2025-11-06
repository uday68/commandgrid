import jwt from 'jsonwebtoken';
import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      logger.warn('No token provided in request');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const secret = process.env.SECRET_KEY || 'default_jwt_secret_key';
    logger.info('Using JWT secret:', secret ? 'Secret is set' : 'Using default secret');
      
    const decoded = jwt.verify(token, secret);
      // Ensure decoded has expected properties - handle both users and admins
    const userId = decoded.userId || decoded.adminId; // Use adminId if userId is not present
    const adminId = decoded.adminId;
    const role = decoded.role || 'User';
    const companyId = decoded.companyId;
    const isAdmin = decoded.isAdmin || role === 'Admin' || !!decoded.adminId;
    
    if (!userId && !adminId) {
      logger.warn('Invalid token: No user ID or admin ID');
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    logger.info('Token decoded successfully:', { userId, adminId, role, companyId, isAdmin });
    
    // Attach user info to request - include both userId and adminId for backward compatibility
    req.user = { 
      userId: userId || adminId, // For backward compatibility, always provide userId
      adminId, 
      role, 
      companyId, 
      isAdmin 
    };
    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware to check if user is team member
 */
export const isTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const checkRoleQuery = `SELECT role FROM USERS WHERE user_id = $1`;
    const roleCheck = await pool.query(checkRoleQuery, [userId]);
    
    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'Member') {
      logger.warn(`Access denied: User ${userId} is not a team member`);
      return res.status(403).json({ error: 'Access denied: Not a team member' });
    }
    
    next();
  } catch (error) {
    logger.error('Team member check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user is admin
 */
export const isAdmin = async (req, res, next) => {
  try {
    const { isAdmin, role } = req.user;
    
    if (!isAdmin && role !== 'Admin') {
      logger.warn('Access denied: User is not an admin');
      return res.status(403).json({ error: 'Access denied: Not an admin' });
    }
    
    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user is project manager
 */
export const isProjectManager = async (req, res, next) => {
  try {
    const { userId } = req.user;
    
    // Check user's role in project_members table
    let projectId = req.params.projectId || req.body.projectId;
    
    if (!projectId) {
      logger.warn('Project ID is missing in request');
      return res.status(400).json({ error: 'Project ID is required' });
    }
      const checkRoleQuery = `
      SELECT * FROM project_members 
      WHERE project_id = $1 AND user_id = $2 AND 
      (role ILIKE 'Project Manager' OR role ILIKE 'Admin' OR role = 'admin' OR role = 'ProjectManager')
    `;
    
    const roleCheck = await pool.query(checkRoleQuery, [projectId, userId]);
    
    if (roleCheck.rows.length === 0) {
      logger.warn(`Access denied: User ${userId} is not a project manager for project ${projectId}`);
      return res.status(403).json({ error: 'Access denied: Not a project manager for this project' });
    }
    
    next();
  } catch (error) {
    logger.error('Project manager check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};