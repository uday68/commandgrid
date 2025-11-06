import { pool } from '../Config/database.js';
import { logger } from './logger.js';
import { logActivity } from './activityLogger.js';

/**
 * Create a new team
 * @param {Object} params
 * @param {string} params.name - Team name
 * @param {string} params.creatorId - Creator's user ID
 * @param {string} [params.description] - Team description
 * @returns {Promise<Object>} Created team
 */
export const createTeam = async ({ name, creatorId, description = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create team
    const teamResult = await client.query(
      `INSERT INTO teams (name, description, created_by, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [name, description, creatorId]
    );

    const team = teamResult.rows[0];

    // Add creator as team admin
    await client.query(
      `INSERT INTO team_members (team_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [team.id, creatorId]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: creatorId,
      action: 'create_team',
      details: { teamId: team.id, teamName: name }
    });

    return team;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create team:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Add member to team
 * @param {Object} params
 * @param {string} params.teamId - Team ID
 * @param {string} params.userId - User ID to add
 * @param {string} params.role - Member role
 * @param {string} params.addedBy - ID of user adding the member
 * @returns {Promise<Object>} Team member record
 */
export const addTeamMember = async ({ teamId, userId, role, addedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user is already a member
    const existingMember = await client.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (existingMember.rows[0]) {
      throw new Error('User is already a member of this team');
    }

    // Add member
    const result = await client.query(
      `INSERT INTO team_members (team_id, user_id, role, added_by, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [teamId, userId, role, addedBy]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: addedBy,
      action: 'add_team_member',
      details: { teamId, userId, role }
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to add team member:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Remove member from team
 * @param {Object} params
 * @param {string} params.teamId - Team ID
 * @param {string} params.userId - User ID to remove
 * @param {string} params.removedBy - ID of user removing the member
 * @returns {Promise<boolean>} Success status
 */
export const removeTeamMember = async ({ teamId, userId, removedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user is a member
    const memberResult = await client.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (!memberResult.rows[0]) {
      throw new Error('User is not a member of this team');
    }

    // Remove member
    await client.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: removedBy,
      action: 'remove_team_member',
      details: { teamId, userId }
    });

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to remove team member:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update team member role
 * @param {Object} params
 * @param {string} params.teamId - Team ID
 * @param {string} params.userId - User ID
 * @param {string} params.newRole - New role
 * @param {string} params.updatedBy - ID of user updating the role
 * @returns {Promise<Object>} Updated team member record
 */
export const updateTeamMemberRole = async ({ teamId, userId, newRole, updatedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update role
    const result = await client.query(
      `UPDATE team_members 
       SET role = $1, updated_at = NOW()
       WHERE team_id = $2 AND user_id = $3
       RETURNING *`,
      [newRole, teamId, userId]
    );

    if (!result.rows[0]) {
      throw new Error('User is not a member of this team');
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: updatedBy,
      action: 'update_team_member_role',
      details: { teamId, userId, newRole }
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to update team member role:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get team details
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team details with members
 */
export const getTeamDetails = async (teamId) => {
  try {
    const teamResult = await pool.query(
      `SELECT t.*, u.username as creator_name
       FROM teams t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [teamId]
    );

    if (!teamResult.rows[0]) {
      throw new Error('Team not found');
    }

    const team = teamResult.rows[0];

    // Get team members
    const membersResult = await pool.query(
      `SELECT tm.*, u.username, u.email
       FROM team_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );

    team.members = membersResult.rows;
    return team;
  } catch (error) {
    logger.error('Failed to get team details:', error);
    throw error;
  }
};

/**
 * Get user's teams
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of teams
 */
export const getUserTeams = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT t.*, tm.role as user_role
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to get user teams:', error);
    throw error;
  }
}; 