import { pool } from '../Config/database.js';
import pkgs from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = pkgs;

class MeetingController {  // Get all meetings
  async getAllMeetings(req, res) {
    try {
      const userId = req.user.userId;
      console.log('Fetching meetings for user:', userId);
      
      const query = `
        SELECT 
          m.*,
          host.name as host_name,
          COUNT(DISTINCT mp.user_id) as participant_count
        FROM meetings m
        LEFT JOIN users host ON m.created_by = host.user_id
        LEFT JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
        WHERE m.created_by = $1 OR mp.user_id = $1
        GROUP BY m.meeting_id, host.name
        ORDER BY m.meeting_date DESC, m.meeting_time DESC
      `;
      
      const result = await pool.query(query, [userId]);
      console.log(`Found ${result.rows.length} meetings for user ${userId}`);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  }  // Get meeting by ID
  async getMeetingById(req, res) {
    try {
      const { id } = req.params;
        const query = `
        SELECT 
          m.*,
          CASE 
            WHEN u.name IS NOT NULL THEN u.name
            WHEN a.first_name IS NOT NULL THEN CONCAT(a.first_name, ' ', a.last_name)
            ELSE 'Unknown User'
          END as host_name,
          (
            SELECT COUNT(DISTINCT mp.user_id) 
            FROM meeting_participants mp 
            WHERE mp.meeting_id = m.meeting_id
          ) as participant_count
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN admins a ON m.created_by = a.admin_id
        WHERE m.meeting_id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      res.status(500).json({ error: 'Failed to fetch meeting' });
    }
  }// Create new meeting
  async createMeeting(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, meeting_date, meeting_time, agenda, meeting_context } = req.body;
      
      // Validate required fields
      if (!title || !title.trim()) {
        return res.status(400).json({ 
          error: 'Title is required',
          message: 'Meeting title cannot be empty' 
        });
      }
      
      // Set default values for date and time if not provided
      const meetingDate = meeting_date || new Date().toISOString().split('T')[0];
      const meetingTime = meeting_time || new Date().toTimeString().split(' ')[0].substring(0, 5);
        const query = `
        INSERT INTO meetings (meeting_id, title, meeting_date, meeting_time, agenda, meeting_context, created_by, timezone)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        title.trim(),
        meetingDate,
        meetingTime,
        agenda || description || '',
        meeting_context || 'company',
        userId,
        'UTC' // Default timezone
      ]);        // Add host as participant - handle both users and admins
      // Use the database function to validate user/admin existence
      const validUserCheck = await pool.query('SELECT is_valid_user_or_admin($1) as is_valid', [userId]);
      
      if (!validUserCheck.rows[0].is_valid) {
        console.error('Creator does not exist in users or admins table:', userId);
        return res.status(400).json({
          error: 'Invalid creator ID',
          message: 'Creator must be a valid user or admin'
        });
      }
      
      // Insert participant record
      await pool.query(
        'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1, $2)',
        [result.rows[0].meeting_id, userId]
      );
      
      res.status(201).json({
        message: 'Meeting created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      res.status(500).json({ 
        error: 'Failed to create meeting',
        message: error.message || 'Internal server error'
      });
    }
  }
  // Update meeting
  async updateMeeting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, meeting_date, meeting_time, agenda, meeting_context } = req.body;
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only participants can update the meeting' });
      }
      
      const query = `
        UPDATE meetings
        SET title = $1, meeting_date = $2, meeting_time = $3, agenda = $4, meeting_context = $5
        WHERE meeting_id = $6
        RETURNING *
      `;
        const result = await pool.query(query, [
        title,
        meeting_date,
        meeting_time,
        agenda,
        meeting_context,
        id
      ]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating meeting:', error);
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  }

  // Delete meeting
  async deleteMeeting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // Check if user is the host
      const hostCheck = await pool.query(
        'SELECT created_by FROM meetings WHERE meeting_id = $1',
        [id]
      );
      
      if (hostCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      if (hostCheck.rows[0].created_by !== userId) {
        return res.status(403).json({ error: 'Only the host can delete the meeting' });
      }
      
      // Delete participants first
      await pool.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [id]);
      
      // Delete meeting
      await pool.query('DELETE FROM meetings WHERE meeting_id = $1', [id]);
      
      res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      res.status(500).json({ error: 'Failed to delete meeting' });
    }
  }

  // Join meeting
  async joinMeeting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // Check if meeting exists
      const meetingCheck = await pool.query(
        'SELECT * FROM meetings WHERE meeting_id = $1',
        [id]
      );
      
      if (meetingCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      // Add user as participant
      await pool.query(
        'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, userId]
      );
      
      res.json({ message: 'Joined meeting successfully' });
    } catch (error) {
      console.error('Error joining meeting:', error);
      res.status(500).json({ error: 'Failed to join meeting' });
    }
  }

  // Leave meeting
  async leaveMeeting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      await pool.query(
        'DELETE FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      res.json({ message: 'Left meeting successfully' });
    } catch (error) {
      console.error('Error leaving meeting:', error);
      res.status(500).json({ error: 'Failed to leave meeting' });
    }
  }
  // Get meeting participants
  async getMeetingParticipants(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          COALESCE(u.user_id, a.admin_id) as user_id,
          COALESCE(u.name, CONCAT(a.first_name, ' ', a.last_name)) as name,
          COALESCE(u.email, a.email) as email,
          COALESCE(u.profile_picture, '') as profile_picture
        FROM meeting_participants mp
        LEFT JOIN users u ON mp.user_id = u.user_id
        LEFT JOIN admins a ON mp.user_id = a.admin_id
        WHERE mp.meeting_id = $1
        ORDER BY name
      `;
      
      const result = await pool.query(query, [id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching participants:', error);
      res.status(500).json({ error: 'Failed to fetch participants' });
    }
  }
  
  // Get meetings count
  async getMeetingsCount(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get date filter from query params if available
      const dateFilter = req.query.date;
      let dateCondition = '';
      let params = [userId];
      let paramIndex = 2;
      
      // Handle date filters - could be a single value or array of values
      if (dateFilter) {
        // Convert to array if it's not already
        const dateFilters = Array.isArray(dateFilter) ? dateFilter : [dateFilter];
        
        // Process each date filter
        dateFilters.forEach(filter => {
          const filterStr = String(filter);
          
          if (filterStr.startsWith('gte.')) {
            // Handle greater than or equal date filtering
            const dateValue = filterStr.substring(4); // Remove 'gte.' prefix
            dateCondition += ` AND m.meeting_date >= $${paramIndex}`;
            params.push(dateValue);
            paramIndex++;
          } else if (filterStr.startsWith('lt.')) {
            // Handle less than date filtering
            const dateValue = filterStr.substring(3); // Remove 'lt.' prefix
            dateCondition += ` AND m.meeting_date < $${paramIndex}`;
            params.push(dateValue);
            paramIndex++;
          } else {
            // Exact date match
            dateCondition += ` AND m.meeting_date = $${paramIndex}`;
            params.push(filterStr);
            paramIndex++;
          }
        });
      }
      
      const querys = `
        SELECT COUNT(DISTINCT m.meeting_id) as count
        FROM meetings m
        JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
        WHERE mp.user_id = $1 ${dateCondition}
      `;
      
      const result = await pool.query(querys, params);
      res.json({ count: parseInt(result.rows[0].count) || 0 });
    } catch (error) {
      console.error('Error counting meetings:', error);
      res.status(500).json({ error: 'Failed to count meetings' });
    }
  }

  // Add participants to meeting
  async addParticipants(req, res) {
    try {
      const { id } = req.params;
      const { participants } = req.body;
      
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ error: 'Participants array is required' });
      }
      
      // Check if meeting exists
      const meetingCheck = await pool.query(
        'SELECT * FROM meetings WHERE meeting_id = $1',
        [id]
      );
      
      if (meetingCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      // Validate all participants exist using the database function
      const validationPromises = participants.map(async (participantId) => {
        const validCheck = await pool.query('SELECT is_valid_user_or_admin($1) as is_valid', [participantId]);
        return { participantId, isValid: validCheck.rows[0].is_valid };
      });
      
      const validationResults = await Promise.all(validationPromises);
      const invalidParticipants = validationResults.filter(result => !result.isValid);
      
      if (invalidParticipants.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid participant IDs', 
          invalid: invalidParticipants.map(p => p.participantId)
        });
      }
      
      // Add participants (using ON CONFLICT DO NOTHING to avoid duplicates)
      const insertQuery = `
        INSERT INTO meeting_participants (meeting_id, user_id) 
        VALUES ${participants.map((_, i) => `($1, $${i + 2})`).join(',')}
        ON CONFLICT (meeting_id, user_id) DO NOTHING
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [id, ...participants]);
      
      res.status(201).json({
        message: 'Participants added successfully',
        added: result.rows.length,
        participants: result.rows
      });
    } catch (error) {      console.error('Error adding participants:', error);
      res.status(500).json({ error: 'Failed to add participants' });
    }
  }

  // Generate Agora token for video call
  async generateAgoraToken(req, res) {
    try {
      const { channelName, uid } = req.body;
      const userId = req.user.userId;

      // Validate required fields
      if (!channelName || uid === undefined) {
        return res.status(400).json({ 
          error: 'Channel name and UID are required' 
        });
      }

      // Check if user has access to this meeting
      const meetingCheck = await pool.query(
        'SELECT meeting_id FROM meetings WHERE meeting_id = $1',
        [channelName]
      );

      if (meetingCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;

      if (!appId || !appCertificate) {
        console.error('Agora credentials not configured');
        return res.status(500).json({ 
          error: 'Video service not configured' 
        });
      }

      // Token expires in 24 hours
      const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      
      // Generate token with publisher role
      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        expirationTimeInSeconds
      );

      res.json({
        token,
        appId,
        channelName,
        uid,
        expiresAt: expirationTimeInSeconds
      });

    } catch (error) {
      console.error('Error generating Agora token:', error);
      res.status(500).json({ 
        error: 'Failed to generate video call token',
        message: error.message 
      });
    }
  }
}

export default new MeetingController();
