import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { logAudit } from '../../utils/logger.js';
import { cache } from '../../middleware/cache.js';

const router = express.Router();

/**
 * @desc    Get all chat rooms (Admin only)
 * @route   GET /api/admin/chat-rooms
 * @access  Admin
 */
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        cr.*,
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', crm.user_id,
              'name', u.name,
              'email', u.email,
              'role', crm.role,
              'joined_at', crm.joined_at
            )
          ) FILTER (WHERE crm.user_id IS NOT NULL), 
          '[]'::json
        ) as members
      FROM chat_rooms cr
      LEFT JOIN chat_room_members crm ON cr.room_id = crm.room_id
      LEFT JOIN users u ON crm.user_id = u.id
      WHERE cr.company_id = $1
      GROUP BY cr.room_id
      ORDER BY cr.created_at DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    res.json({
      success: true,
      rooms: result.rows
    });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms'
    });
  }
});

/**
 * @desc    Create new chat room
 * @route   POST /api/admin/chat-rooms
 * @access  Admin
 */
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { name, description, type, projectId, teamId, isPrivate } = req.body;
    const companyId = req.user.companyId;
    const createdBy = req.user.userId || req.user.adminId;
    
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    // Create the chat room
    const insertRoomQuery = `
      INSERT INTO chat_rooms (
        name, description, type, project_id, team_id, 
        is_private, company_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const roomResult = await client.query(insertRoomQuery, [
      name, description, type, projectId || null, teamId || null,
      isPrivate || false, companyId, createdBy
    ]);
    
    const room = roomResult.rows[0];
    
    // Add creator as admin member
    const insertMemberQuery = `
      INSERT INTO chat_room_members (room_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `;
    
    await client.query(insertMemberQuery, [room.room_id, createdBy]);
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.userId || req.user.adminId, 'CREATE_CHAT_ROOM', {
      roomId: room.room_id,
      roomName: name,
      type
    });
    
    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      room
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room'
    });
  } finally {
    client.release();
  }
});

/**
 * @desc    Delete chat room
 * @route   DELETE /api/admin/chat-rooms/:roomId
 * @access  Admin
 */
router.delete('/:roomId', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { roomId } = req.params;
    const companyId = req.user.companyId;
    
    // Check if room exists and belongs to company
    const checkRoomQuery = `
      SELECT * FROM chat_rooms 
      WHERE room_id = $1 AND company_id = $2
    `;
    
    const roomCheck = await client.query(checkRoomQuery, [roomId, companyId]);
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Delete room members first (foreign key constraint)
    await client.query('DELETE FROM chat_room_members WHERE room_id = $1', [roomId]);
    
    // Delete chat messages
    await client.query('DELETE FROM chat_messages WHERE room_id = $1', [roomId]);
    
    // Delete the room
    await client.query('DELETE FROM chat_rooms WHERE room_id = $1', [roomId]);
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.userId || req.user.adminId, 'DELETE_CHAT_ROOM', {
      roomId,
      roomName: roomCheck.rows[0].name
    });
    
    res.json({
      success: true,
      message: 'Chat room deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat room'
    });
  } finally {
    client.release();
  }
});

/**
 * @desc    Add users to chat room
 * @route   POST /api/admin/chat-rooms/:roomId/users
 * @access  Admin
 */
router.post('/:roomId/users', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { roomId } = req.params;
    const { userIds } = req.body;
    const companyId = req.user.companyId;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }
    
    // Check if room exists and belongs to company
    const checkRoomQuery = `
      SELECT * FROM chat_rooms 
      WHERE room_id = $1 AND company_id = $2
    `;
    
    const roomCheck = await client.query(checkRoomQuery, [roomId, companyId]);
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Add users to room (ignore duplicates)
    const insertMembersQuery = `
      INSERT INTO chat_room_members (room_id, user_id, role)
      SELECT $1, unnest($2::uuid[]), 'member'
      ON CONFLICT (room_id, user_id) DO NOTHING
    `;
    
    await client.query(insertMembersQuery, [roomId, userIds]);
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.userId || req.user.adminId, 'ADD_USERS_TO_CHAT_ROOM', {
      roomId,
      userIds,
      roomName: roomCheck.rows[0].name
    });
    
    res.json({
      success: true,
      message: 'Users added to chat room successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding users to chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add users to chat room'
    });
  } finally {
    client.release();
  }
});

/**
 * @desc    Remove user from chat room
 * @route   DELETE /api/admin/chat-rooms/:roomId/users/:userId
 * @access  Admin
 */
router.delete('/:roomId/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const companyId = req.user.companyId;
    
    // Check if room exists and belongs to company
    const checkRoomQuery = `
      SELECT * FROM chat_rooms 
      WHERE room_id = $1 AND company_id = $2
    `;
    
    const roomCheck = await pool.query(checkRoomQuery, [roomId, companyId]);
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Remove user from room
    const result = await pool.query(
      'DELETE FROM chat_room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in chat room'
      });
    }
    
    // Log audit
    await logAudit(req.user.userId || req.user.adminId, 'REMOVE_USER_FROM_CHAT_ROOM', {
      roomId,
      userId,
      roomName: roomCheck.rows[0].name
    });
    
    res.json({
      success: true,
      message: 'User removed from chat room successfully'
    });
    
  } catch (error) {
    console.error('Error removing user from chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user from chat room'
    });
  }
});

export default router;
