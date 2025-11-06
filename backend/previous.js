import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import pkg from 'pg';
import pkgs from 'agora-access-token';
import nodemailer from 'nodemailer';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import pidusage from "pidusage";
import httpErrors from 'http-errors';
import PDFDocument from "pdfkit";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import ical from 'ical.js';
import rrule from 'rrule';

dotenv.config();
const { RtcTokenBuilder, RtcRole } = pkgs;

// Import routes
import adminRouter from './src/Routes/admin/adminRoutes.js';
import projectManagerRouter from './src/Routes/projectmanager/projectmanager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],  // Fixed broken string
    credentials: true
  }  // Fixed missing parenthesis
});
const { Pool } = pkg;
const port = 5000;

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password'
  }
});

// Add remaining routes and server startup


// Export for testing purposes
export default server;

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('Email server ready for sending ✅');
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routers - ensure this is before any admin route definitions
app.use('/api/admin', adminRouter);
app.use('/api/projectmanager', projectManagerRouter);
// Add these new mappings to fix the 404 errors
app.use('/api/metrics', projectManagerRouter);
app.use('/api/activities', projectManagerRouter);
app.use('/api/team', projectManagerRouter);

// Define file storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pmt',
  password: process.env.DB_PASSWORD || 'newpassword',
  port: process.env.DB_PORT || 5433,
  max: 20,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 2000,
});

// Validate that secret keys are defined
if (!process.env.SECRET_KEY || !process.env.REFRESH_SECRET_KEY) {
  throw new Error('SECRET_KEY and REFRESH_SECRET_KEY must be defined in the environment variables.');
}

pool.connect()
  .then(() => console.log('Connected to PostgreSQL ✅'))
  .catch(err => console.error('Database connection error ❌', err));

// --- Activity & Audit Logging Helpers ---
const logActivity = async ({ userId, projectId = null, action, details = null }) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, project_id, action, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [userId, projectId, action]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

const logAudit = async ({ userId = null, adminId = null, ip, actionType, actionDetails }) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, admin_id, ip_address, action_type, action_details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, adminId, ip, actionType, actionDetails]
    );
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

const logSecurityThreat = async ({ type, description, severity = 'medium', ip }) => {
  try {
    await pool.query(
      `INSERT INTO security_threats (threat_name, description, severity, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [type, description, severity]
    );
  } catch (err) {
    console.error('Failed to log security threat:', err);
  }
};

// Socket.IO setup
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = decoded;
    next();
  });
});

// Define activeUsers and typingUsers at the top level
const activeUsers = new Set();

io.on('connection', (socket) => {
  let currentRoom = null;
  const typingUsers = new Map();

  socket.on('joinRoom', async (roomId) => {
    try {
      // Verify project access if needed
      const projectAccess = await pool.query(
        `SELECT 1 FROM project_members 
         WHERE project_id = (SELECT project_id FROM rooms WHERE room_id = $1) 
         AND user_id = $2`,
        [roomId, socket.user.userId]
      );

      if (projectAccess.rowCount === 0) {
        throw new Error('Unauthorized project access');
      }

      if (currentRoom) socket.leave(currentRoom);
      currentRoom = roomId;
      socket.join(roomId);

      // Add user to active users and emit to room
      activeUsers.add(socket.user.userId);
      io.to(roomId).emit('activeUsers', Array.from(activeUsers));

      // Send message history
      const messages = await pool.query(
        `SELECT m.*, u.name as sender_name der_id, m.message, m.created_at, u.name as sender_name, u.profile_picture as sender_avatar 
         FROM messages m
         JOIN users u ON m.sender_id = u.user_id
         WHERE m.room = $1 
         ORDER BY m.created_at DESC 
         LIMIT 100`,
        [roomId]
      );

      socket.emit('messageHistory', messages.rows.reverse());
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Message handler with proper error handling
  socket.on('sendMessage', async (message) => {
    try {
      if (!currentRoom || !socket.user) {
        throw new Error('Not authorized or not in a room');
      }

      const newMessage = await pool.query(
        `INSERT INTO messages 
         (room, sender_id, message, type, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [currentRoom, socket.user.userId, message.message, message.type || 'text']
      );

      // Get sender name for the response
      const senderResult = await pool.query(
        'SELECT name FROM users WHERE user_id = $1',
        [socket.user.userId]
      );

      const completeMessage = {
        ...newMessage.rows[0],
        sender_name: senderResult.rows[0]?.name || 'Unknown User'
      };

      io.to(currentRoom).emit('newMessage', completeMessage);

      // Log activity if needed
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, project_id, timestamp)
         SELECT $1, 'sent_message', project_id, NOW()
         FROM rooms WHERE room_id = $2`,
        [socket.user.userId, currentRoom]
      );
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle typing indicators properly
  socket.on('typing', () => {
    if (!currentRoom || !socket.user) return;

    // Store user's typing status with a timestamp
    typingUsers.set(socket.user.userId, {
      id: socket.user.userId,
      timestamp: Date.now()
    });

    // Emit updated typing users to the room
    const activeTypers = Array.from(typingUsers.values())
      .filter(user => Date.now() - user.timestamp < 5000); // Only include recent typers (< 5 seconds)

    io.to(currentRoom).emit('typing', activeTypers);

    // Auto-clear typing status after timeout
    setTimeout(() => {
      if (typingUsers.has(socket.user.userId)) {
        typingUsers.delete(socket.user.userId);
        io.to(currentRoom).emit('typing', Array.from(typingUsers.values()));
      }
    }, 5000);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (currentRoom) {
      activeUsers.delete(socket.user?.userId);
      io.to(currentRoom).emit('activeUsers', Array.from(activeUsers));

      // Also clear typing indicator
      if (socket.user && typingUsers.has(socket.user.userId)) {
        typingUsers.delete(socket.user.userId);
        io.to(currentRoom).emit('typing', Array.from(typingUsers.values()));
      }
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});




// Middleware
const isTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const checkRoleQuery = `SELECT role FROM users WHERE user_id = $1`;
    const roleCheck = await pool.query(checkRoleQuery, [userId]);
    if (roleCheck.rows[0].role !== 'Member') {
      return res.status(403).json({ error: 'Access denied. Team members only.' });
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Modified authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token is invalid' });
    }
    
    // Ensure decoded has expected properties to prevent undefined errors
    const userId = decoded.userId || null;
    const adminId = decoded.adminId || null;
    const role = decoded.role || 'User'; // Default role if not specified
    const companyId = decoded.companyId || null;
    
    // Attach both user and admin information with safe defaults
    req.user = {
      userId,
      adminId,
      role,
      companyId
    };
    
    next();
  });
};

// Modified token generation functions
const generateAccessToken = (user) => {
  return jwt.sign({
    userId: user.user_id || null,
    adminId: user.admin_id || null,
    role: user.role || 'User',
    companyId: user.company_id || null
  }, process.env.SECRET_KEY, { expiresIn: '15m' });  // Must match Python's ACCESS_TOKEN_SECRET
};

const generateRefreshToken = (user) => {
  return jwt.sign({
    userId: user.user_id || null,
    adminId: user.admin_id || null
  }, process.env.REFRESH_SECRET_KEY, { expiresIn: '7d' });
};
// Refresh token example
app.get('/api/chat/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Verify user has access to this room/project
    const roomCheck = await pool.query(
      `SELECT r.project_id FROM rooms r
       WHERE r.room_id = $1`,
      [roomId]
    );
    
    if (roomCheck.rows.length > 0) {
      const projectId = roomCheck.rows[0].project_id;
      
      // Check project access if this room is project-related
      if (projectId) {
        const accessCheck = await pool.query(
          `SELECT 1 FROM project_members 
           WHERE project_id = $1 AND user_id = $2`,
          [projectId, req.user.userId]
        );
        
        if (accessCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Unauthorized - No access to this room' });
        }
      }
    }

    // Fetch messages with proper joins and formatting
    const messages = await pool.query(
      `SELECT 
         m.message_id, 
         m.room, 
         m.sender_id,
         m.message,
         m.type,ed_at,
         m.created_at,der_name,
         u.name as sender_name,ender_avatar
         u.profile_picture as sender_avatar
       FROM messages m m.sender_id = u.user_id
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.room = $1 _at DESC 
       ORDER BY m.created_at DESC 
       LIMIT 100`,
      [roomId]
    );
    res.json({ messages: messages.rows.reverse() });
  } catch (error) { message: 'Error fetching messages:', error
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});
app.get('/api/messages/:room', authenticateToken, async (req, res) => {
  try {
    const { room } = req.params;
    
    const messagesQuery = `
      SELECT m.message, m.created_at, u.name AS sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.room = $1 
      ORDER BY m.created_at ASC
    `;
    
    const result = await pool.query(messagesQuery, [room]);
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const roomsQuery = `
      SELECT m_id,
        r.room_id,room_name,
        r.name as room_name,
        r.type,ct_id,
        r.project_id,ject_name,
        p.name as project_name,
        ( SELECT COUNT(*) 
          SELECT COUNT(*) 
          FROM messages .room_id
          WHERE room = r.room_id
        ) as message_count,
        ( SELECT COUNT(*) 
          SELECT COUNT(*) 
          FROM room_users r.room_id
          WHERE room_id = r.room_id
        ) as user_count,
        ( SELECT MAX(created_at) 
          SELECT MAX(created_at) 
          FROM messages .room_id
          WHERE room = r.room_id
        ) as last_activity
      FROM rooms rojects p ON r.project_id = p.project_id
      LEFT JOIN projects p ON r.project_id = p.project_id
      WHERE r.room_id IN (M room_users WHERE user_id = $1
        SELECT room_id FROM room_users WHERE user_id = $1
      ) OR (r.project_id IN (M project_members WHERE user_id = $1
        SELECT project_id FROM project_members WHERE user_id = $1
      ) AND p.project_id IS NOT NULL AND p.owner_id IN (2
        SELECT admin_id FROM admins WHERE company_id = $2
      ))DER BY last_activity DESC NULLS LAST
      ORDER BY last_activity DESC NULLS LAST
    `;
    const result = await pool.query(roomsQuery, [userId, companyId]);
    res.json({ rooms: result.rows });
  } catch (error) {  message :'Error fetching rooms:', error
    console.error('Error fetching rooms:', error); 
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});
// Example: Direct messages are always user-to-user and company-scopedeq, res) => {
app.get('/api/community/user-connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;anyId;
    const companyId = req.user.companyId;
    // Only fetch connections within the 
    const connectionsQuery = `(
      WITH recent_messages AS (
        SELECT DISTINCT ON (
          CASEEN sender_id = $1 THEN recipient_id
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END
        ) CASE
          CASEEN sender_id = $1 THEN recipient_id
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END as user_id,
          message,at
          created_atmessages
        FROM direct_messages1 OR recipient_id = $1)
        WHERE (sender_id = $1 OR recipient_id = $1)
        ORDER BY user_id, created_at DESC
      )ELECT
      SELECTer_id as id,
        u.user_id as id,
        u.name,le_picture as avatar,
        u.profile_picture as avatar,
        CASEEN am.status = 'available' THEN 'online'
          WHEN am.status = 'available' THEN 'online'
          ELSE 'offline'
        END as status,
        rm.message,at,
        rm.created_at,ated_at, 'HH12:MI AM') as time
        to_char(rm.created_at, 'HH12:MI AM') as time
      FROM users umessages rm ON u.user_id = rm.user_id
      JOIN recent_messages rm ON u.user_id = rm.user_idser_id
      LEFT JOIN available_member am ON u.user_id = am.user_id
      WHERE u.company_id = $2DESC
      ORDER BY rm.created_at DESC
    `;
    const result = await pool.query(connectionsQuery, [userId, companyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({ error: 'Failed to retrieve user connections' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
   
    const userQuery = `
      SELECT user_id, name, email, password_hash, role, company_id
      FROM users
      WHERE email = $1
    `;
    const userResult = await pool.query(userQuery, [email]);
    let user = userResult.rows[0];
    let isAdmin = false;
   
    if (!user) {
      const adminQuery = `
        SELECT admin_id, email, password, company_id
        FROM admins 
        WHERE email = $1
      `;
      const adminResult = await pool.query(adminQuery, [email]);
      if (adminResult.rows.length > 0) {
        user = adminResult.rows[0];
        user.role = 'Admin'; 
        isAdmin = true;
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
 
    const storedPassword = user.password_hash || user.password;
    const passwordMatch = await bcrypt.compare(password, storedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
   
    const authToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
  
    if (isAdmin) {
      await pool.query(
        'UPDATE admins SET refresh_token = $1 WHERE admin_id = $2',
        [refreshToken, user.admin_id]
      ); }
     else {pool.query(
      
        'UPDATE users SET refresh_token = $1 WHERE user_id = $2',
        [refreshToken, user.user_id]
      );
    
      const leaderCheck = await pool.query(
        'SELECT leader_id FROM teams WHERE leader_id = $1',
        [user.user_id]
      ); 
      if (leaderCheck.rows.length > 0 && leaderCheck.rows[0].leader_id === user.user_id) {
        user.role = "Team Leader";
      }
    }
    console.log('User logged in:', user.email);
    console.log('User role:', user.role);
    res.json({
      authToken,
      refreshToken,
      user: {
        id: user.user_id || user.admin_id,
        email: user.email,
        name: user.name || 'Administrator',
        role: user.role,
        companyId: user.company_id,
        isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Allow both image and PDF files
    if(/\.(jpg|jpeg|png|gif|pdf|docs|xlsx|txt|odf)$/.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image/PDF files are allowed!'));
    }
  }
});

app.post('/api/upload', upload.array('files', 5), async (req, res) => { // Max 5 files
  try {
    if (!req.files || req.files.length === 0) throw new Error('No files uploaded');
    const fileData = req.files.map(file => ({
      path: `/uploads/${file.filename}`,
      url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype
    }));
    res.json({
      success: true,
      files: fileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
  try {
    if (req.user.role === 'Admin') {
      await pool.query('UPDATE admins SET refresh_token = NULL WHERE admin_id = $1', [req.user.adminId]);
    } else {
      await pool.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [req.user.userId]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const
    usersQuery = `


      SELECT u.user_id, u.name, u.email, u.username, u.role, u.profile_picture,
        u.created_at, u.updated_at, u.company_id,
        (SELECT COUNT(*) FROM
        tasks t WHERE t.assigned_to = u.user_id) AS totalTasks,
        (SELECT COUNT(*) FROM
        project_members pm WHERE pm.user_id = u.user_id) AS totalProjects
      FROM users u
      WHERE u.company_id = $1
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(usersQuery, [companyId]);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/api/users',authenticateToken,async(req,res)=>{
  try {
    const { name,
      email,me,
      username,
      role,
      password}=req.body;
    const company_id = req.user.companyId
    const hashedPassword=await bcrypt.hash(password,10);
    const query="INSERT INTO users (name,email,password_hash,username,role,company_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *"
    const result=await pool.query(query,[name,email,hashedPassword,username,role,company_id]);
    res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal Server Error' });
      }
})

app.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      name,  
      email, 
      username, 
      role,
      requiresPasswordUpdate
    } = req.body;Id = req.user.companyId;
    
    const companyId = req.user.companyId;
   
   
    const verifyQuery = `AND company_id = $2
      SELECT 1 FROM users 
      WHERE user_id = $1 AND company_id = $2rifyQuery, [userId, companyId]);
    `;
    const verifyResult = await pool.query(verifyQuery, [userId, companyId]);
      
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const fields = [];
    // Build dynamic update query

    const values = [];
    let paramCount = 1;
    const addField = (field, value) => {
      if (value !== undefined) {
    const addField = (field, value) => {Count}
      if (value !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    };dField('name', name);
    addField('email', email);
    addField('name', name);
    addField('email', email);
    addField('username', username);
    addField('role', role);
    addField('requires_password_update', requiresPasswordUpdate);
    addField('updated_at', new Date());
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    const query = ` = $${paramCount}
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    values.push(userId);result.rows[0];

    const result = await pool.query(query, values);e
    const updatedUser = result.rows[0];

    // Remove sensitive data before sending response
    delete updatedUser.password_hash;
    console.error('Error updating user:', error);
    res.json(updatedUser); 
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  try {const result = await pool.query(DeleteQuery, [userId]);
    const { userId } = req.params;{
    const DeleteQuery = `DELETE FROM users WHERE user_id = $1 RETURNING *`;
    const result = await pool.query(DeleteQuery, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
   return  res.json({ message: "User deleted successfully" });
  } 
}catch (error) {
    res.json({ error: error, message: "user deletion failed" });
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})




app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationsQuery = `
      SELECT n.*, u.name AS sender_name, u.profile_picture AS sender_avatar
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.user_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `;
    const notifications = await pool.query(notificationsQuery, [userId]);
    res.json({ notifications: notifications.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }

});

// Update project details req.params;
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.adminId;
    
    const projectsQuery = `
   select  * from projects where owner_id = $1 
    `;
    const result = await pool.query(projectsQuery, [userId]);
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
);

app.get('/api/projectdetails', authenticateToken, async (req, res) => {
  try {
      const userId = req.user.userId; // Fix destructuring
    
      const projectQuery = `
      SELECT roject_id, 
          p.project_id, 
          p.name, 
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.project_id) AS totalTasks, totalTeamMembers
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) AS totalTeamMembers
      FROM projects p  = $1;
      WHERE p.owner_id = $1;
      `;
      const result = await pool.query(projectQuery, [userId]);
      res.json({ projects: result.rows });
  } catch (error) {
      console.error('Error fetching project details:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Create a new project;
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description, status, budget, start_date, end_date,manager_id } = req.body;
    const userId = req.user.userId || req.user.adminId;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Validate date consistency if both are provided
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Set default status if not provided
    const projectStatus = status || 'pending';

    const insertQuery = `
      INSERT INTO projects (
        name, 
        description, 
        status, 
        owner_id, 
        created_at,
        budget,
        start_date,
        end_date
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      name, 
      description, 
      projectStatus, 
      userId,
      budget,
      start_date,
      end_date
    ]);
    const projectId = result.rows[0].project_id;

    const insertMemberQuery = `

      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const value  = await pool.query(insertMemberQuery, [projectId, manger_id,'manager']);
    const memeber_value = value.rows[0]

    

    const newProject = result.rows[0];
    
    // Log activity
    await logActivity({
      userId,
      projectId: newProject.project_id,
      action: 'project_created',
      details: `Project "${name}" was created`
    });
    await logActivity({
      manager_id,
      projectId: newProject.project_id,
      action: 'project member is added',
      details: `Project "${name}" was created`
    });
    res.status(201).json({ 
      message: 'Project created successfully',
      project: newProject ,
      project_member : member_value
    });
  } catch (error) {
    console.error('Error creating project:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Project with this name already exists' });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
app.put('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized - No access to project' });
    }

    const updateQuery = `
      UPDATE projects
      SET name = $1, description = $2, status = $3, updated_at = NOW()
      WHERE project_id = $4
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [name, description, status, projectId]);
    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.put('/api/projects/:projectId/archive', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateQuery = `d',
      UPDATE projectsNOW()
      SET E project_id = $1
        status = 'archived',
        updated_at = NOW()
      WHERE project_id = $1
      RETURNING *= await pool.query(updateQuery, [projectId]);
    `;
  } catch (error) {
    const result = await pool.query(updateQuery, [projectId]);
    res.json({ project: result.rows[0] });
  } 
});

app.delete('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Begin transactioncords first
    await pool.query('BEGIN');
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);

    // Commit transactionProject deleted successfully' });
    await pool.query('COMMIT');
    await pool.query('ROLLBACK');
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Get tasks for a specific projects;
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params; project
    const userId = req.user.userId;
    const companyId = req.user.companyId;
  
    // Verify user has access to this project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]); // Check if user is a member of the project
    

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized - No access to project' });
    } 
    const tasksQuery = `ed_to_name,
      SELECT file_picture AS assigned_to_avatar
        t.*,asks t
        u.name AS assigned_to_name,ed_to = u.user_id
        u.profile_picture AS assigned_to_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.user_idND,
      WHERE t.project_id = $1
      ORDER BY 
        CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
        t.due_date ASCit pool.query(tasksQuery, [projectId]);
    `;s.json({ tasks: result.rows });
  } catch (error) {
    const result = await pool.query(tasksQuery, [projectId]);
    res.json({ tasks: result.rows });
  }
})
// GET All Notifications (with pagination)
app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM admin_notifications 
       WHERE admin_id = $1
       ORDER BY is_read, created_at DESC;`,
      [req.user.adminId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.patch('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE notification_id = $1',
      [id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Mark notification as reads;
// Mark single notification as read
app.patch('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE notification_id = $1',
      [id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
app.patch('/api/admin/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE is_read = false AND admin_id = $1',
      [req.user.adminId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Mark all notifications as read
// Mark all notifications as read
app.patch('/api/admin/notification/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE is_read = false AND admin_id = $1',
      [req.user.adminId]  // Using req.user.adminId from the authenticated token
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
app.delete('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM admin_notifications WHERE notification_id = $1',
      [id]
    );
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: 'Server error' });
  }
});
// Delete notification.params;
app.delete('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'DELETE FROM admin_notifications WHERE notification_id = $1',
      [id]
    );

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE notification_id = $1',
      [id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE Notification.params;
app.put('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, is_read } = req.body;

    const query = `
      UPDATE admin_notifications 
      SET message = COALESCE($1, message),
          is_read = COALESCE($2, is_read)
      WHERE notification_id = $3 
      RETURNING *`;

    const result = await pool.query(query, [message, is_read, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// DELETE Notification.params;
app.delete('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM admin_notifications 
      WHERE notification_id = $1
      RETURNING *`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.delete('/api/admin/notifications/all', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM admin_notifications
      WHERE admin_id = $1
      RETURNING *`;

    const result = await pool.query(query, [req.user.adminId]);

    // Since we're deleting all notifications, we don't need to check if any were found
    // Just return success message
    res.json({ 
      message: 'All notifications deleted successfully',
      count: result.rowCount // Optionally return how many were deleted
    });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}); 
app.get("/api/task/:projectId", authenticateToken, async (req, res) => {
  try {
      const taskIdQuery = `SELECT * FROM tasks WHERE project_id = $1`;
      const tasks = await pool.query(taskIdQuery, [req.params.projectId]);
      res.json({ tasks: tasks.rows });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const commentsQuery = `SELECT * FROM task_comments WHERE task_id = $1`;
      const comments = await pool.query(commentsQuery, [taskId]); 
      res.json({ comments: comments.rows });
  } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Get activity logs for a specific project
app.get('/api/activity/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const logsQuery = `
        SELECT 
          al.*,
          u.name as user_name,
          u.profile_picture as user_avatar
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        WHERE al.project_id = $1 
        ORDER BY COALESCE(al.timestamp, al.created_at) DESC
    `;
    const logs = await pool.query(logsQuery, [projectId]);
    res.json({ logs: logs.rows });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get tasks assigned to team member
app.get('/api/member/tasks', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const tasksQuery = `
          SELECT 
              t.task_id,
              t.title,
              t.description, 
              t.status,
              t.due_date,
              p.name as project_name,
              p.project_id
          FROM tasks t
          JOIN project_members pm ON t.project_id = pm.project_id
          JOIN projects p ON t.project_id = p.project_id 
          WHERE t.assigned_to = $1
          ORDER BY t.due_date ASC`;

      const result = await pool.query(tasksQuery, [req.user.userId]);
      res.json({ tasks: result.rows });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
// 🟢 Get Projects Assigned to Team Member

// Get projects for team member
app.get('/api/member/projectdetails', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const projectQuery = `
          SELECT 
              p.project_id, 
              p.name, 
              p.description 
          FROM projects p
          JOIN team_members tm ON p.project_id = tm.project_id
          WHERE tm.user_id = $1`;

      const result = await pool.query(projectQuery, [req.user.userId]);
      res.json({ projects: result.rows });
  } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update task status
app.put('/api/tasks/:taskId', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { status } = req.body;

      if (!["To Do", "In Progress", "Completed"].includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
      }

      const updateTaskQuery = `
          UPDATE tasks 
          SET status = $1 
          WHERE task_id = $2 AND assigned_to = $3
          RETURNING *`;

      const result = await pool.query(updateTaskQuery, [status, taskId, req.user.userId]);

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Task not found or not assigned to you" });
      }

      res.json({ message: 'Task status updated successfully' });
  } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.post('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { comment } = req.body;

      // Input validation
      if (!comment || comment.trim() === "") {
          return res.status(400).json({ error: "Comment cannot be empty" });
      }

      // Insert comment query
      const insertCommentQuery = `
          INSERT INTO task_comments (task_id, user_id, comment, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *`;

      // Execute query
      const result = await pool.query(insertCommentQuery, [taskId, req.user.userId, comment]);

      // Send success response
      res.status(201).json({ 
          message: 'Comment added successfully',
          comment: result.rows[0]
      });

  } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get("/api/project-manager/teams", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Correct destructuring
    const query = `name,
SELECT tatus AS status,
    t.team_id,ser_id) AS total_members,
    t.name AS team_name,
    t.status AS status,
    COUNT(tm.user_id) AS total_members,
    COALESCE(project_id', p.project_id,
      JSON_AGG(oject_name', p.name,
        DISTINCT jsonb_build_object(.description
            'project_id', p.project_id,
            'project_name', p.name,IS NOT NULL),
            'project_description', p.description
        )projects
      ) FILTER (WHERE p.project_id IS NOT NULL),
      '[]'team_members tm ON tm.team_id = t.team_id
    ) AS projectss p ON p.project_id = t.project_id
FROM teams tr_id IN (
LEFT JOIN team_members tm ON tm.team_id = t.team_id
LEFT JOIN projects p ON p.project_id = t.project_id
WHERE t.owner_id IN (.name;
  SELECT admin_id FROM admins WHERE company_id = $1
)
GROUP BY t.team_id, t.name;ool.query(query, [req.user.companyId]);
    `;
    res.status(200).json({ success: true, data: result.rows[0] });
    const result  = await pool.query(query, [req.user.companyId]);
    console.error("Error fetching teams:", error.message);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {e, 
    console.error("Error fetching teams:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch teams data"
    });
  }
});
// File Upload Endpoint
app.post('/api/files', upload.single('file'), authenticateToken, async (req, res) => {
  try {
    const { filename, originalname } = req.file;
    const { projectId } = req.body;
    
    const insertFileQuery = `
      INSERT INTO files (filename, originalname, project_id, user_id, created_at) 
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`;
    
    const result = await pool.query(insertFileQuery, [filename, originalname, projectId, req.user.userId]);
    res.status(201).json({ file: result.rows[0] });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Time Entry Creation Endpoint 
app.post('/api/member/time-entries', authenticateToken, async (req, res) => {
  try {
    const { hours, description } = req.body;

    const insertTimeEntryQuery = `
      INSERT INTO time_entries (user_id, hours, description, created_at)
      VALUES ($1, $2, $3, NOW()) 
      RETURNING *`;

    const result = await pool.query(insertTimeEntryQuery, [req.user.userId, hours, description]);
    res.status(201).json({ timeEntry: result.rows[0] });
  } catch (error) {
    console.error('Error logging time entry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch Time Entries Endpoint
app.get('/api/member/time-entries', authenticateToken, async (req, res) => {
  try {
    const timeEntriesQuery = `
      SELECT * FROM time_entries 
      WHERE user_id = $1 
      ORDER BY created_at DESC`;

    const result = await pool.query(timeEntriesQuery, [req.user.userId]);
    res.json({ timeEntries: result.rows });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/messages/:room', authenticateToken, async (req, res) => {
  try {
    const { room } = req.params;

    const messagesQuery = `
      SELECT 
        m.message,
        m.created_at,
        u.name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id 
      WHERE m.room = $1
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(messagesQuery, [room]);
    res.json({ messages: result.rows });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// 🟢 Fetch Projects for Project Manager
app.get('/api/project-manager/projects', authenticateToken, async (req, res) => {
  try {

    const result = await pool.query(projectsQuery, [req.user.companyId]);
    
    res.json({ projects: result.rows });

  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date } = req.body;
    const userId = req.user.userId;

    // Verify user is project manager for the task's project
    const authorizationQuery = `
      SELECT 1
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE t.task_id = $1
      AND pm.user_id = $2
      AND pm.role = 'Project Manager'
    `;

    const authResult = await pool.query(authorizationQuery, [taskId, userId]);

    if (authResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Unauthorized - You must be a Project Manager for this project' 
      });
    }

    // Update the task
    const updateTaskQuery = `
      UPDATE tasks
      SET title = $1,
          description = $2,
          status = $3,
          priority = $4,
          due_date = $5,
          updated_at = NOW()
      WHERE task_id = $6
      RETURNING *
    `;

    const result = await pool.query(updateTaskQuery, [
      title,
      description,
      status,
      priority,
      due_date,
      taskId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if the logged-in user is the project manager for the task's project
    const checkTaskQuery = `
      SELECT p.owner_id, p.project_id 
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = $1
    `;

    const taskResult = await pool.query(checkTaskQuery, [taskId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is project owner or has project manager role
    const projectAccessQuery = `
      SELECT 1 
      FROM project_members 
      WHERE project_id = $1 
      AND user_id = $2 
      AND role = 'Project Manager'
    `;

    const accessResult = await pool.query(projectAccessQuery, [
      taskResult.rows[0].project_id,
      req.user.userId
    ]);

    if (taskResult.rows[0].owner_id !== req.user.userId && accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to delete this task.' });
    }

    // Begin transaction
    await pool.query('BEGIN');

    // Delete task comments first
    await pool.query('DELETE FROM task_comments WHERE task_id = $1', [taskId]);
    
    // Delete subtasks if any
    await pool.query('DELETE FROM subtasks WHERE parent_task_id = $1', [taskId]);
    
    // Delete the task
    const deleteTaskQuery = 'DELETE FROM tasks WHERE task_id = $1';
    await pool.query(deleteTaskQuery, [taskId]);

    // Commit transaction
    await pool.query('COMMIT');

    // Log activity
    await logActivity({
      userId: req.user.userId,
      projectId: taskResult.rows[0].project_id,
      action: 'task_deleted',
      details: `Task ${taskId} was deleted`
    });

    res.json({ message: 'Task deleted successfully' });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/project-manager/tasks', authenticateToken, async (req, res) => {
  try {
    // First get the user's role and associated projects
    const projectQuery = `
      SELECT p.project_id, p.name as project_name
      FROM projects p
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE pm.user_id = $1 AND pm.role = 'Project Manager'
    `;

    const projectsResult = await pool.query(projectQuery, [req.user.userId]);

    if (projectsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No projects found for this project manager' });
    }

    // Get tasks for all projects where user is project manager
    const taskQuery = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        p.name as project_name,
        u.name as assigned_user,
        u.user_id as assigned_user_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE p.project_id = ANY($1::uuid[])
    `;

    const projectIds = projectsResult.rows.map(p => p.project_id);
    const tasksResult = await pool.query(taskQuery, [projectIds]);

    res.json({
      projects: projectsResult.rows,
      tasks: tasksResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;

    // Verify project ownership
    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE project_id = $1',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to create tasks for this project' });
    }

    const result = await pool.query(
      `INSERT INTO tasks 
       (title, description, project_id, assigned_to, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, project_id, assigned_to, status, priority, due_date]
    );

    res.status(201).json({ task: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date } = req.body;
    const userId = req.user.userId;
    
    // Verify user is project manager for the task's project
    const authorizationQuery = `
      SELECT 1
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE t.task_id = $1
      AND pm.user_id = $2
      AND pm.role = 'Project Manager'`;
      
    const authResult = await pool.query(authorizationQuery, [taskId, userId]);
    
    if (authResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Unauthorized - You must be a Project Manager for this project' 
      });
    }
    
    // Update the task
    const updateTaskQuery = `
      UPDATE tasks
      SET title = $1,
          description = $2,
          status = $3,
          priority = $4,
          due_date = $5,
          updated_at = NOW()
      WHERE task_id = $6
      RETURNING *`;
      
    const result = await pool.query(updateTaskQuery, [
      title,
      description,
      status,
      priority,
      due_date,
      taskId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Delete task
app.delete('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Check if the logged-in user is the project manager for the task's project
    const checkTaskQuery = `
      SELECT p.owner_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = $1`;
      
    const taskResult = await pool.query(checkTaskQuery, [taskId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to delete this task.' });
    }

    const deleteTaskQuery = 'DELETE FROM tasks WHERE task_id = $1';
    await pool.query(deleteTaskQuery, [taskId]);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/community/user-connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    // Only fetch connections within the 
    const connectionsQuery = `(
      WITH recent_messages AS (
        SELECT DISTINCT ON (
          CASEEN sender_id = $1 THEN recipient_id
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END
        ) CASE
          CASEEN sender_id = $1 THEN recipient_id
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END as user_id,
          message,at
          created_atmessages
        FROM direct_messages1 OR recipient_id = $1)
        WHERE (sender_id = $1 OR recipient_id = $1)
        ORDER BY user_id, created_at DESC
      )ELECT
      SELECTer_id as id,
        u.user_id as id,
        u.name,le_picture as avatar,
        u.profile_picture as avatar,
        CASEEN am.status = 'available' THEN 'online'
          WHEN am.status = 'available' THEN 'online'
          ELSE 'offline'
        END as status,
        rm.message,at,
        rm.created_at,ated_at, 'HH12:MI AM') as time
        to_char(rm.created_at, 'HH12:MI AM') as time
      FROM users umessages rm ON u.user_id = rm.user_id
      JOIN recent_messages rm ON u.user_id = rm.user_idser_id
      LEFT JOIN available_member am ON u.user_id = am.user_id
      WHERE u.company_id = $2DESC
      ORDER BY rm.created_at DESC
    `;
    const result = await pool.query(connectionsQuery, [userId, companyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({ error: 'Failed to retrieve user connections' });
  }
}
);

app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const deleteQuery = `DELETE FROM users WHERE user_id = $1 RETURNING *`;
    const result = await pool.query(deleteQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}); 


// Update project details req.params;
app.put('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, budget, start_date, end_date, status } = req.body;
    const userId = req.user.userId;

    const updateQuery = `
      UPDATE projects
      SET 
        name = $1,
        description = $2,
        budget = $3,
        start_date = $4,
        end_date = $5,
        status = $6,
        updated_at = NOW()
      WHERE project_id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      name,
      description,
      budget,
      start_date,
      end_date,
      status,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/projects/:projectId/archive', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const updateQuery = `
      UPDATE projects
      SET 
        status = 'archived',
        updated_at = NOW()
      WHERE project_id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Begin transaction - delete related records first 
    await pool.query('BEGIN');
    await pool.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
    
    // Then delete the project
    await pool.query('DELETE FROM projects WHERE project_id = $1', [projectId]);

    // Commit transaction
    await pool.query('COMMIT');
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE notification_id = $1',
      [id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/notification/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE admin_notifications SET is_read = true WHERE is_read = false AND admin_id = $1',
      [req.user.adminId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error); 
    res.status(500).json({ error: 'Server error' });
  }
});
// Delete notification.params;
app.patch('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE admin_notifications 
      SET is_read = true 
      WHERE notification_id = $1
      RETURNING *`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, is_read } = req.body;
    
    const query = `
      UPDATE admin_notifications 
      SET message = COALESCE($1, message),
          is_read = COALESCE($2, is_read)
      WHERE notification_id = $3
      RETURNING *`;

    const result = await pool.query(query, [message, is_read, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/api/admin/notifications/all', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM admin_notifications
      WHERE admin_id = $1
      RETURNING *`;

    const result = await pool.query(query, [req.user.adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No notifications found' });
    }

    res.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting notifications:', error); 
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// GET tasks by project ID
app.get("/api/task/:projectId", authenticateToken, async (req, res) => {
  try {
      const taskIdQuery = `SELECT * FROM tasks WHERE project_id = $1`;
      const tasks = await pool.query(taskIdQuery, [req.params.projectId]);
      res.json({ tasks: tasks.rows });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET comments by task ID 
app.get("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const commentsQuery = `SELECT * FROM task_comments WHERE task_id = $1`;
      const comments = await pool.query(commentsQuery, [taskId]);
      res.json({ comments: comments.rows });
  } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Get activity logs
app.get("/activity/:projectId", authenticateToken, async (req, res) => {
  try {
      const { projectId } = req.params;
      const logsQuery = `
          SELECT * FROM activity_log 
          WHERE project_id = $1 
          ORDER BY created_at DESC
      `;
      const logs = await pool.query(logsQuery, [projectId]);
      res.json({ logs: logs.rows });
  } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get tasks assigned to team member 
app.get('/api/member/tasks', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const tasksQuery = `
          SELECT t.task_id, t.title, t.description, t.status, t.due_date 
          FROM tasks t
          JOIN team_members tm ON t.assigned_to = tm.user_id
          WHERE tm.user_id = $1
      `;
      const result = await pool.query(tasksQuery, [req.user.userId]);
      res.json({ tasks: result.rows });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get projects assigned to team member
app.get('/api/member/projectdetails', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const projectQuery = `
          SELECT p.id, p.name, p.description 
          FROM projects p
          JOIN team_members tm ON p.id = tm.project_id
          WHERE tm.user_id = $1
      `;
      const result = await pool.query(projectQuery, [req.user.userId]);
      res.json({ projects: result.rows });
  } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update task status
app.put('/api/tasks/:taskId', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { status } = req.body;

      if (!["To Do", "In Progress", "Completed"].includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
      }

      const updateTaskQuery = `
          UPDATE tasks 
          SET status = $1 
          WHERE task_id = $2 AND assigned_to = $3
          RETURNING *
      `;
      
      const result = await pool.query(updateTaskQuery, [status, taskId, req.user.userId]);

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Task not found or not assigned to you" });
      }

      res.json({ message: 'Task status updated successfully' });
  } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Add comment to task
app.post('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { comment } = req.body;

      if (!comment || comment.trim() === "") {
          return res.status(400).json({ error: "Comment cannot be empty" });
      }

      const insertCommentQuery = `
          INSERT INTO task_comments (task_id, user_id, comment, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
      `;

      await pool.query(insertCommentQuery, [taskId, req.user.userId, comment]);
      res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Get activity logs
app.get("/activity/:projectId", authenticateToken, async (req, res) => {
  try {
      const { projectId } = req.params;
      const logsQuery = `
          SELECT * FROM activity_log 
          WHERE project_id = $1 
          ORDER BY created_at DESC
      `;
      const logs = await pool.query(logsQuery, [projectId]);
      res.json({ logs: logs.rows });
  } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get tasks assigned to team member 
app.get('/api/member/tasks', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const tasksQuery = `
          SELECT t.task_id, t.title, t.description, t.status, t.due_date 
          FROM tasks t
          JOIN team_members tm ON t.assigned_to = tm.user_id
          WHERE tm.user_id = $1
      `;
      const result = await pool.query(tasksQuery, [req.user.userId]);
      res.json({ tasks: result.rows });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get projects assigned to team member
app.get('/api/member/projectdetails', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const projectQuery = `
          SELECT p.id, p.name, p.description 
          FROM projects p
          JOIN team_members tm ON p.id = tm.project_id
          WHERE tm.user_id = $1
      `;
      const result = await pool.query(projectQuery, [req.user.userId]);
      res.json({ projects: result.rows });
  } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update task status
app.put('/api/tasks/:taskId', authenticateToken, isTeamMember, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { status } = req.body;

      if (!["To Do", "In Progress", "Completed"].includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
      }

      const updateTaskQuery = `
          UPDATE tasks 
          SET status = $1 
          WHERE task_id = $2 AND assigned_to = $3
          RETURNING *
      `;
      
      const result = await pool.query(updateTaskQuery, [status, taskId, req.user.userId]);

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Task not found or not assigned to you" });
      }

      res.json({ message: 'Task status updated successfully' });
  } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Add comment to task
app.post('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { comment } = req.body;

      if (!comment || comment.trim() === "") {
          return res.status(400).json({ error: "Comment cannot be empty" });
      }

      const insertCommentQuery = `
          INSERT INTO task_comments (task_id, user_id, comment, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
      `;

      await pool.query(insertCommentQuery, [taskId, req.user.userId, comment]);
      res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { title, description, project_id, assigned_to, status, priority, due_date, assigned_type } = req.body;
    
    await client.query('BEGIN');

    // Verify project ownership
    const projectCheck = await client.query(
      `SELECT p.owner_id 
       FROM projects p
       WHERE p.project_id = $1`,
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectCheck.rows[0].owner_id !== req.user.adminId) {
      await client.query('ROLLBACK'); 
      return res.status(403).json({ error: 'Unauthorized to create tasks for this project' });
    }

    // Insert task
    const insertQuery = `
      INSERT INTO tasks (
        title, 
        description, 
        project_id, 
        assigned_to,
        status,
        priority,
        due_date,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`;

    const result = await client.query(insertQuery, [
      title,
      description,
      project_id,
      assigned_to,
      status,
      priority,
      due_date,
      req.user.adminId
    ]);

    await client.query('COMMIT');

    // Log activity
    await logActivity({
      userId: req.user.adminId,
      projectId: project_id,
      action: 'task_created',
      details: `Task "${title}" created`
    });

    res.status(201).json({ 
      task: result.rows[0],
      message: 'Task created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    client.release();
  }
});
// Get team details
app.get('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.id;

    // Role check: only allow Project Managers or Admins
    if (req.user.role !== 'Project Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: "You don't have the privilege to view this team. Please contact your admin."
      });
    }

    // Fetch team details including team members and associated project info
    const query = `
      SELECT 
        tm.team_id,
        u.user_id,
        u.name AS member_name,
        u.email,
        u.role AS user_role,
        tm.role AS team_role,
        t.name AS team_name,
        t.status AS team_status,
        p.project_id,
        p.name AS project_name,
        p.description AS project_description
      FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id 
      JOIN teams t ON tm.team_id = t.team_id
      JOIN projects p ON t.project_id = p.project_id
      WHERE tm.team_id = $1
    `;

    const result = await pool.query(query, [teamId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team: result.rows });

  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).json({ 
      error: "Server error", 
      message: "Something went wrong" 
    });
  }
});

// Create team
app.post('/api/project-manager/team', authenticateToken, async (req, res) => {
  try {
    const { name, projectid } = req.body;
    
    const ownerId = await pool.query(
      `SELECT admin_id FROM admins WHERE company_id = $1`,
      [req.user.companyId]
    );

    const insertTeamQuery = `
      INSERT INTO teams (
        name, 
        created_at, 
        owner_id, 
        project_id
      ) VALUES ($1, NOW(), $2, $3) 
      RETURNING *
    `;

    const insertTeamResult = await pool.query(insertTeamQuery, [
      name,
      ownerId.rows[0].admin_id,
      projectid
    ]);

    res.json(insertTeamResult.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong'
    });
  }
});

// Delete team
app.delete('/api/project-manager/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const deleteTeamQuery = `DELETE FROM teams WHERE team_id = $1`;
    const deleteTeamResult = await pool.query(deleteTeamQuery, [teamId]);

    res.json(deleteTeamResult.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong'
    });
  }
});
// Calendar event endpoints
app.get('/api/calendar-events', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        ce.event_id AS id,
        ce.title,
        ce.description,
        ce.event_date AS date,
        p.name AS project_name
      FROM calendar_events ce
      JOIN projects p ON ce.project_id = p.project_id
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE pm.user_id = $1
      ORDER BY ce.event_date DESC
    `;

    const result = await pool.query(query, [req.user.userId]);
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/calendar', authenticateToken, async (req, res) => {
  try {
    const { start, end, timezone } = req.query;
    const userId = req.user.userId;

    const query = `
      SELECT 
        ce.*,
        array_agg(ea.user_id) as attendees
      FROM calendar_events ce
      LEFT JOIN event_attendees ea ON ce.event_id = ea.event_id
      WHERE 
        (ce.created_by = $1 OR ea.user_id = $1 OR ce.is_private = false)
        AND ce.event_date AT TIME ZONE $2 >= $3 AT TIME ZONE $2
        AND ce.end_date AT TIME ZONE $2 <= $4 AT TIME ZONE $2
      GROUP BY ce.event_id
    `;

    const result = await pool.query(query, [userId, timezone, start, end]);

    res.json(result.rows.map(event => ({
      event_id: event.event_id,
      title: event.title, 
      event_date: event.event_date,
      end_date: event.end_date,
      all_day: event.all_day,
      event_color: event.event_color,
      location: event.location,
      status: event.status,
      attendees: event.attendees || []
    })));

  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

app.post('/api/calendar/import', authenticateToken, async (req, res) => {
  try {
    if (!req.files?.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const icsData = req.files.file.data.toString();
    const jcalData = ical.parse(icsData);
    const comp = new ical.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');
    const importedEvents = [];

    for (const event of events) {
      const summary = event.getFirstPropertyValue('summary');
      const start = event.getFirstPropertyValue('dtstart').toJSDate();
      const end = event.getFirstPropertyValue('dtend').toJSDate();

      const newEvent = await pool.query(
        `INSERT INTO calendar_events (
          title, event_date, end_date, created_by,
          all_day, timezone, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [
          summary,
          start,
          end, 
          req.user.userId,
          event.getFirstPropertyValue('x-all-day') || false,
          event.getFirstPropertyValue('x-timezone') || 'UTC'
        ]
      );

      importedEvents.push(newEvent.rows[0]);
    }

    res.json({
      imported_events: importedEvents.length,
      events: importedEvents
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process ICS file'
    });
  }
});
app.get('/api/member/team', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Query to get team members from projects user is part of
    const teamQuery = `
      SELECT DISTINCT ON (u.user_id)
        u.user_id,
        u.name,
        u.email, 
        u.role AS user_role,
        u.profile_picture,
        p.project_id,
        p.name AS project_name,
        pm.role AS project_role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      JOIN projects p ON pm.project_id = p.project_id
      WHERE pm.project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE user_id = $1
      )
      AND u.user_id != $1
      ORDER BY u.user_id, p.created_at DESC
    `;

    const result = await pool.query(teamQuery, [userId]);

    res.json({ 
      team_members: result.rows
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve team members' 
    });
  }
});
// Impersonate user endpoint
const impersonateUser = async (req, res) => {
  try {
    // Get user details for impersonation
    const query = `
      SELECT user_id, name, email, role 
      FROM users 
      WHERE user_id = $1`;

    const { rows } = await pool.query(query, [req.params.userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate token with user data
    const token = generateToken(rows[0]);

    res.json({ 
      token,
      user: rows[0]
    });

  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Handler for fetching audit logs 
const getAuditLogs = async (req, res) => {
  try {
    const query = `
      SELECT 
        al.log_id,
        al.user_id,
        u.name AS user_name,
        al.admin_id,
        a.first_name || ' ' || a.last_name AS admin_name,
        al.ip_address,
        al.action_type,
        al.action_details,
        al.timestamp
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN admins a ON al.admin_id = a.admin_id
      ORDER BY al.timestamp DESC
      LIMIT 100`;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Validate allowed roles
    const allowedRoles = ['Admin', 'Project Manager', 'Team Leader', 'Member'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const query = `
      UPDATE users 
      SET role = $1, 
          updated_at = NOW() 
      WHERE user_id = $2 
      RETURNING user_id, name, email, role, updated_at`;

    const result = await pool.query(query, [role, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Route handlers
app.post('/api/impersonate/:userId', authenticateToken, impersonateUser);
app.get('/api/admin/audit-logs', authenticateToken, getAuditLogs);
app.patch('/api/users/:userId/role', authenticateToken, updateUserRole);
// System metrics endpoint
app.get("/api/security/metrics", authenticateToken, async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    res.status(500).json({ error: "Error fetching system metrics: " + error });
  }
});

// Database backup endpoint 
app.post("/api/admin/backup", authenticateToken, async (req, res) => {
  try {
    const { file_path } = req.body;

    if (!file_path) {
      return res.status(400).json({ error: "File path is required" });
    }

    const backupCommand = `pg_dump -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${file_path}`;
    console.log("Executing backup command:", backupCommand);

    exec(backupCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Backup error:", error.message);
        return res.status(500).json({ error: "Backup failed" });
      }

      if (stderr) {
        console.error("Backup stderr:", stderr);
      }

      res.json({ message: "Database backup initiated successfully" });
    });

  } catch (error) {
    console.error("Error in backup:", error);
    res.status(500).json({ error: "Backup failed" });
  }
});

// Assign project manager endpoint
app.put('/api/project/:projectId/assign-manager', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { managerId } = req.body;

    if (!managerId) {
      return res.status(400).json({ error: "Manager ID is required" });
    }

    // Update project owner
    const updateProjectQuery = `
      UPDATE projects
      SET owner_id = $1
      WHERE project_id = $2
      RETURNING *`;

    const projectResult = await pool.query(updateProjectQuery, [managerId, projectId]);

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Update project membership
    const upsertMemberQuery = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'Project Manager')
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET role = EXCLUDED.role
      RETURNING *`;

    const memberResult = await pool.query(upsertMemberQuery, [projectId, managerId]);

    res.json({
      message: "Project manager assigned successfully",
      project: projectResult.rows[0],
      projectMember: memberResult.rows[0]
    });

  } catch (error) {
    console.error("Error assigning project manager:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User skills endpoint
app.get("/api/user-skills", authenticateToken, async (req, res) => {
  try {
    const company_id = req.user.companyId;
    
    const userSkill = await pool.query(`
      SELECT us.skill_name, us.experience_level
      FROM user_skills us
      JOIN users u ON u.user_id = us.user_id
      WHERE u.company_id = $1`, [company_id]);

    if (userSkill.rows.length === 0) {
      res.json({ message: "no data found", data: [] });
    } else {
      res.json({ message: "data found", data: userSkill.rows });
    }
  } catch (error) {
    console.error("Error fetching user skills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Add user skills endpoint
app.post("/api/user-skills", authenticateToken, async (req, res) => {
  try {
    const user_id = req.body.user_id || req.user.userId;
    const { skill_name, experience_level } = req.body;

    if (!skill_name || !experience_level) {
      return res.status(400).json({ 
        message: "Skill name and experience level are required"
      });
    }

    const userSkillUpdate = await pool.query(`
      INSERT INTO user_skills (user_id, skill_name, experience_level, added_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [user_id, skill_name, experience_level]);

    if (userSkillUpdate.rows.length === 0) {
      return res.json({ 
        message: "Failed to add skill", 
        data: [] 
      });
    }

    res.json({ 
      message: "User skill added successfully",
      data: userSkillUpdate.rows 
    });

  } catch (error) {
    console.error("Error adding user skill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add team members endpoint
app.post("/api/project-manager/team/:teamId/add-members", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { teamId } = req.params;
    const { members } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Members array is required" });
    }

    await client.query('BEGIN');
    
    const results = [];
    let updatedTeam = null;
    let teamLeaderUpdated = false;

    for (const member of members) {
      // Validate member data
      if (!member.user_id || 
          typeof member.is_manager === 'undefined' || 
          typeof member.available === 'undefined') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Invalid member data structure" });
      }

      const role = member.is_manager ? 'Project Manager' : 'Member';

      // Add team member
      const teamResult = await client.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [teamId, member.user_id, role]);

      // Update team leader if manager
      if (member.is_manager && !teamLeaderUpdated) {
        const teamUpdateResult = await client.query(`
          UPDATE teams 
          SET leader_id = $1 
          WHERE team_id = $2
          RETURNING *
        `, [member.user_id, teamId]);

        updatedTeam = teamUpdateResult.rows[0];
        teamLeaderUpdated = true;
      }

      // Update user status
      const userResult = await client.query(`
        UPDATE users 
        SET status = 'active'
        WHERE user_id = $1
        RETURNING *
      `, [member.user_id]);

      // Update availability status
      const availabilityResult = await client.query(`
        INSERT INTO available_member (user_id, status)
        VALUES ($1, CASE 
          WHEN $2 = true THEN 'available'
          WHEN $2 = false THEN 'busy'
          ELSE 'offline'
        END)
        ON CONFLICT (user_id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *
      `, [member.user_id, member.available]);

      results.push({
        team_member: teamResult.rows[0],
        user: userResult.rows[0],
        availability: availabilityResult.rows[0]
      });
    }

    // Get final team data if needed
    if (!teamLeaderUpdated) {
      const teamData = await client.query(
        'SELECT * FROM teams WHERE team_id = $1',
        [teamId]
      );
      updatedTeam = teamData.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${members.length} members processed successfully`,
      results,
      team: updatedTeam
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding team members:', error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message
    });
  } finally {
    client.release();
  }
});  // From authenticated user's token
// Get available members endpoint
app.get('/api/available-members', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const query = `
      SELECT 
        u.user_id AS id,
        u.name,
        u.email,
        u.role,
        u.last_active,
        am.status,
        am.updated_at AS last_status_update
      FROM users u
      JOIN available_member am ON u.user_id = am.user_id
      WHERE u.company_id = $1
    `;

    const result = await pool.query(query, [companyId]);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create new meeting endpoint
app.post('/api/meetings', authenticateToken, upload.single('file'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { 
      title,
      date,
      time,
      agenda,
      projectId,
      participants 
    } = req.body;

    // Validate required fields
    if (!title || !date || !time || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    // Handle file upload if present
    let file_id = null;
    if (req.file) {
      const fileQuery = `
        INSERT INTO files (project_id, uploaded_by, file_url)
        VALUES ($1, $2, $3)
        RETURNING file_id
      `;
      const fileResult = await client.query(fileQuery, [
        projectId,
        req.user.userId,
        req.file.path
      ]);
      file_id = fileResult.rows[0].file_id;
    }

    // Create meeting
    const meetingQuery = `
      INSERT INTO meetings (
        title, 
        meeting_date, 
        meeting_time, 
        created_by, 
        company_id, 
        agenda, 
        file_id,
        created_user_role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const meetingResult = await client.query(meetingQuery, [
      title,
      date,
      time, 
      req.user.userId || req.user.adminId,
      req.user.companyId,
      agenda,
      file_id,
      req.user.role
    ]);

    // Add participants if any
    if (participants?.length > 0) {
      await client.query(
        `INSERT INTO meeting_invites (meeting_id, user_id)
         SELECT $1, unnest($2::uuid[])
         ON CONFLICT DO NOTHING`,
        [meetingResult.rows[0].meeting_id, participants]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      meeting: meetingResult.rows[0],
      participants: participants || []
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({ message: 'Failed to create meeting' });
    }
    
  
  });

// Get meetings list endpoint
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = String(req.user.userId || req.user.adminId);

    const meetingsQuery = `
      SELECT DISTINCT m.* 
      FROM meetings m
      LEFT JOIN meeting_invites mi ON m.meeting_id = mi.meeting_id
      WHERE m.company_id = $1 
        AND m.created_by = $2
      ORDER BY m.meeting_date DESC, m.meeting_time DESC
    `;

    const meetingsResult = await pool.query(meetingsQuery, [companyId, userId]);

    // Get participants and files for each meeting
    const meetingsWithParticipants = await Promise.all(
      meetingsResult.rows.map(async (meeting) => {
        const participantsQuery = `
          SELECT u.user_id, u.name, u.email, u.profile_picture, u.role 
          FROM meeting_invites mi
          JOIN users u ON mi.user_id = u.user_id
          WHERE mi.meeting_id = $1
        `;
        const participantsResult = await pool.query(participantsQuery, [meeting.meeting_id]);

        let file = null;
        if (meeting.file_id) {
          const fileQuery = `
            SELECT file_id, file_url, uploaded_by, created_at
            FROM files
            WHERE file_id = $1
          `;
          const fileResult = await pool.query(fileQuery, [meeting.file_id]);
          file = fileResult.rows[0];
        }

        return {
          ...meeting,
          participants: participantsResult.rows,
          agenda_file: file
        };
      })
    );

    res.json(meetingsWithParticipants);

  } catch (error) {
    console.error('Meeting retrieval error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

// Get meetings count endpoint
app.get('/api/meetings/count', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date } = req.query;
    
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM meetings
      WHERE company_id = $1
    `;
    
    const params = [companyId];
    let paramIndex = 2;
    
    // Add date filter if provided
    if (date) {
      const operator = date.split('.')[0]; // Extract operator like 'gt', 'lt', 'gte', 'lte'
      const dateValue = date.split('.')[1]; // Extract the date value
      
      if (operator === 'gt') {
        countQuery += ` AND meeting_date > $${paramIndex}`;
        params.push(dateValue);
        paramIndex++;
      } else if (operator === 'lt') {
        countQuery += ` AND meeting_date < $${paramIndex}`;
        params.push(dateValue);
        paramIndex++;
      } else if (operator === 'gte') {
        countQuery += ` AND meeting_date >= $${paramIndex}`;
        params.push(dateValue);
        paramIndex++;
      } else if (operator === 'lte') {
        countQuery += ` AND meeting_date <= $${paramIndex}`;
        params.push(dateValue);
        paramIndex++;
      } else if (operator === 'eq') {
        countQuery += ` AND meeting_date = $${paramIndex}`;
        params.push(dateValue);
        paramIndex++;
      }
    }
    
    const result = await pool.query(countQuery, params);
    res.json({ count: parseInt(result.rows[0].count) });
    
  } catch (error) {
    console.error('Error counting meetings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

// End meeting endpoint
app.post('/api/meetings/:meetingId/end', authenticateToken,  async (req, res) => {
  try {
    if (req.meeting.host_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only host can end meeting' });
    }

    await pool.query(
      `UPDATE meetings 
       SET end_time = NOW()
       WHERE meeting_id = $1`,
      [req.params.meetingId]
    );

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
});

// Socket.IO meeting handlers
io.on('connection', (socket) => {

  // Join meeting handler
  socket.on('join-meeting', async (data) => {
    try {
      const { meetingId, userId } = data;
      socket.join(meetingId);

      const [userResult, meetingResult] = await Promise.all([
        pool.query('SELECT name, role FROM users WHERE user_id = $1', [userId]),
        pool.query('SELECT channel_name FROM meetings WHERE meeting_id = $1', [meetingId])
      ]);

      const user = userResult.rows[0];
      const meeting = meetingResult.rows[0];

      socket.to(meetingId).emit('user-joined', {
        userId,
        name: user.name,
        role: user.role,
        channel: meeting.channel_name,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Socket join error:', error);
    }
  });

  // Meeting control handler (mute all, lock meeting etc)
  socket.on('meeting-control', (data) => {
    const { meetingId, action } = data;
    socket.to(meetingId).emit('meeting-update', action);
  });

  // Screen sharing handler
  socket.on('share-screen', (data) => {
    const { meetingId, userId } = data;
    socket.to(meetingId).emit('screen-sharing', {
      userId,
      timestamp: new Date()
    });
  });

  // Leave meeting handler 
  socket.on('leave-meeting', (data) => {
    const { meetingId, userId } = data;
    socket.leave(meetingId);
    socket.to(meetingId).emit('user-left', { userId });
  });

});

// Get available users for meeting
const getUsersForMeeting = async (req, res) => {
  try {
    const { role, userId, companyId } = req.user;
    const { projectId } = req.query;
    let users;

    if (role === 'Admin') {
      if (projectId) {
        users = await pool.query(`
          SELECT DISTINCT u.*
          FROM users u
          LEFT JOIN team_members tm ON tm.user_id = u.user_id
          LEFT JOIN teams t ON t.team_id = tm.team_id
          LEFT JOIN project_members pm ON pm.user_id = u.user_id
          WHERE (t.project_id = $1 OR pm.project_id = $1)
            AND u.company_id = $2
        `, [projectId, companyId]);
      } else {
        users = await pool.query('SELECT * FROM users WHERE company_id = $1', [companyId]);
      }
    } else if (role === 'Project Manager') {
      users = await pool.query(`
        SELECT DISTINCT u.*
        FROM users u 
        LEFT JOIN team_members tm ON tm.user_id = u.user_id
        LEFT JOIN teams t ON t.team_id = tm.team_id
        LEFT JOIN project_members pm ON pm.user_id = u.user_id
        WHERE (t.project_id = $1 OR pm.project_id = $1)
          AND u.company_id = $2
      `, [projectId, companyId]);
    } else if (role === 'Team Leader') {
      users = await pool.query(`
        SELECT u.*
        FROM users u
        JOIN team_members tm ON tm.user_id = u.user_id
        JOIN teams t ON t.team_id = tm.team_id
        WHERE t.leader_id = $1
          AND u.company_id = $2
      `, [userId, companyId]);
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ users: users.rows });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// CALENDAR API ENDPOINTS
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { start, end, project_id, show_recurring } = req.query;
    const userId = req.user.userId;

    let query = `
      SELECT 
        ce.*,
        COALESCE(jsonb_agg(jsonb_build_object(
          'user_id', ea.user_id,
          'status', ea.status
        )) FILTER (WHERE ea.user_id IS NOT NULL), '[]') as attendees
      FROM calendar_events ce
      LEFT JOIN event_attendees ea ON ce.event_id = ea.event_id
      WHERE (
        ce.event_date BETWEEN $1 AND $2
        OR ce.end_date BETWEEN $1 AND $2
        OR (ce.event_date <= $1 AND ce.end_date >= $2)
      )
    `;

    const params = [start, end];

    if (project_id) {
      query += ` AND ce.project_id = $${params.length + 1}`;
      params.push(project_id);
    }

    if (show_recurring === 'false') {
      query += ` AND ce.recurrence_rule IS NULL`;
    }

    query += ` 
      GROUP BY ce.event_id
      ORDER BY ce.event_date
    `;

    const result = await pool.query(query, params);

    // Handle recurring events
    const events = result.rows.flatMap(event => {
      if (!event.recurrence_rule) return [event];

      try {
        const rule = rrule.rrulestr(event.recurrence_rule);
        const dates = rule.between(new Date(start), new Date(end));

        return dates.map(date => ({
          ...event,
          event_id: `${event.event_id}-${date.getTime()}`,
          event_date: date,
          end_date: new Date(date.getTime() + (new Date(event.end_date) - new Date(event.event_date))),
          is_recurring_instance: true,
          parent_event_id: event.event_id
        }));
      } catch (err) {
        console.error('Error parsing recurrence rule:', err);
        return [event];
      }
    });

    res.json(events);

  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new calendar event 
app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      description,
      event_date,
      end_date, 
      all_day,
      project_id,
      event_color,
      location,
      recurrence_rule,
      attendees
    } = req.body;

    const eventId = uuidv4();
    
    await client.query('BEGIN');

    // Insert main event
    const eventQuery = `
      INSERT INTO calendar_events (
        event_id, 
        title,
        description,
        event_date,
        end_date,
        all_day,
        project_id,
        created_by,
        event_color,
        location,
        recurrence_rule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const eventResult = await client.query(eventQuery, [
      eventId,
      title,
      description,
      event_date,
      end_date,
      all_day,
      project_id,
      req.user.userId,
      event_color,
      location,
      recurrence_rule
    ]);

    // Add attendees if any
    if (attendees?.length) {
      await client.query(`
        INSERT INTO event_attendees (event_id, user_id)
        SELECT $1, unnest($2::uuid[])
      `, [eventId, attendees]);
    }

    await client.query('COMMIT');
    
    res.status(201).json(eventResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
});
app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      description,
      event_date,
      end_date,
      all_day,
      project_id,
      event_color,
      location,
      recurrence_rule,
      attendees,
      reminders
    } = req.body;

    const eventId = uuidv4();
    const userId = req.user.userId;

    await client.query('BEGIN');

    // Insert main event
    const eventQuery = `
      INSERT INTO calendar_events (
        event_id,
        title,
        description, 
        event_date,
        end_date,
        all_day,
        project_id,
        created_by,
        event_color,
        location,
        recurrence_rule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const eventParams = [
      eventId,
      title,
      description,
      event_date,
      end_date,
      all_day,
      project_id,
      userId,
      event_color,
      location,
      recurrence_rule
    ];

    const eventResult = await client.query(eventQuery, eventParams);
    const event = eventResult.rows[0];

    // Add attendees if any
    if (attendees?.length) {
      const attendeeQuery = `
        INSERT INTO event_attendees (event_id, user_id)
        SELECT $1, unnest($2::uuid[])
      `;
      await client.query(attendeeQuery, [eventId, attendees]);
    }

    // Add reminders if any  
    if (reminders?.length) {
      const reminderQuery = `
        INSERT INTO event_reminders (event_id, minutes_before)
        SELECT $1, unnest($2::int[])
      `;
      await client.query(reminderQuery, [eventId, reminders]);
    }

    await client.query('COMMIT');

    // Notify via Socket.IO
    io.to(`project-${project_id}`).emit('calendar-update', event);

    res.status(201).json(event);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
});
// Budget Controller


// Budget Routes


// Helper Functions
function calculateMetrics(rows) {
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  return {
    totalBudget: 100000, // Example static value 
    utilized: total,
    remaining: 100000 - total,
    averageSpend: total / (rows.length || 1)
  };
}

function generatePDFReport(doc, data) {
  // Header
  doc.fontSize(18).text("Budget Report", { align: "center" });
  doc.moveDown();

  // Items
  data.forEach((item, index) => {
    doc.fontSize(12)
      .text(`${index + 1}. ${item.description}`, { continued: true })
      .text(`$${item.amount}`, { align: "right" });
    doc.text(`Project: ${item.project_name} | Category: ${item.category}`);
    doc.moveDown();
  });
}

function convertToCSV(data) {
  const headers = ["Project", "Type", "Category", "Amount", "Description", "Date"];
  const rows = data.map(item => [
    `"${item.project_name}"`,
    `"${item.item_type}"`,
    `"${item.category}"`,
    item.amount,
    `"${item.description}"`,
    new Date(item.date).toISOString()
  ]);

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

// Budget Controller
const budgetController = {
  getBudgetItems: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT * FROM budget_items WHERE project_id = ANY($1) 
         LIMIT $2 OFFSET $3`,
        [req.body.project_ids, limit, offset]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch budget items' });
    }
  },

  analyzeBudget: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const items = await client.query(
        'SELECT * FROM budget_items WHERE project_id = ANY($1)',
        [req.body.project_ids]
      );

      const analysis = {
        metrics: calculateMetrics(items.rows),
        trends: items.rows // Add trend calculation if needed
      };

      await client.query('COMMIT');
      res.json(analysis);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error:', error);
      res.status(500).json({ error: 'Budget analysis failed' });
    } finally {
      client.release();
    }
  },

  generateReport: async (req, res) => {
    try {
      const { project_ids, format } = req.body;

      const data = await pool.query(
        'SELECT * FROM budget_items WHERE project_id = ANY($1)',
        [project_ids]
      );

      if (format === 'csv') {
        res.header('Content-Type', 'text/csv');
        res.attachment('budget_report.csv');
        return res.send(convertToCSV(data.rows));
      }

      if (format === 'pdf') {
        const doc = new PDFDocument();
        res.header('Content-Type', 'application/pdf');
        res.attachment('budget_report.pdf');
        doc.pipe(res);
        generatePDFReport(doc, data.rows);
        doc.end();
      }

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Report generation failed' });
    }
  }
};


app.get("/api/budget", authenticateToken, budgetController.getBudgetItems);
app.post("/api/budget/analyze", authenticateToken, budgetController.analyzeBudget);
app.post("/api/budget/report", authenticateToken, budgetController.generateReport);
// Get time entries with filters
app.get('/api/time-entries', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, projectId } = req.query;

    let query = `
      SELECT t.*, p.name as project_name 
      FROM time_entries t
      LEFT JOIN projects p ON t.project_id = p.project_id
      WHERE t.user_id = $1
    `;

    const params = [userId];
    let paramCount = 2;

    if (startDate && endDate) {
      query += ` AND t.entry_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    }

    if (projectId) {
      query += ` AND t.project_id = $${paramCount}`;
      params.push(projectId);
      paramCount++;
    }

    query += ` ORDER BY t.entry_date DESC`;

    const result = await pool.query(query, params);
    res.json({ timeEntries: result.rows });

  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get time entry statistics
app.get('/api/time-entries/stats', authenticateToken, async (req, res) => {
  try {
    const range = req.query.range || 'week';
    
    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '1 ${range}', 
          CURRENT_DATE, 
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(SUM(t.hours), 0) AS total_hours,
        COUNT(t.*) AS entries_count
      FROM date_series ds
      LEFT JOIN time_entries t 
        ON ds.date = t.entry_date 
        AND t.user_id = $1
      GROUP BY ds.date
      ORDER BY ds.date
    `;

    const result = await pool.query(query, [req.user.userId]);
    res.json({ stats: result.rows });

  } catch (error) {
    console.error('Error loading time entry stats:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});
// Connect or update integration
app.post('/api/integrations/:service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params;
    const { 
      accessToken, 
      apiToken, 
      domain, 
      clientId, 
      clientSecret, 
      refreshToken, 
      apiKey 
    } = req.body;

    const result = await pool.query(`
      INSERT INTO integrations (
        service_name,
        user_id,
        company_id,
        access_token,
        api_token,
        domain,
        client_id,
        client_secret, 
        refresh_token,
        api_key,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (service_name, user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        api_token = EXCLUDED.api_token,
        domain = EXCLUDED.domain,
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        refresh_token = EXCLUDED.refresh_token,
        api_key = EXCLUDED.api_key,
        updated_at = NOW()
      RETURNING *`,
      [
        service,
        req.user.userId,
        req.user.companyId,
        accessToken,
        apiToken,
        domain,
        clientId,
        clientSecret,
        refreshToken,
        apiKey
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error connecting to ${req.params.service}:`, error);
    res.status(500).json({ error: `Failed to connect to ${req.params.service}` });
  }
});

// Delete integration 
app.delete('/api/integrations/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM integrations WHERE id = $1 AND (user_id = $2 OR company_id = $3)',
      [req.params.id, req.user.userId, req.user.companyId]
    );

    res.json({ message: 'Integration disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting integration:', error); 
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// Get integration status
app.get('/api/integrations/:service/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM integrations WHERE service_name = $1 AND (user_id = $2 OR company_id = $3)',
      [req.params.service, req.user.userId, req.user.companyId]
    );

    res.json({
      connected: result.rows.length > 0,
      details: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error checking integration status:', error);
    res.status(500).json({ error: 'Failed to check integration status' });
  }
});
// Get admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE company_id = $1) as total_users,
        (SELECT COUNT(*) FROM projects 
         WHERE owner_id IN (SELECT admin_id FROM admins WHERE company_id = $1)) as total_projects,
        (SELECT COUNT(*) FROM tasks 
         WHERE project_id IN (
           SELECT project_id FROM projects 
           WHERE owner_id IN (SELECT admin_id FROM admins WHERE company_id = $1)
         )) as total_tasks,
        (SELECT COUNT(*) FROM tasks 
         WHERE status = 'pending' 
         AND project_id IN (
           SELECT project_id FROM projects 
           WHERE owner_id IN (SELECT admin_id FROM admins WHERE company_id = $1)
         )) as pending_tasks
    `;

    const stats = await pool.query(statsQuery, [req.user.companyId]);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin projects
app.get('/api/admin/projects', authenticateToken, async (req, res) => {
  try {
    const projectsQuery = `
      SELECT 
        p.*,
        COUNT(DISTINCT t.task_id) as task_count,
        COUNT(DISTINCT pm.user_id) as team_member_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks,
        (SELECT first_name || ' ' || last_name FROM admins WHERE admin_id = p.owner_id) as owner_name
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.owner_id IN (
        SELECT admin_id FROM admins WHERE company_id = $1
      )
      GROUP BY p.project_id, p.owner_id
      ORDER BY p.created_at DESC
    `;

    const projects = await pool.query(projectsQuery, [req.user.companyId]);
    res.json(projects.rows);
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin tasks 
app.get('/api/admin/tasks', authenticateToken, async (req, res) => {
  try {
    const tasksQuery = `
      SELECT 
        t.*,
        p.name as project_name,
        u.name as assigned_to_name,
        u.profile_picture as assigned_to_avatar
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE p.owner_id IN (
        SELECT admin_id FROM admins WHERE company_id = $1
      )
      AND t.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY t.created_at DESC
      LIMIT 10
    `;

    const tasks = await pool.query(tasksQuery, [req.user.companyId]);

    if (tasks.rows.length === 0) {
      return res.json({
        message: 'No tasks found',
        tasks: []
      });
    }

    res.json({
      message: 'Tasks retrieved successfully', 
      tasks: tasks.rows
    });
  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});      
// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
      const { token, newPassword } = req.body;

      // Verify token is valid and not expired
      const resetToken = await pool.query(
          'SELECT * FROM password_reset_tokens WHERE token = $1 AND is_used = false AND expires_at > NOW()',
          [token]
      );

      if (resetToken.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and reset failed login attempts
      await pool.query(
          'UPDATE users SET password = $1, failed_login_attempts = 0, account_locked_until = NULL WHERE user_id = $2',
          [hashedPassword, resetToken.rows[0].user_id]
      );

      // Mark token as used
      await pool.query(
          'UPDATE password_reset_tokens SET is_used = true WHERE token_id = $1',
          [resetToken.rows[0].token_id]
      );

      // Create admin notification
      await pool.query(
          'INSERT INTO admin_notifications (message, admin_id, is_read) VALUES ($1, 1, false)',
          [`User ${resetToken.rows[0].user_id} has reset their password`]
      );

      res.json({ message: 'Password reset successful' });
  } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Split task into subtasks endpoint
app.post('/api/tasks/:taskId/split', authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { subtasks } = req.body;

      // Verify task exists
      const taskResult = await pool.query(
          'SELECT * FROM tasks WHERE task_id = $1',
          [taskId]
      );

      if (taskResult.rows.length === 0) {
          return res.status(404).json({ message: 'Task not found' });
      }

      // Create subtasks
      for (const subtask of subtasks) {
          await pool.query(
              `INSERT INTO subtasks 
              (title, description, parent_task_id, assigned_to, due_date, status) 
              VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                  subtask.title,
                  subtask.description,
                  taskId,
                  subtask.assigned_to || null,
                  subtask.due_date || null,
                  'pending'
              ]
          );
      }

      res.status(201).json({ message: 'Subtasks created successfully' });
  } catch (error) {
      console.error('Error creating subtasks:', error);
      res.status(500).json({ message: 'Failed to create subtasks' });
  }
});

// Get subtasks for a task endpoint
app.get('/api/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
      const { taskId } = req.params;

      const result = await pool.query(
          `SELECT st.*, u.name as assigned_to_name 
           FROM subtasks st
           LEFT JOIN users u ON st.assigned_to = u.user_id 
           WHERE st.parent_task_id = $1`,
          [taskId]
      );

      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching subtasks:', error);
      res.status(500).json({ message: 'Failed to fetch subtasks' });
  }
});
app.put('/api/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const { title, description, assigned_to, due_date, status } = req.body;
    
    await pool.query(
      `UPDATE subtasks 
       SET title = $1, description = $2, assigned_to = $3, due_date = $4, status = $5 
       WHERE subtask_id = $6`,
      [title, description, assigned_to, due_date, status, subtaskId]
    );
    
    res.json({ message: 'Subtask updated' });
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Failed to update subtask' });
  }
});

app.delete('/api/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    await pool.query('DELETE FROM subtasks WHERE subtask_id = $1', [subtaskId]);
    res.json({ message: 'Subtask deleted' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ message: 'Failed to delete subtask' });
  }
});

// Delete a community post
app.delete('/api/community/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    await pool.query('DELETE FROM community_posts WHERE id = $1', [postId]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

// Delete a post reply
app.delete('/api/community/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const { replyId } = req.params;
    await pool.query('DELETE FROM post_replies WHERE id = $1', [replyId]);
    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ message: 'Failed to delete reply' });
  }
});

// Delete a help request
app.delete('/api/community/help-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    await pool.query('DELETE FROM help_requests WHERE id = $1', [requestId]);
    res.json({ message: 'Help request deleted successfully' });
  } catch (error) {
    console.error('Error deleting help request:', error);
    res.status(500).json({ message: 'Failed to delete help request' });
  }
});

// Delete a community space
app.delete('/api/community/spaces/:spaceId', authenticateToken, async (req, res) => {
  try {
    const { spaceId } = req.params;
    await pool.query('DELETE FROM community_spaces WHERE id = $1', [spaceId]);
    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ message: 'Failed to delete space' });
  }
});

// ==================== COMMUNITY ENDPOINTS ====================

// Get community spaces
app.get('/api/community/spaces', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const spacesQuery = `
      SELECT 
        cs.space_id,
        cs.name,
        cs.description,
        cs.posts as post_count,
        cs.created_at,
        u.name as created_by_name,
        u.profile_picture as created_by_avatar
      FROM community_spaces cs
      JOIN users u ON cs.created_by = u.user_id
      JOIN users cu ON cu.company_id = $1
      WHERE cs.created_by = cu.user_id
      ORDER BY cs.created_at DESC
    `;

    // Assign colors and icons for frontend display
    const result = await pool.query(spacesQuery, [companyId]);
    const colors = ['blue', 'green', 'purple', 'orange', 'red', 'indigo', 'pink'];
    const icons = ['FaCode', 'FaDatabase', 'FaProjectDiagram', 'FaUsers', 'FaServer', 'FaMobile', 'FaCloud'];

    const spacesWithMeta = result.rows.map((space, index) => ({
      ...space,
      id: space.space_id, // For frontend compatibility
      color: colors[index % colors.length],
      icon: icons[index % icons.length],
    }));

    res.json(spacesWithMeta);
  } catch (error) {
    console.error('Error fetching community spaces:', error);
    res.status(500).json({ error: 'Failed to retrieve community spaces' });
  }
});

// Security overview endpoint
app.get('/api/security/overview', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Get latest security metrics for the company
    const metricsQuery = `
      SELECT 
        vulnerability_count,
        security_score,
        threat_count,
        incident_count,
        login_failure_count
      FROM security_metrics
      WHERE company_id = $1
      ORDER BY measured_at DESC
      LIMIT 1
    `;
    
    const metricsResult = await pool.query(metricsQuery, [companyId]);

    // Get recent audit events count
    const auditQuery = `
      SELECT COUNT(*) as audit_events 
      FROM audit_logs 
      WHERE timestamp > NOW() - INTERVAL '7 days'
      AND (user_id IN (SELECT user_id FROM users WHERE company_id = $1) 
           OR admin_id IN (SELECT admin_id FROM admins WHERE company_id = $1))
    `;
    
    const auditResult = await pool.query(auditQuery, [companyId]);

    // Return the security data
    res.json({
      metrics: metricsResult.rows[0] || null,
      auditEvents: parseInt(auditResult.rows[0]?.audit_events || 0)
    });
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch security overview',
      details: error.message 
    });
  }
});

// Activity feed endpoint
app.get('/api/activity', authenticateToken, async (req, res) => {
  try {
    // Get recent activity logs with user details
    const companyId = req.user.companyId;
    const activityQuery = `
      SELECT 
        al.log_id,
        al.user_id,
        u.name as user_name,
        u.profile_picture,
        al.project_id,
        p.name as project_name,
        al.action,
        COALESCE(al.timestamp, al.created_at) as timestamp
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      WHERE u.company_id = $1
      ORDER BY COALESCE(al.timestamp, al.created_at) DESC
      LIMIT 20
    `;
    
    // If no activity logs exist yet, create sample data for demo purposes
    const checkActivity = await pool.query(
      'SELECT COUNT(*) as count FROM activity_logs'
    );
    
    if (parseInt(checkActivity.rows[0].count) === 0) {
      await createSampleActivityLogs(companyId);
    }
    
    const result = await pool.query(activityQuery, [companyId]);
    
    // If still no results, return empty array
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// System metrics utility function
const getSystemMetrics = async () => {
  try {
    // Get CPU information
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    
    // Calculate CPU usage with pidusage (for the current process)
    const stats = await pidusage(process.pid);
    const cpuUsage = Math.round(stats.cpu);

    // Memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.round((1 - freeMem / totalMem) * 100);

    // Get system uptime in days
    const uptimeDays = Math.floor(os.uptime() / 86400);
    
    // Simulate disk usage (since Node.js doesn't provide direct disk stats)
    const diskUsage = Math.floor(Math.random() * 40) + 30; // Random between 30-70%
    
    // Simulate network traffic
    const networkIn = (Math.random() * 10).toFixed(2);
    const networkOut = (Math.random() * 8).toFixed(2);
    
    // Simulate services
    const activeServices = Math.floor(Math.random() * 15) + 10;
    const totalServices = activeServices + Math.floor(Math.random() * 5) + 2;
    
    // Get last reboot time
    const lastReboot = new Date(Date.now() - (os.uptime() * 1000));
    
    // Simulate temperature
    const temperature = Math.floor(Math.random() * 15) + 35; // Random between 35-50°C

    return {
      cpu: cpuUsage,
      cpuCount: cpuCount,
      memory: memoryUsage,
      disk: diskUsage,
      uptime: uptimeDays,
      network: {
        in: networkIn,
        out: networkOut
      },
      services: {
        active: activeServices,
        total: totalServices
      },
      lastReboot: lastReboot.toISOString(),
      temperature: temperature
    };
  } catch (error) {
    console.error("Error getting system metrics:", error);
    return {
      cpu: 0,
      cpuCount: 0,
      memory: 0,
      disk: 0,
      uptime: 0,
      network: { in: 0, out: 0 },
      services: { active: 0, total: 0 },
      lastReboot: new Date().toISOString(),
      temperature: 0
    };
  }
};

// Add endpoint for system metrics
app.get('/api/system/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error in system metrics endpoint:", error);
    res.status(500).json({ 
      error: "Failed to retrieve system metrics",
      details: error.message
    });
  }
});

// Fix for GET /api/tasks endpoint (used by AdminDashboard)
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Get all tasks for company with pagination
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        p.name as project_name,
        p.project_id,
        u.name as assigned_to_name,
        u.user_id as assigned_user_id,
        u.profile_picture as assigned_user_avatar,
        t.created_at,
        t.updated_at,
        COUNT(*) OVER() as total_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE p.owner_id IN (
        SELECT admin_id FROM admins WHERE company_id = $1
      )
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [companyId, limit, offset]);
    
    res.json({
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(result.rows[0]?.total_count || 0),
        totalPages: Math.ceil(parseInt(result.rows[0]?.total_count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Fix for GET /api/activity endpoint (used by AdminDashboard)
app.get('/api/activity', authenticateToken, async (req, res) => {
  try {
    // Get recent activity logs with user details
    const companyId = req.user.companyId;
    const activityQuery = `
      SELECT 
        al.log_id,
        al.user_id,
        u.name as user_name,
        u.profile_picture,
        al.project_id,
        p.name as project_name,
        al.action,
        COALESCE(al.timestamp, al.created_at) as timestamp
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      WHERE u.company_id = $1
      ORDER BY COALESCE(al.timestamp, al.created_at) DESC
      LIMIT 20
    `;
    
    // If no activity logs exist yet, create sample data for demo purposes
    const checkActivity = await pool.query(
      'SELECT COUNT(*) as count FROM activity_logs'
    );
    
    if (parseInt(checkActivity.rows[0].count) === 0) {
      await createSampleActivityLogs(companyId);
    }
    
    const result = await pool.query(activityQuery, [companyId]);
    
    // If still no results, return empty array
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Helper function to create sample activity logs for demo
async function createSampleActivityLogs(companyId) {
  try {
    // Get some users from the company
    const usersResult = await pool.query(
      'SELECT user_id FROM users WHERE company_id = $1 LIMIT 5',
      [companyId]
    );
    
    if (usersResult.rows.length === 0) return;
    
    // Get some projects
    const projectsResult = await pool.query(
      `SELECT project_id FROM projects 
       WHERE owner_id IN (SELECT admin_id FROM admins WHERE company_id = $1) 
       LIMIT 3`,
      [companyId]
    );
    
    if (projectsResult.rows.length === 0) return;
    
    // Sample actions
    const actions = [
      'created a task',
      'updated project details',
      'commented on a task',
      'uploaded a file',
      'completed a task',
      'started a meeting',
      'added a team member'
    ];
    
    // Insert 10 sample activities
    for (let i = 0; i < 10; i++) {
      const userId = usersResult.rows[i % usersResult.rows.length].user_id;
      const projectId = projectsResult.rows[i % projectsResult.rows.length].project_id;
      const action = actions[i % actions.length];
      const timestamp = new Date(Date.now() - i * 3600000); // Hours ago
      
      await pool.query(
        `INSERT INTO activity_logs (user_id, project_id, action, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [userId, projectId, action, timestamp]
      );
    }
  } catch (error) {
    console.error('Error creating sample activity logs:', error);
  }
}

// Fix for GET /api/security/overview endpoint (used by AdminDashboard)
app.get('/api/security/overview', authenticateToken, async (req, res) => {
  try {
    // Check if security tables have data
    const companyId = req.user.companyId;
    const threatCheck = await pool.query(
      'SELECT COUNT(*) as count FROM security_threats'
    );
    
    // If no security data exists yet, create sample data for demo
    if (parseInt(threatCheck.rows[0].count) === 0) {
      await createSampleSecurityData();
    }
    
    // Get security metrics from various tables
    const threatResult = await pool.query(
      'SELECT COUNT(*) as threats FROM security_threats'
    );
    
    const vulnResult = await pool.query(
      'SELECT COUNT(*) as vulnerabilities FROM security_vulnerabilities WHERE severity = $1',
      ['high']
    );
    
    const incidentsResult = await pool.query(
      'SELECT COUNT(*) as incidents FROM security_incidents WHERE severity != $1',
      ['low']
    );
    
    const auditResult = await pool.query(
      'SELECT COUNT(*) as audit_events FROM audit_logs WHERE timestamp > NOW() - INTERVAL $1',
      ['7 days']
    );
    
    // Return aggregated security data
    res.json({
      threats: parseInt(threatResult.rows[0]?.threats || 0),
      vulnerabilities: parseInt(vulnResult.rows[0]?.vulnerabilities || 0),
      incidents: parseInt(incidentsResult.rows[0]?.incidents || 0),
      auditEvents: parseInt(auditResult.rows[0]?.audit_events || 0),
      securityScore: calculateSecurityScore(
        parseInt(threatResult.rows[0]?.threats || 0),
        parseInt(vulnResult.rows[0]?.vulnerabilities || 0),
        parseInt(incidentsResult.rows[0]?.incidents || 0)
      ),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch security overview',
      threats: 0,
      vulnerabilities: 0,
      incidents: 0,
      auditEvents: 0,
      securityScore: 0,
      lastUpdated: new Date().toISOString()
    });
  }
});

// Helper function to calculate security score
function calculateSecurityScore(threats, vulnerabilities, incidents) {
  // Simple algorithm: 100 - (threats*5 + vulnerabilities*3 + incidents*10)
  // Capped at 0-100 range
  const score = 100 - (threats * 5 + vulnerabilities * 3 + incidents * 10);
  return Math.max(0, Math.min(100, score));
}

// Helper function to create sample security data
async function createSampleSecurityData() {
  try {
    // Insert sample security threats
    const threatTypes = ['Suspicious Login', 'Potential SQL Injection', 'Brute Force Attempt'];
    const severities = ['low', 'medium', 'high'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_threats (type, description, severity, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          threatTypes[i],
          `Sample security threat description for ${threatTypes[i]}`,
          severities[i],
          `192.168.1.${100 + i}`,
          new Date(Date.now() - i * 86400000) // Days ago
        ]
      );
    }
    
    // Insert sample vulnerabilities
    const vulnNames = ['Outdated Library', 'Insecure API Endpoint', 'Weak Password Policy'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_vulnerabilities (name, description, severity, created_at)
         VALUES ($1, $2, $3, $4)`,
        [
          vulnNames[i],
          `Sample vulnerability description for ${vulnNames[i]}`,
          severities[i],
          new Date(Date.now() - i * 86400000) // Days ago
        ]
      );
    }
    
    // Insert sample security incidents
    const incidentTitles = ['Unauthorized Access', 'Data Leak', 'Service Disruption'];
    const statuses = ['resolved', 'investigating', 'open'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_incidents (title, description, severity, status, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          incidentTitles[i],
          `Sample incident description for ${incidentTitles[i]}`,
          severities[i],
          statuses[i],
          new Date(Date.now() - i * 86400000) // Days ago
        ]
      );
    }
  } catch (error) {
    console.error('Error creating sample security data:', error);
  }
}

/// ==================== AI ASSISTANCE ENDPOINTS ====================

// AI response simulation for testing
async function simulateAIResponse(prompt, context) {
  // This is just a simple simulation, in production you'd call an actual AI API
  const responses = {
    'project': `Based on the project context, I recommend focusing on the critical path items first.
                Consider breaking down the larger tasks into smaller, manageable subtasks.`,
    'task': `This task looks complex. Consider the following approach:
             1. Start by gathering all requirements
             2. Create a detailed implementation plan
             3. Break it into subtasks for easier management`,
    'analysis': `My analysis shows this needs more detailed requirements. 
                The timeline seems optimistic given the complexity.`,
    'recommendation': `I recommend adding at least one more team member with backend expertise to this project.
                      The current team composition may struggle with the database optimization tasks.`,
    'default': `I've analyzed your request. Please provide more specific information about what you need assistance with.
               I can help with project planning, task analysis, or technical recommendations.`
  };

  // Wait a bit to simulate API latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return relevant response based on context, or default if no match
  const contextLower = (context || '').toLowerCase();
  if (contextLower.includes('project')) return responses.project;
  if (contextLower.includes('task')) return responses.task;
  if (contextLower.includes('analysis')) return responses.analysis;
  if (contextLower.includes('recommendation')) return responses.recommendation;
  return responses.default;
}

async function simulateTaskAnalysis(taskContext) {
  // In real implementation, this would send the task data to an AI service
  const { task } = taskContext;

  // Simple simulation response
  return {
    complexity: Math.floor(Math.random() * 100),
    estimated_hours: Math.floor(Math.random() * 40) + 5,
    risk_factors: [
      "Dependency on external API",
      "Tight deadline",
      "New technology stack"
    ],
    recommendations: [
      "Break down into smaller subtasks",
      "Address API integration first",
      "Schedule additional review meetings"
    ],
    similar_tasks: [
      { id: crypto.randomUUID(), title: "Similar past task 1" },
      { id: crypto.randomUUID(), title: "Similar past task 2" }
    ]
  };
}

/**
 * @desc    Create a new AI assistance session
 * @route   POST /api/ai/sessions
 * @access  Private
 */
app.post('/api/ai/sessions', authenticateToken, async (req, res) => {
  try {
    const { context, prompt } = req.body;

    if (!context || !prompt) {
      return res.status(400).json({ error: 'Context and prompt are required' });
    }

    // Create a new AI assistance session
    const result = await pool.query(
      `INSERT INTO ai_assistance_sessions 
       (user_id, context, initial_prompt, status, model_version)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING *`,
      [req.user.userId, context, prompt, process.env.AI_MODEL_VERSION || 'gpt-3.5-turbo']
    );

    // In a real implementation, we would call an AI service here
    // For now, we'll simulate an AI response
    const aiResponse = await simulateAIResponse(prompt, context);

    // Log the interaction
    const interactionResult = await pool.query(
      `INSERT INTO ai_interactions
       (session_id, user_message, ai_response, context_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [result.rows[0].session_id, prompt, aiResponse, JSON.stringify({ source: 'initial_prompt' })]
    );

    res.status(201).json({
      session: result.rows[0],
      interaction: interactionResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating AI session:', error);
    res.status(500).json({ error: 'Failed to create AI session' });
  }
});

/**
 * @desc    Send a message to an existing AI session
 * @route   POST /api/ai/sessions/:sessionId/interact
 * @access  Private
 */
app.post('/api/ai/sessions/:sessionId/interact', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, contextData } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify session exists and belongs to user
    const sessionResult = await pool.query(
      'SELECT * FROM ai_assistance_sessions WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.user.userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // Get session context and previous interactions for context
    const previousInteractions = await pool.query(
      `SELECT user_message, ai_response 
       FROM ai_interactions 
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    // Build context from previous interactions
    const context = {
      sessionContext: sessionResult.rows[0].context,
      history: previousInteractions.rows,
      additionalContext: contextData || {}
    };

    // In a real implementation, we would call an AI service with the task context
    const aiResponse = await simulateAIResponse(message, sessionResult.rows[0].context);

    // Log the interaction
    const interactionResult = await pool.query(
      `INSERT INTO ai_interactions
       (session_id, user_message, ai_response, context_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, message, aiResponse, JSON.stringify(contextData || {})]
    );

    res.json({
      interaction: interactionResult.rows[0],
      tokenInfo: {
        used: Math.floor(Math.random() * 500) + 100, // Simulated token usage
        remaining: 10000
      }
    });
  } catch (error) {
    console.error('Error with AI interaction:', error);
    res.status(500).json({ error: 'Failed to process AI interaction' });
  }
});

/**
 * @desc    Get all AI sessions for a user
 * @route   GET /api/ai/sessions
 * @access  Private
 */
app.get('/api/ai/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
       COUNT(i.interaction_id) as interaction_count,
       MAX(i.created_at) as last_interaction
       FROM ai_assistance_sessions s
       LEFT JOIN ai_interactions i ON s.session_id = i.session_id
       WHERE s.user_id = $1
       GROUP BY s.session_id
       ORDER BY last_interaction DESC NULLS LAST`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI sessions:', error);
    res.status(500).json({ error: 'Failed to fetch AI sessions' });
  }
});

/**
 * @desc    Get a specific AI session with its interactions
 * @route   GET /api/ai/sessions/:sessionId
 * @access  Private
 */
app.get('/api/ai/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session details
    const sessionResult = await pool.query(
      'SELECT * FROM ai_assistance_sessions WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.user.userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // Get interactions
    const interactionsResult = await pool.query(
      `SELECT * FROM ai_interactions 
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      session: sessionResult.rows[0],
      interactions: interactionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching AI session:', error);
    res.status(500).json({ error: 'Failed to fetch AI session' });
  }
});

/**
 * @desc    Close an AI session
 * @route   PUT /api/ai/sessions/:sessionId/close
 * @access  Private
 */
app.put('/api/ai/sessions/:sessionId/close', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `UPDATE ai_assistance_sessions
       SET status = 'closed', closed_at = NOW()
       WHERE session_id = $1 AND user_id = $2
       RETURNING *`,
      [sessionId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error closing AI session:', error);
    res.status(500).json({ error: 'Failed to close AI session' });
  }
});

/**
 * @desc    Submit feedback for an AI interaction
 * @route   POST /api/ai/feedback
 * @access  Private
 */
app.post('/api/ai/feedback', authenticateToken, async (req, res) => {
  try {
    const { interactionId, rating, comments, correctedResponse } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // First, update the rating in the interaction record
    await pool.query(
      'UPDATE ai_interactions SET feedback_score = $1 WHERE interaction_id = $2',
      [rating, interactionId]
    );

    // Then, insert detailed feedback
    const result = await pool.query(
      `INSERT INTO ai_feedback
       (user_id, interaction_id, rating, comments, corrected_response)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.userId, interactionId, rating, comments, correctedResponse]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting AI feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * @desc    Analyze a task using AI
 * @route   POST /api/ai/analyze-task/:taskId
 * @access  Private
 */
app.post('/api/ai/analyze-task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task details
    const taskResult = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assigned_user_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.project_id
       LEFT JOIN users u ON t.assigned_to = u.user_id
       WHERE t.task_id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Get task comments
    const commentsResult = await pool.query(
      `SELECT tc.*, u.name AS user_name
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    // Get subtasks
    const subtasksResult = await pool.query(
      `SELECT * FROM subtasks WHERE parent_task_id = $1`,
      [taskId]
    );

    // Prepare complete task context
    const taskContext = {
      task,
      comments: commentsResult.rows,
      subtasks: subtasksResult.rows
    };

    // In a real implementation, call an AI service with the task context
    // For now, simulate an analysis
    const analysis = await simulateTaskAnalysis(taskContext);

    // Record the analysis in the AI recommendations table
    await pool.query(
      `INSERT INTO ai_recommendations
       (user_id, recommendation_type, content, related_entity_type, related_entity_id, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.userId, 'task_analysis', JSON.stringify(analysis), 'task', taskId, 0.85]
    );

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing task:', error);
    res.status(500).json({ error: 'Failed to analyze task' });
  }
});

/**
 * @desc    Get AI recommendations for a user
 * @route   GET /api/ai/recommendations
 * @access  Private
 */
app.get('/api/ai/recommendations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ai_recommendations
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * @desc    Mark AI recommendation as viewed or acted upon
 * @route   PATCH /api/ai/recommendations/:recommendationId
 * @access  Private
 */
app.patch('/api/ai/recommendations/:recommendationId', authenticateToken, async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { viewed, actedUpon } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (viewed !== undefined) {
      updateFields.push(`viewed = $${paramCount++}`);
      values.push(viewed);
    }

    if (actedUpon !== undefined) {
      updateFields.push(`acted_upon = $${paramCount++}`);
      values.push(actedUpon);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }

    values.push(recommendationId, req.user.userId);

    const result = await pool.query(
      `UPDATE ai_recommendations
       SET ${updateFields.join(', ')}
       WHERE recommendation_id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    res.status(500).json({ error: 'Failed to update recommendation status' });
  }
});
// ==================== ROLE MANAGEMENT ENDPOINTS ====================

/**
 * @desc    Get all roles
 * @route   GET /api/admin/roles
 * @access  Admin
 */
app.get('/api/admin/roles', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Get roles with permissions
    const query = `
      SELECT 
        ur.role_id,
        ur.name,
        ur.description,
        ur.is_system,
        ur.created_at,
        ARRAY_AGG(rp.permission) AS permissions
      FROM user_roles ur
      LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE ur.company_id = $1
      GROUP BY ur.role_id
      ORDER BY ur.created_at DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // If no roles exist yet, create default roles
    if (result.rows.length === 0) {
      await createDefaultRoles(companyId);
      const defaultResult = await pool.query(query, [companyId]);
      return res.json(defaultResult.rows);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * @desc    Get all available permissions
 * @route   GET /api/admin/permissions
 * @access  Admin
 */
app.get('/api/admin/permissions', authenticateToken, async (req, res) => {
  try {
    // These are system-defined permissions
    const permissions = [
      { id: 'view_projects', name: 'view_projects', description: 'View all projects' },
      { id: 'create_projects', name: 'create_projects', description: 'Create new projects' },
      { id: 'edit_projects', name: 'edit_projects', description: 'Edit existing projects' },
      { id: 'delete_projects', name: 'delete_projects', description: 'Delete projects' },
      { id: 'assign_tasks', name: 'assign_tasks', description: 'Assign tasks to users' },
      { id: 'view_reports', name: 'view_reports', description: 'View reports' },
      { id: 'export_data', name: 'export_data', description: 'Export data' },
      { id: 'manage_users', name: 'manage_users', description: 'Manage system users' },
      { id: 'manage_teams', name: 'manage_teams', description: 'Manage teams' },
      { id: 'view_analytics', name: 'view_analytics', description: 'View analytics data' },
      { id: 'schedule_meetings', name: 'schedule_meetings', description: 'Schedule meetings' },
      { id: 'upload_files', name: 'upload_files', description: 'Upload files' },
      { id: 'manage_roles', name: 'manage_roles', description: 'Manage user roles' },
      { id: 'system_settings', name: 'system_settings', description: 'Change system settings' }
    ];
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * @desc    Create a new role
 * @route   POST /api/admin/roles
 * @access  Admin
 */
app.post('/api/admin/roles', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, permissions = [] } = req.body;
    const companyId = req.user.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    await client.query('BEGIN');
    
    // Create the role
    const roleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING role_id, name, description, company_id, is_system, created_at`,
      [name, description || null, companyId]
    );

    const roleId = roleResult.rows[0].role_id;
    
    // Add permissions if any
    if (permissions && permissions.length > 0) {
      // Build a bulk insert query for better performance
      const permValues = permissions.map((_, index) => `($1, $${index + 2})`).join(', ');
      const permParams = [roleId, ...permissions];
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission)
         VALUES ${permValues}`,
        permParams
      );
    }
    
    await client.query('COMMIT');
    
    // Return the created role with its permissions
    const createdRole = {
      ...roleResult.rows[0],
      permissions: permissions || []
    };
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_created',
      actionDetails: `Role created: ${name}`
    });

    res.status(201).json(createdRole);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating role:', error);
    
    // Handle duplicate role name
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Update a role
 * @route   PUT /api/admin/roles/:roleId
 * @access  Admin
 */
app.put('/api/admin/roles/:roleId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const { name, description, permissions = [] } = req.body;
    const companyId = req.user.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check if role exists and belongs to company
    const roleCheck = await client.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Check if it's a system role
    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'System roles cannot be modified' });
    }
    
    await client.query('BEGIN');
    
    // Update the role
    const roleResult = await client.query(
      `UPDATE user_roles 
       SET name = $1, description = $2
       WHERE role_id = $3
       RETURNING role_id, name, description, company_id, is_system, created_at`,
      [name, description || null, roleId]
    );
    
    // Delete existing permissions
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [roleId]
    );
    
    // Add new permissions if any
    if (permissions && permissions.length > 0) {
      // Build a bulk insert query for better performance
      const permValues = permissions.map((_, index) => `($1, $${index + 2})`).join(', ');
      const permParams = [roleId, ...permissions];
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission)
         VALUES ${permValues}`,
        permParams
      );
    }
    
    await client.query('COMMIT');
    
    // Return the updated role with its permissions
    const updatedRole = {
      ...roleResult.rows[0],
      permissions: permissions || []
    };
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_updated',
      actionDetails: `Role updated: ${name}`
    });

    res.json(updatedRole);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role:', error);
    
    // Handle duplicate role name
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Delete a role
 * @route   DELETE /api/admin/roles/:roleId
 * @access  Admin
 */
app.delete('/api/admin/roles/:roleId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const companyId = req.user.companyId;
    
    // Check if role exists and belongs to company
    const roleCheck = await client.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Check if it's a system role
    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }
    
    // Check if role is assigned to any users
    const userCheck = await client.query(
      `SELECT COUNT(*) as user_count 
       FROM user_role_assignments 
       WHERE role_id = $1`,
      [roleId]
    );
    
    if (parseInt(userCheck.rows[0].user_count) > 0) {
      return res.status(409).json({ 
        error: 'This role is assigned to users and cannot be deleted' 
      });
    }
    
    await client.query('BEGIN');
    
    // Delete role permissions first
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [roleId]
    );
    
    // Delete the role
    await client.query(
      'DELETE FROM user_roles WHERE role_id = $1',
      [roleId]
    );
    
    await client.query('COMMIT');
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_deleted',
      actionDetails: `Role deleted: ${roleCheck.rows[0].name}`
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  } finally {
    client.release();
  }
});

/**
 * @desc    Assign role to user
 * @route   POST /api/admin/users/:userId/roles
 * @access  Admin
 */
app.post('/api/admin/users/:userId/roles', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const companyId = req.user.companyId;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify role belongs to company
    const roleCheck = await pool.query(
      `SELECT * FROM user_roles 
       WHERE role_id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Assign role to user
    await pool.query(
      `INSERT INTO user_role_assignments (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_assigned',
      actionDetails: `Role '${roleCheck.rows[0].name}' assigned to user ID ${userId}`
    });

    res.status(201).json({ 
      message: `Role '${roleCheck.rows[0].name}' assigned to user successfully`
    });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: 'Failed to assign role to user' });
  }
});

/**
 * @desc    Remove role from user
 * @route   DELETE /api/admin/users/:userId/roles/:roleId
 * @access  Admin
 */
app.delete('/api/admin/users/:userId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const companyId = req.user.companyId;
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove role from user
    await pool.query(
      `DELETE FROM user_role_assignments 
       WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
    
    // Log the action
    await logAudit({
      adminId: req.user.adminId,
      ip: req.ip,
      actionType: 'role_removed',
      actionDetails: `Role ID ${roleId} removed from user ID ${userId}`
    });

    res.json({ message: 'Role removed from user successfully' });
  } catch (error) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: 'Failed to remove role from user' });
  }
});

/**
 * @desc    Get user roles
 * @route   GET /api/admin/users/:userId/roles
 * @access  Admin
 */
app.get('/api/admin/users/:userId/roles', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;
    
    // Verify user belongs to company
    const userCheck = await pool.query(
      `SELECT * FROM users 
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's roles
    const rolesQuery = `
      SELECT ur.* 
      FROM user_roles ur
      JOIN user_role_assignments ura ON ur.role_id = ura.role_id
      WHERE ura.user_id = $1
    `;
    
    const result = await pool.query(rolesQuery, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Helper function to create default roles for a new company
async function createDefaultRoles(companyId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create Admin role
    const adminRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Admin', 'Administrator with full access', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const adminRoleId = adminRoleResult.rows[0].role_id;
    
    // Add all permissions to Admin role
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'create_projects'),
       ($1, 'edit_projects'),
       ($1, 'delete_projects'),
       ($1, 'assign_tasks'),
       ($1, 'view_reports'),
       ($1, 'export_data'),
       ($1, 'manage_users'),
       ($1, 'manage_teams'),
       ($1, 'view_analytics'),
       ($1, 'schedule_meetings'),
       ($1, 'upload_files'),
       ($1, 'manage_roles'),
       ($1, 'system_settings')`,
      [adminRoleId]
    );
    
    // Create Project Manager role
    const pmRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Project Manager', 'Can manage projects and team members', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const pmRoleId = pmRoleResult.rows[0].role_id;
    
    // Add PM permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'create_projects'),
       ($1, 'edit_projects'),
       ($1, 'assign_tasks'),
       ($1, 'view_reports'),
       ($1, 'export_data'),
       ($1, 'manage_teams'),
       ($1, 'view_analytics'),
       ($1, 'schedule_meetings'),
       ($1, 'upload_files')`,
      [pmRoleId]
    );
    
    // Create Team Member role
    const memberRoleResult = await client.query(
      `INSERT INTO user_roles (name, description, company_id, is_system, created_at)
       VALUES ('Team Member', 'Basic access to assigned projects', $1, true, NOW())
       RETURNING role_id`,
      [companyId]
    );
    
    const memberRoleId = memberRoleResult.rows[0].role_id;
    
    // Add Member permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission)
       VALUES 
       ($1, 'view_projects'),
       ($1, 'upload_files')`,
      [memberRoleId]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating default roles:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get project members endpoint
app.get('/api/projects/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const query = `
      SELECT 
        pm.user_id,
        u.name,
        u.email,
        u.profile_picture,
        pm.role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.project_id = $1
    `;
    
    const result = await pool.query(query, [projectId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project manager endpoint
app.get('/api/projects/:projectId/manager', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // First check if there's a designated project manager in project_members
    const managerQuery = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.profile_picture
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.project_id = $1 AND pm.role = 'Project Manager'
      LIMIT 1
    `;
    
    let result = await pool.query(managerQuery, [projectId]);
    
    // If no project manager found, get the project owner
    if (result.rows.length === 0) {
      const ownerQuery = `
        SELECT 
          u.user_id,
          u.name,
          u.email,
          u.profile_picture
        FROM projects p
        JOIN users u ON p.owner_id = u.user_id
        WHERE p.project_id = $1
        LIMIT 1
      `;
      
      result = await pool.query(ownerQuery, [projectId]);
    }
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project manager:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});