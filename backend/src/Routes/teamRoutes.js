import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  createTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  getTeamDetails,
  getUserTeams
} from '../utils/teamManager.js';

const router = express.Router();

// Get all teams (for admin/project manager)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, companyId } = req.user;
    
    // Query to get all teams - handle cases where company_id might be null
    let query = `
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
      WHERE (t.status IS NULL OR t.status != 'deleted')
    `;
    
    const params = [];
    
    // If user has a company ID, filter by it
    if (companyId) {
      query += ` AND (t.company_id = $1 OR t.company_id IS NULL)`;
      params.push(companyId);
    }
    
    // If user is not admin/project manager, only show teams they're a member of
    if (role !== 'Admin' && role !== 'Project Manager') {
      if (params.length > 0) {
        query += ` AND EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = t.team_id AND tm2.user_id = $${params.length + 1})`;
        params.push(req.user.userId);
      } else {
        query += ` AND EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = t.team_id AND tm2.user_id = $1)`;
        params.push(req.user.userId);
      }
    }
    
    query += `
      GROUP BY t.team_id, t.name, t.description, t.created_at, t.status, p.project_id, p.name
      ORDER BY t.created_at DESC
    `;
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, teams: rows });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Create a new team
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const team = await createTeam({
      name,
      description,
      creatorId: req.user.id
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's teams
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const teams = await getUserTeams(req.user.id);
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team details
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const team = await getTeamDetails(req.params.teamId);
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to team
router.post('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const member = await addTeamMember({
      teamId: req.params.teamId,
      userId,
      role,
      addedBy: req.user.id
    });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from team
router.delete('/:teamId/members/:userId', authenticateToken, async (req, res) => {
  try {
    await removeTeamMember({
      teamId: req.params.teamId,
      userId: req.params.userId,
      removedBy: req.user.id
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team member role
router.patch('/:teamId/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { newRole } = req.body;
    const member = await updateTeamMemberRole({
      teamId: req.params.teamId,
      userId: req.params.userId,
      newRole,
      updatedBy: req.user.id
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 