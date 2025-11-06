import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

// Store active users and their rooms
const activeUsers = new Map(); // userId -> Set of roomIds
const typingUsers = new Map(); // roomId -> Set of userIds

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.userId}`);    // Join room handler
    socket.on('joinRoom', async (roomData) => {
      try {
        const roomId = roomData.roomId || roomData;
        const userId = socket.user.userId;
        const companyId = socket.user.companyId;
        
        // Verify room access - check if user has access to the room
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
          throw new Error('Unauthorized room access');
        }

        // Leave previous room if any
        if (socket.currentRoom) {
          socket.leave(socket.currentRoom);
          removeUserFromRoom(socket.user.userId, socket.currentRoom);
        }

        // Join new room
        socket.currentRoom = roomId;
        socket.join(roomId);
        addUserToRoom(socket.user.userId, roomId);

        // Send room status
        io.to(roomId).emit('roomStatus', {
          activeUsers: Array.from(getActiveUsersInRoom(roomId)),
          typingUsers: Array.from(getTypingUsersInRoom(roomId))
        });

        // Send message history
        const messages = await getMessageHistory(roomId);
        socket.emit('messageHistory', messages);

      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', error.message);
      }
    });

    // Message handler
    socket.on('sendMessage', async (message) => {
      try {
        if (!socket.currentRoom) {
          throw new Error('Not in a room');
        }

        const newMessage = await saveMessage(socket.currentRoom, socket.user.userId, message);
        io.to(socket.currentRoom).emit('newMessage', newMessage);

        // Log activity
        await logMessageActivity(socket.user.userId, socket.currentRoom);

      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Typing indicators
    socket.on('typing', (isTyping) => {
      if (socket.currentRoom) {
        if (isTyping) {
          addTypingUser(socket.currentRoom, socket.user.userId);
        } else {
          removeTypingUser(socket.currentRoom, socket.user.userId);
        }
        io.to(socket.currentRoom).emit('typingStatus', {
          userId: socket.user.userId,
          isTyping
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.userId}`);
      if (socket.currentRoom) {
        removeUserFromRoom(socket.user.userId, socket.currentRoom);
        io.to(socket.currentRoom).emit('roomStatus', {
          activeUsers: Array.from(getActiveUsersInRoom(socket.currentRoom)),
          typingUsers: Array.from(getTypingUsersInRoom(socket.currentRoom))
        });
      }
    });
  });

  return io;
}

// Helper functions
function addUserToRoom(userId, roomId) {
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
  }
  activeUsers.get(userId).add(roomId);
}

function removeUserFromRoom(userId, roomId) {
  if (activeUsers.has(userId)) {
    activeUsers.get(userId).delete(roomId);
    if (activeUsers.get(userId).size === 0) {
      activeUsers.delete(userId);
    }
  }
}

function getActiveUsersInRoom(roomId) {
  const users = new Set();
  for (const [userId, rooms] of activeUsers.entries()) {
    if (rooms.has(roomId)) {
      users.add(userId);
    }
  }
  return users;
}

function addTypingUser(roomId, userId) {
  if (!typingUsers.has(roomId)) {
    typingUsers.set(roomId, new Set());
  }
  typingUsers.get(roomId).add(userId);
}

function removeTypingUser(roomId, userId) {
  if (typingUsers.has(roomId)) {
    typingUsers.get(roomId).delete(userId);
    if (typingUsers.get(roomId).size === 0) {
      typingUsers.delete(roomId);
    }
  }
}

function getTypingUsersInRoom(roomId) {
  return typingUsers.get(roomId) || new Set();
}

async function getMessageHistory(roomId) {
  const result = await pool.query(
    `SELECT cm.message_id, cm.user_id, cm.content as message, 
            cm.is_bot, cm.room_id, cm.conversation_id, cm.created_at,
            u.name as sender_name, u.profile_picture as sender_avatar 
     FROM chat_messages cm
     LEFT JOIN users u ON cm.user_id = u.id
     WHERE cm.room_id = $1
     ORDER BY cm.created_at DESC 
     LIMIT 100`,
    [roomId]
  );
  return result.rows.reverse();
}

async function saveMessage(roomId, userId, message) {
  const result = await pool.query(
    `INSERT INTO chat_messages 
     (room_id, conversation_id, user_id, content, is_bot)
     VALUES ($1, $1, $2, $3, $4)
     RETURNING message_id, user_id, content as message, 
               is_bot, room_id, conversation_id, created_at`,
    [roomId, userId, message.message || message.content, message.is_bot || false]
  );

  const senderResult = await pool.query(
    'SELECT name, profile_picture FROM users WHERE id = $1',
    [userId]
  );

  return {
    ...result.rows[0],
    sender_name: senderResult.rows[0]?.name || 'Unknown User',
    sender_avatar: senderResult.rows[0]?.profile_picture,
    sender_id: userId
  };
}

async function logMessageActivity(userId, roomId) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, project_id, timestamp)
       SELECT $1, 'sent_message', project_id, NOW()
       FROM chat_rooms WHERE room_id = $2 AND project_id IS NOT NULL`,
      [userId, roomId]
    );
  } catch (error) {
    logger.error('Error logging message activity:', error);
    // Don't throw - this is just logging
  }
}