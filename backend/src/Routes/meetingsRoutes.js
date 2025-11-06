import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all meetings for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, status } = req.query;

    let query = `
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'user_id', p.user_id,
            'status', p.status,
            'user', json_build_object(
              'user_id', u.user_id,
              'name', u.name,
              'email', u.email,
              'profile_picture', u.profile_picture
            )
          )
        ) as participants
      FROM meetings m
      LEFT JOIN meeting_participants p ON m.meeting_id = p.meeting_id
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE m.created_by = $1
    `;

    const params = [userId];    if (date && typeof date === 'string') {
      if (date.startsWith('gte.')) {
        // Greater than or equal
        const dateValue = date.substring(4);
        query += ` AND m.meeting_date >= $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('lt.')) {
        // Less than
        const dateValue = date.substring(3);
        query += ` AND m.meeting_date < $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('lte.')) {
        // Less than or equal
        const dateValue = date.substring(4);
        query += ` AND m.meeting_date <= $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('gt.')) {
        // Greater than
        const dateValue = date.substring(3);
        query += ` AND m.meeting_date > $${params.length + 1}`;
        params.push(dateValue);
      } else {
        // Exact date match
        query += ` AND m.meeting_date = $${params.length + 1}`;
        params.push(date);
      }
    }

    if (status) {
      query += ` AND m.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` GROUP BY m.meeting_id ORDER BY m.meeting_date DESC, m.meeting_time ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get meeting count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.userId;

    let query = `
      SELECT COUNT(*) as count
      FROM meetings
      WHERE created_by = $1
    `;

    const params = [userId];

    if (date && typeof date === 'string') {
      if (date.startsWith('gte.')) {
        // Greater than or equal
        const dateValue = date.substring(4);
        query += ` AND meeting_date >= $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('lt.')) {
        // Less than
        const dateValue = date.substring(3);
        query += ` AND meeting_date < $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('lte.')) {
        // Less than or equal
        const dateValue = date.substring(4);
        query += ` AND meeting_date <= $${params.length + 1}`;
        params.push(dateValue);
      } else if (date.startsWith('gt.')) {
        // Greater than
        const dateValue = date.substring(3);
        query += ` AND meeting_date > $${params.length + 1}`;
        params.push(dateValue);
      } else {
        // Exact date match
        query += ` AND meeting_date = $${params.length + 1}`;
        params.push(date);
      }
    }

    const { rows } = await pool.query(query, params);
    res.json({ count: parseInt(rows[0].count) });
  } catch (error) {
    console.error('Error counting meetings:', error);
    res.status(500).json({ error: 'Failed to count meetings' });
  }
});

// Create a new meeting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      meeting_date,
      meeting_time,
      duration,
      is_recurring,
      recurring_pattern,
      is_public,
      project_id,
      team_id,
      meeting_link,
      agenda,
      company_id,
      meeting_context,
      created_user_role,
      file_id
    } = req.body;

    const meetingId = uuidv4();
    const userId = req.user.userId;

    const query = `
      INSERT INTO meetings (
        meeting_id,
        title,
        description,
        meeting_date,
        meeting_time,
        duration,
        is_recurring,
        recurring_pattern,
        is_public,
        project_id,
        team_id,
        created_by,
        meeting_link,
        agenda,
        company_id,
        meeting_context,
        created_user_role,
        file_id,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      RETURNING *
    `;

    const values = [
      meetingId,
      title,
      description,
      meeting_date,
      meeting_time,
      duration,
      is_recurring,
      recurring_pattern,
      is_public,
      project_id,
      team_id,
      userId,
      meeting_link,
      agenda,
      company_id,
      meeting_context,
      created_user_role,
      file_id,
      'scheduled'
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json({ meeting: rows[0] });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Add participants to a meeting
router.post('/:meetingId/participants', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { participants } = req.body;

    const query = `
      INSERT INTO meeting_participants (meeting_id, user_id, status)
      VALUES ${participants.map((_, i) => `($1, $${i + 2}, 'pending')`).join(',')}
      RETURNING *
    `;

    const values = [meetingId, ...participants];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows);
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: 'Failed to add participants' });
  }
});

// Delete a meeting
router.delete('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.userId;

    // Check if user is the creator of the meeting
    const checkQuery = 'SELECT created_by FROM meetings WHERE meeting_id = $1';
    const { rows } = await pool.query(checkQuery, [meetingId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this meeting' });
    }

    // Delete meeting participants first
    await pool.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [meetingId]);

    // Delete the meeting
    await pool.query('DELETE FROM meetings WHERE meeting_id = $1', [meetingId]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

export default router; 