import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../Config/database.js';

const router = express.Router();

// Get all team members
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    // Get all teams for the company
    const teamsQuery = `
      SELECT team_id FROM teams WHERE company_id = $1 OR created_by = $2
    `;
    
    const teamsResult = await pool.query(teamsQuery, [companyId, userId]);
    const teamIds = teamsResult.rows.map(team => team.team_id);
    
    if (teamIds.length === 0) {
      return res.json({ members: [] });
    }
    
    const query = `
      SELECT 
        tm.*, u.name, u.email, u.role, u.profile_picture_url as avatar_url
      FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.team_id = ANY($1::uuid[])
      ORDER BY u.name
    `;
    
    const result = await pool.query(query, [teamIds]);
    res.json({ members: result.rows });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get team members (alias for root endpoint)
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.query.companyId || req.user.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // Get all teams for the company
    const teamsQuery = `
      SELECT team_id FROM teams WHERE company_id = $1 OR created_by = $2
    `;
    
    const teamsResult = await pool.query(teamsQuery, [companyId, userId]);
    const teamIds = teamsResult.rows.map(team => team.team_id);
    
    if (teamIds.length === 0) {
      return res.json({ members: [] });
    }
    
    const query = `
      SELECT 
        tm.*, u.name, u.email, u.role, u.profile_picture_url as avatar_url,
        t.name as team_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id
      JOIN teams t ON tm.team_id = t.team_id
      WHERE tm.team_id = ANY($1::uuid[])
      ORDER BY u.name
    `;
    
    const result = await pool.query(query, [teamIds]);
    res.json({ 
      success: true,
      members: result.rows 
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get team member count
router.get('/count', authenticateToken, async (req, res) => {  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    // Get all teams for the company
    const teamsQuery = `
      SELECT team_id FROM teams WHERE company_id = $1 OR created_by = $2
    `;
    
    const teamsResult = await pool.query(teamsQuery, [companyId, userId]);
    const teamIds = teamsResult.rows.map(team => team.team_id);
    
    if (teamIds.length === 0) {
      return res.json({ count: 0 });
    }
    
    const query = `
      SELECT COUNT(*) as count
      FROM team_members 
      WHERE team_id = ANY($1::uuid[])
    `;
    
    const result = await pool.query(query, [teamIds]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error counting team members:', error);
    res.status(500).json({ error: 'Failed to count team members' });
  }
});

// Get team member by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    // Get all teams for the company
    const teamsQuery = `
      SELECT team_id FROM teams WHERE company_id = $1 OR created_by = $2
    `;
    
    const teamsResult = await pool.query(teamsQuery, [companyId, req.user.userId]);
    const teamIds = teamsResult.rows.map(team => team.team_id);
    
    if (teamIds.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    const query = `
      SELECT 
        tm.*, u.name, u.email, u.role, u.profile_picture_url as avatar_url
      FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.user_id = $1 AND tm.team_id = ANY($2::uuid[])
    `;
    
    const result = await pool.query(query, [id, teamIds]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

export default router;
