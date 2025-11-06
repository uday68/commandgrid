import express from 'express';
import { pool } from '../Config/database.js';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      logger.error('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/reports/team - Get team reports
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const { companyId, userId, role } = req.user;
    
    logger.info('Fetching team reports', { userId, companyId, role });

    let query;
    let queryParams;

    if (role === 'Admin' || role === 'Project Manager') {
      // Admin and Project Manager can see all reports for their company
      query = `
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
          u.email as author_email
        FROM reports r
        LEFT JOIN users u ON r.author_id = u.user_id
        WHERE r.recipient = 'team' 
        AND u.company_id = $1
        ORDER BY r.created_at DESC
      `;
      queryParams = [companyId];
    } else {
      // Regular users can only see their own reports
      query = `
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
          u.email as author_email
        FROM reports r
        LEFT JOIN users u ON r.author_id = u.user_id
        WHERE r.recipient = 'team' 
        AND r.author_id = $1
        ORDER BY r.created_at DESC
      `;
      queryParams = [userId];
    }

    const result = await pool.query(query, queryParams);
    
    logger.info('Team reports fetched successfully', { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching team reports:', error);
    res.status(500).json({ error: 'Failed to fetch team reports' });
  }
});

// GET /api/reports/admin - Get admin reports
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const { companyId, userId, role } = req.user;
    
    logger.info('Fetching admin reports', { userId, companyId, role });

    if (role !== 'Admin' && role !== 'Project Manager') {
      return res.status(403).json({ error: 'Access denied. Admin or Project Manager role required.' });
    }

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
        u.email as author_email
      FROM reports r
      LEFT JOIN users u ON r.author_id = u.user_id
      WHERE r.recipient = 'admin' 
      AND u.company_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [companyId]);
    
    logger.info('Admin reports fetched successfully', { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching admin reports:', error);
    res.status(500).json({ error: 'Failed to fetch admin reports' });
  }
});

// GET /api/reports/history - Get user's report history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    
    logger.info('Fetching report history', { userId, companyId });

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
        r.recipient
      FROM reports r
      WHERE r.author_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    logger.info('Report history fetched successfully', { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching report history:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

// POST /api/reports - Create a new report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, content, description, recipient, attachment_url, file_path } = req.body;
    
    logger.info('Creating new report', { userId, title, recipient });

    // Validate required fields
    if (!title || !content || !recipient) {
      return res.status(400).json({ error: 'Title, content, and recipient are required' });
    }

    // Validate recipient
    if (!['admin', 'team'].includes(recipient)) {
      return res.status(400).json({ error: 'Recipient must be either "admin" or "team"' });
    }

    const query = `
      INSERT INTO reports (title, content, description, author_id, recipient, attachment_url, file_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING report_id, title, content, description, status, created_at, recipient
    `;

    const values = [title, content, description, userId, recipient, attachment_url, file_path];
    const result = await pool.query(query, values);
    
    logger.info('Report created successfully', { reportId: result.rows[0].report_id });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// PUT /api/reports/:id/status - Update report status (Admin/PM only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { role, companyId } = req.user;
    const { id } = req.params;
    const { status, feedback } = req.body;
    
    logger.info('Updating report status', { reportId: id, status, role });

    if (role !== 'Admin' && role !== 'Project Manager') {
      return res.status(403).json({ error: 'Access denied. Admin or Project Manager role required.' });
    }

    // Validate status
    if (!['pending', 'reviewed', 'approved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, reviewed, or approved' });
    }

    // Check if report exists and belongs to the same company
    const checkQuery = `
      SELECT r.report_id 
      FROM reports r
      LEFT JOIN users u ON r.author_id = u.user_id
      WHERE r.report_id = $1 AND u.company_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, companyId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updateQuery = `
      UPDATE reports 
      SET status = $1, feedback = $2
      WHERE report_id = $3
      RETURNING report_id, title, status, feedback, created_at
    `;

    const result = await pool.query(updateQuery, [status, feedback, id]);
    
    logger.info('Report status updated successfully', { reportId: id, status });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// GET /api/reports/:id - Get specific report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { userId, role, companyId } = req.user;
    const { id } = req.params;
    
    logger.info('Fetching specific report', { reportId: id, userId, role });

    let query;
    let queryParams;

    if (role === 'Admin' || role === 'Project Manager') {
      // Admin and PM can see any report in their company
      query = `
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
          u.email as author_email
        FROM reports r
        LEFT JOIN users u ON r.author_id = u.user_id
        WHERE r.report_id = $1 AND u.company_id = $2
      `;
      queryParams = [id, companyId];
    } else {
      // Regular users can only see their own reports
      query = `
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
          r.recipient
        FROM reports r
        WHERE r.report_id = $1 AND r.author_id = $2
      `;
      queryParams = [id, userId];
    }

    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    logger.info('Report fetched successfully', { reportId: id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// DELETE /api/reports/:id - Delete report (Author or Admin/PM only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { userId, role, companyId } = req.user;
    const { id } = req.params;
    
    logger.info('Deleting report', { reportId: id, userId, role });

    let query;
    let queryParams;

    if (role === 'Admin' || role === 'Project Manager') {
      // Admin and PM can delete any report in their company
      query = `
        DELETE FROM reports r
        USING users u
        WHERE r.report_id = $1 
        AND r.author_id = u.user_id 
        AND u.company_id = $2
        RETURNING r.report_id
      `;
      queryParams = [id, companyId];
    } else {
      // Regular users can only delete their own reports
      query = `
        DELETE FROM reports 
        WHERE report_id = $1 AND author_id = $2
        RETURNING report_id
      `;
      queryParams = [id, userId];
    }

    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }
    
    logger.info('Report deleted successfully', { reportId: id });
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
