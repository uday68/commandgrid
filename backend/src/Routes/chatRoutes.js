import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateChatReport } from '../controllers/chatController.js';
import { validate } from '../middleware/validator.js';
import { messageSchema } from '../middleware/validator.js';
import { cache } from '../middleware/cache.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { pool } from '../Config/database.js';
import ChatProxyController from '../controllers/ChatProxyController.js';

// Create an instance of the controller
const chatProxyController = new ChatProxyController();

const router = express.Router();

// Get all chat rooms for current user
router.get('/rooms', authenticateToken, cache(300), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        cr.*,
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', u.id,
              'name', u.name,
              'role', crm.role
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) as members
      FROM chat_rooms cr
      LEFT JOIN chat_room_members crm ON cr.room_id = crm.room_id
      LEFT JOIN users u ON crm.user_id = u.id
      WHERE cr.company_id = $1
        AND (cr.is_private = false OR cr.room_id IN (
          SELECT room_id FROM chat_room_members WHERE user_id = $2
        ))
      GROUP BY cr.room_id
      ORDER BY cr.created_at DESC
    `;
    
    const result = await pool.query(query, [companyId, userId]);
    
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

// Generate chat report
router.post('/report', authenticateToken, generateChatReport);

// Get chat room messages
router.get('/:id', authenticateToken, cache(300), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    
    let roomId = id;
      // Handle "default" room - create or get a general chat room
    if (id === 'default') {
      // Try to find or create a default room for the company
      let defaultRoom = await pool.query(
        `SELECT room_id FROM chat_rooms 
         WHERE company_id = $1 AND type = 'general' AND name = 'General Chat'
         LIMIT 1`,
        [companyId]
      );
      
      if (defaultRoom.rows.length === 0) {
        // Ensure we have a valid userId for created_by
        const createdBy = userId || req.user?.adminId || req.user?.id;
        if (!createdBy) {
          return res.status(400).json({
            success: false,
            message: 'User authentication required to create chat room'
          });
        }
        
        // Create a default room
        const newRoom = await pool.query(
          `INSERT INTO chat_rooms (name, description, type, company_id, created_by)
           VALUES ('General Chat', 'Default company-wide chat room', 'general', $1, $2)
           RETURNING room_id`,
          [companyId, createdBy]
        );
        roomId = newRoom.rows[0].room_id;
        
        // Add the creator as a member of the room
        await pool.query(
          `INSERT INTO chat_room_members (room_id, user_id, role)
           VALUES ($1, $2, 'admin')
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [roomId, createdBy]
        );
      } else {
        roomId = defaultRoom.rows[0].room_id;
      }
    }
      // Validate that the room exists and user has access
    const roomAccess = await pool.query(
      `SELECT cr.* FROM chat_rooms cr
       LEFT JOIN chat_room_members crm ON cr.room_id = crm.room_id
       WHERE cr.room_id = $1 
         AND cr.company_id = $2
         AND (cr.is_private = false OR crm.user_id = $3)
       LIMIT 1`,
      [roomId, companyId, userId]
    );
    
    if (roomAccess.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }
    
    // Ensure user is a member of the room (for non-private rooms)
    if (!roomAccess.rows[0].is_private) {
      await pool.query(
        `INSERT INTO chat_room_members (room_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [roomId, userId]
      );
    }    // Get messages for the room
    const messages = await pool.query(
      `SELECT 
         cm.message_id, 
         cm.user_id as sender_id, 
         cm.content as message, 
         cm.is_bot, 
         cm.room_id,
         cm.created_at, 
         cm.updated_at, 
         cm.metadata,
         u.name as sender_name,
         u.profile_picture as sender_avatar
       FROM chat_messages cm
       LEFT JOIN users u ON cm.user_id = u.user_id
       WHERE cm.room_id = $1 
       ORDER BY cm.created_at ASC
       LIMIT 100`,
      [roomId]
    );
    
    res.json({
      success: true,
      messages: messages.rows,
      room: roomAccess.rows[0]
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Get pinned messages
router.get('/:id/pinned', cache(300), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pinnedMessages = await pool.query(
      'SELECT MESSAGE_ID as message_id, USER_ID as user_id, CONTENT as content, IS_BOT as is_bot, CONVERSATION_ID as conversation_id, CREATED_AT as created_at, IS_PINNED as is_pinned, PINNED_AT as pinned_at FROM PUBLIC.CHAT_MESSAGES WHERE (ROOM_ID = $1 OR CONVERSATION_ID = $1) AND IS_PINNED = true ORDER BY PINNED_AT DESC',
      [id]
    );
    res.json(pinnedMessages.rows);
  } catch (error) {
    next(error);
  }
});

// Pin a message
router.post('/:id/pin/:messageId', async (req, res, next) => {
  try {
    const { id, messageId } = req.params;
    await pool.query(
      'UPDATE PUBLIC.CHAT_MESSAGES SET IS_PINNED = true, PINNED_AT = NOW() WHERE MESSAGE_ID = $1 AND (ROOM_ID = $2 OR CONVERSATION_ID = $2)',
      [messageId, id]
    );
    res.json({ message: 'Message pinned successfully' });
  } catch (error) {
    next(error);
  }
});

// Unpin a message
router.post('/:id/unpin/:messageId', async (req, res, next) => {
  try {
    const { id, messageId } = req.params;
    await pool.query(      'UPDATE PUBLIC.CHAT_MESSAGES SET IS_PINNED = false, PINNED_AT = NULL WHERE MESSAGE_ID = $1 AND (ROOM_ID = $2 OR CONVERSATION_ID = $2)',
      [messageId, id]
    );
    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    next(error);
  }
});

// AI chat route
router.post(
  '/:id/ai',
  authenticateToken,
  authLimiter,
  cache(300),
  (req, res) => {
    // Add room_id to request body from URL parameter
    req.body.room_id = req.params.id;
    chatProxyController.proxyMessage(req, res);
  }
);

// AI Chat Integration
router.post('/ai', authenticateToken, authLimiter, chatProxyController.proxyMessage);

// Chat history endpoint
router.get('/history', authenticateToken, chatProxyController.getChatHistory);

// Send message to chat room
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, content } = req.body;
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    
    let roomId = id;
    
    // Handle "default" room
    if (id === 'default') {
      let defaultRoom = await pool.query(
        `SELECT room_id FROM chat_rooms 
         WHERE company_id = $1 AND type = 'general' AND name = 'General Chat'
         LIMIT 1`,
        [companyId]
      );
      
      if (defaultRoom.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Default chat room not found'
        });
      }
      roomId = defaultRoom.rows[0].room_id;
    }
    
    // Validate that the room exists and user has access
    const roomAccess = await pool.query(
      `SELECT cr.* FROM chat_rooms cr
       LEFT JOIN chat_room_members crm ON cr.room_id = crm.room_id
       WHERE cr.room_id = $1 
         AND cr.company_id = $2
         AND (cr.is_private = false OR crm.user_id = $3)
       LIMIT 1`,
      [roomId, companyId, userId]
    );
    
    if (roomAccess.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }
    
    const messageContent = message || content;
    if (!messageContent || !messageContent.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Insert the message
    const result = await pool.query(
      `INSERT INTO chat_messages (room_id, conversation_id, user_id, content, is_bot)
       VALUES ($1, $1, $2, $3, false)
       RETURNING message_id, user_id, content as message, is_bot, room_id, created_at`,
      [roomId, userId, messageContent.trim()]
    );
    
    // Get sender information
    const senderInfo = await pool.query(
      'SELECT name, profile_picture FROM users WHERE id = $1',
      [userId]
    );
    
    const newMessage = {
      ...result.rows[0],
      sender_name: senderInfo.rows[0]?.name || 'Unknown User',
      sender_avatar: senderInfo.rows[0]?.profile_picture,
      sender_id: userId
    };
    
    res.status(201).json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

export default router;
