import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { logAudit } from '../../utils/logger.js';
import { cache } from '../../middleware/cache.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all admin chat routes
router.use(apiLimiter);

/**
 * @desc    Get all chat rooms
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
              'user_id', u.id,
              'name', u.name,
              'role', u.role
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
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
 * @desc    Create a new chat room
 * @route   POST /api/admin/chat-rooms
 * @access  Admin
 */
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { name, description, type, projectId, teamId, isPrivate } = req.body;
    const companyId = req.user.companyId;
    const createdBy = req.user.userId;
    
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Room name and type are required'
      });
    }
    
    // Create the chat room
    const insertRoomQuery = `
      INSERT INTO chat_rooms (name, description, type, project_id, team_id, is_private, company_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const roomResult = await client.query(insertRoomQuery, [
      name, description, type, projectId, teamId, isPrivate, companyId, createdBy
    ]);
    
    const newRoom = roomResult.rows[0];
    
    // Add creator as a member
    const addMemberQuery = `
      INSERT INTO chat_room_members (room_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `;
    
    await client.query(addMemberQuery, [newRoom.room_id, createdBy]);
    
    await client.query('COMMIT');
    
    // Log the action
    await logAudit(createdBy, 'CREATE_CHAT_ROOM', `Created chat room: ${name}`, {
      roomId: newRoom.room_id,
      roomType: type
    });
    
    res.status(201).json({
      success: true,
      room: {
        ...newRoom,
        members: [{
          user_id: createdBy,
          name: req.user.name,
          role: 'admin'
        }]
      }
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
        message: 'User IDs are required'
      });
    }
    
    // Verify room exists and belongs to company
    const roomCheck = await client.query(
      'SELECT room_id FROM chat_rooms WHERE room_id = $1 AND company_id = $2',
      [roomId, companyId]
    );
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Add users to room (ignore duplicates)
    for (const userId of userIds) {
      const insertQuery = `
        INSERT INTO chat_room_members (room_id, user_id, role)
        VALUES ($1, $2, 'member')
        ON CONFLICT (room_id, user_id) DO NOTHING
      `;
      await client.query(insertQuery, [roomId, userId]);
    }
    
    await client.query('COMMIT');
    
    // Log the action
    await logAudit(req.user.userId, 'ADD_CHAT_ROOM_MEMBERS', `Added ${userIds.length} members to chat room`, {
      roomId,
      userIds
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
    
    // Verify room exists and belongs to company
    const roomCheck = await pool.query(
      'SELECT room_id FROM chat_rooms WHERE room_id = $1 AND company_id = $2',
      [roomId, companyId]
    );
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Remove user from room
    const deleteQuery = `
      DELETE FROM chat_room_members 
      WHERE room_id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(deleteQuery, [roomId, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in chat room'
      });
    }
    
    // Log the action
    await logAudit(req.user.userId, 'REMOVE_CHAT_ROOM_MEMBER', `Removed user from chat room`, {
      roomId,
      removedUserId: userId
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
    
    // Verify room exists and belongs to company
    const roomCheck = await client.query(
      'SELECT room_id, name FROM chat_rooms WHERE room_id = $1 AND company_id = $2',
      [roomId, companyId]
    );
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    const roomName = roomCheck.rows[0].name;
    
    // Delete room members first (due to foreign key constraints)
    await client.query('DELETE FROM chat_room_members WHERE room_id = $1', [roomId]);
    
    // Delete chat messages
    await client.query('DELETE FROM chat_messages WHERE conversation_id = $1', [roomId]);
    
    // Delete the room
    await client.query('DELETE FROM chat_rooms WHERE room_id = $1', [roomId]);
    
    await client.query('COMMIT');
    
    // Log the action
    await logAudit(req.user.userId, 'DELETE_CHAT_ROOM', `Deleted chat room: ${roomName}`, {
      roomId,
      roomName
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

export default router;
