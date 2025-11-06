import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import http from 'http';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import os from 'os'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Allow frontend connection
    methods: ['GET', 'POST'],
  },
});
const { Pool } = pkg;
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room (e.g., project-specific room)
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  // Handle chat messages
  socket.on('sendMessage', async (data) => {
    const { room, message, senderId } = data;

    // Save message to database
    const insertMessageQuery = `
      INSERT INTO messages (room, sender_id, message, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *`;

    try {
      const result = await pool.query(insertMessageQuery, [room, senderId, message]);
      const savedMessage = result.rows[0];

      // Emit message to room
      io.to(room).emit('receiveMessage', {
        sender: savedMessage.sender_id,
        message: savedMessage.message,
        createdAt: savedMessage.created_at,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Helper Functions
const generateAccessToken = (user) => {
  return jwt.sign({ userId: user.user_id }, process.env.SECRET_KEY, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ userId: user.user_id }, process.env.REFRESH_SECRET_KEY, { expiresIn: '7d' });
};

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token is invalid' });
    req.user = user;
    next();
  });
};

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

// Routes

// 🟢 Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const getUserQuery = 'SELECT user_id, name, email, role, password_hash FROM users WHERE email = $1';
    const result = await pool.query(getUserQuery, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const authToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await pool.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    res.json({ authToken, refreshToken, user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🟢 Register


import path from 'path';

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if(/\.(jpg|jpeg|png|gif)$/.test(ext)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

app.post('/api/register', upload.single('profilePicture'), async (req, res) => {
  const {
    name,
    email,
    username,
    password,
    role,
    company,
    timeZone,
    agile,
    phone
  } = req.body;

  // Validate required fields according to your DB schema
  if (!name || !email || !username || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate role against check constraint
  const validRoles = ['Admin', 'Manager', 'Member', 'Developer', 'Project Manager'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  try {
    // Check for existing user
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare insert query
    const insertQuery = `
      INSERT INTO users (
        name, email, username, password_hash, role,
        company, time_zone, agile, phone, profile_picture
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id, name, email, role, created_at`;

    const values = [
      name,
      email,
      username,
      hashedPassword,
      role || 'Member', // Default to Member
      company || null,
      timeZone || null,
      agile === 'true', // Convert string to boolean
      phone || null,
      req.file ? req.file.path : null
    ];

    // Execute query
    const result = await pool.query(insertQuery, values);
    
    // Return success response
    res.status(201).json({ 
      message: 'User registered successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific errors
    let message = 'Registration failed';
    if (error.code === '23505') { // Unique violation
      message = 'Email or username already exists';
    } else if (error.message.includes('file format')) {
      message = 'Invalid file type. Only images allowed';
    }

    res.status(500).json({ message });
  }
});
// 🟢 Logout
app.post('/api/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    await pool.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [req.user.userId]);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/projectdetails', authenticateToken, async (req, res) => {
  try {
      const userId = req.user.userId; // Extract userId properly

      const projectQuery = `
      SELECT 
          p.project_id, 
          p.name,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.project_id) AS totalTasks,
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) AS totalTeamMembers
      FROM projects p  
      WHERE p.owner_id = $1;
      `;

      // Run the query with extracted userId
      const result = await pool.query(projectQuery, [userId]);

      console.log(result.rows); // Logging the correct result

      res.json({ projects: result.rows }); // Sending correct response
  } catch (error) {
      console.error('Error fetching project details:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get('/api/notifications',authenticateToken,async(req,res)=>{
    try{
        const notificationsQuery = `Select * From notifications where user_id = $1`
        const notifications = await pool.query(notificationsQuery,[req.user_id])
        res.json({notifications:notifications.rows})
        }catch(error){
            console.error('Error fetching notifications:', error);
            res.status(500).json({ message: 'Internal Server Error' });
            }
        
    }
)
app.get("/api/task/:projectId",authenticateToken,async (req,res)=>{
    try{
        const taskIdQuery = `select * from tasks where project_id = $1`
        const tasks = await pool.query(taskIdQuery,[req.params.projectId])
        res.json({tasks:tasks.rows})
        }catch(error){
            console.error('Error fetching tasks:', error);
            res.status(500).json({ message: 'Internal Server Error' });
            }
    
})
app.get("/api/task/:taskId/comments",authenticateToken,async (req,res)=>{
    try{
        const {taskId} = req.params;
        const commentsQuery = `select * from comments where task_id = $1`
        const comments = await pool.query(commentsQuery,[taskId])
        res.json({comments:comments.rows})
        }catch(error){
            console.error('Error fetching comments:', error);
            res.status(500).json({ message: 'Internal Server Error' });
            }
            })
app.get("/activity/:projectId",authenticateToken,async(req,res)=>{
    try{
        const {projectId} = req.params;
        const logsQuery =   `select * from activity_log where project_id = $1 order by created_at desc`
        const logs = await pool.query(logsQuery,[projectId])
        res.json({logs:logs.rows})
        }catch(error){
            console.error('Error fetching activity logs:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
})    

// 🟢 Get Tasks Assigned to Team Member
app.get('/api/member/tasks', authenticateToken, isTeamMember, async (req, res) => {
    try {
           console.log("inside")
        const tasksQuery = `
            SELECT t.task_id, t.title, t.description, t.status, t.due_date 
            FROM tasks t
            JOIN team_members tm ON t.assigned_to = tm.user_id
            WHERE tm.user_id = $1`;
        
        console.log('this is from ',req.user.userId)
        const result = await pool.query(tasksQuery, [req.user.userId]);
    
        console.log('this is result',result)
        
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 🟢 Get Notifications for Team Member
app.get('/api/member/notifications', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const notificationsQuery = `
            SELECT message, created_at 
            FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC`;

        const result = await pool.query(notificationsQuery, [req.user.userId]);
        res.json({ notifications: result.rows });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 🟢 Get Projects Assigned to Team Member
app.get('/api/member/projectdetails', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const projectQuery = `
            SELECT p.id, p.name, p.description 
            FROM projects p
            JOIN team_members tm ON p.id = tm.project_id
            WHERE tm.user_id = $1`;

        const result = await pool.query(projectQuery, [req.user.userId]);
        res.json({ projects: result.rows });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 🟢 Update Task Status
app.put('/api/member/tasks/:taskId', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        if (!["To Do", "In Progress", "Completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const updateTaskQuery = `
            UPDATE tasks 
            SET status = $1 
            WHERE id = $2 AND assigned_to = $3 
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

// 🟢 Add Comment to Task
app.post('/api/member/tasks/:taskId/comments', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment } = req.body;

        if (!comment || comment.trim() === "") {
            return res.status(400).json({ error: "Comment cannot be empty" });
        }

        const insertCommentQuery = `
            INSERT INTO task_comments (task_id, user_id, comment, created_at)
            VALUES ($1, $2, $3, NOW())`;

        await pool.query(insertCommentQuery, [taskId, req.user.userId, comment]);

        res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get('/api/member/tasks/:taskId/comments', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { taskId } = req.params;
        const commentsQuery = `
            SELECT c.id, c.comment, c.created_at, u.name AS commenter_name
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = $1 
            ORDER BY c.created_at DESC`;

        const result = await pool.query(commentsQuery, [taskId]);
        res.json({ comments: result.rows });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/api/member/logout', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [req.user.userId]);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get("/api/project-manager/teams", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Correct destructuring
    const query = `
      SELECT 
          t.team_id,
          t.name AS team_name,
          t.owner_id,
          COUNT(tm.user_id) AS total_members,
          COALESCE(JSON_AGG(
              DISTINCT jsonb_build_object(
                  'project_id', p.project_id,
                  'project_name', p.name,
                  'project_description', p.description
              )
          ) FILTER (WHERE p.project_id IS NOT NULL), '[]') AS projects
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.team_id
      LEFT JOIN projects p ON p.owner_id = t.owner_id
      WHERE t.owner_id = $1  -- Teams owned by the user
        
      GROUP BY t.team_id;
    `;

    const { rows } = await pool.query(query, [userId]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching teams:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch teams data"
    });
  }
});
// 🟢 File Upload

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

// 🟢 Time Tracking
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

// 🟢 Fetch Time Entries
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

// 🟢 Fetch Messages
app.get('/api/messages/:room', authenticateToken, async (req, res) => {
  try {
    const { room } = req.params;

    const messagesQuery = `
      SELECT m.message, m.created_at, u.name AS sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.room = $1 
      ORDER BY m.created_at ASC`;

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
      const { userId } = req.user;
  
      // Fetch projects where the user is the project manager (owner_id matches user_id)
      const projectsQuery = `
        SELECT p.project_id, p.name, p.description, p.created_at
        FROM projects p
        WHERE p.owner_id = $1`;
  
      const result = await pool.query(projectsQuery, [userId]);
      res.json({ projects: result.rows });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
      const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;
  
      // Check if the logged-in user is the project manager for the given project
      const checkProjectQuery = 'SELECT owner_id FROM projects WHERE project_id = $1';
      const projectResult = await pool.query(checkProjectQuery, [project_id]);
  
      if (projectResult.rows.length === 0 || projectResult.rows[0].owner_id !== req.user.userId) {
        return res.status(403).json({ error: 'You are not authorized to add tasks to this project.' });
      }
  
      const insertTaskQuery = `
        INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`;
  
      const result = await pool.query(insertTaskQuery, [
        title,
        description,
        project_id,
        assigned_to,
        status,
        priority,
        due_date,
      ]);
  
      res.status(201).json({ task: result.rows[0] });
    } catch (error) {
      console.error('Error adding task:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { title, description, status, priority, due_date } = req.body;
  
      // Check if the logged-in user is the project manager for the task's project
      const checkTaskQuery = `
        SELECT p.owner_id
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        WHERE t.task_id = $1`;
      const taskResult = await pool.query(checkTaskQuery, [taskId]);
  
      if (taskResult.rows.length === 0 || taskResult.rows[0].owner_id !== req.user.userId) {
        return res.status(403).json({ error: 'You are not authorized to update this task.' });
      }
  
      const updateTaskQuery = `
        UPDATE tasks
        SET title = $1, description = $2, status = $3, priority = $4, due_date = $5
        WHERE task_id = $6
        RETURNING *`;
  
      const result = await pool.query(updateTaskQuery, [
        title,
        description,
        status,
        priority,
        due_date,
        taskId,
      ]);
  
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
        SELECT p.owner_id
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        WHERE t.task_id = $1`;
      const taskResult = await pool.query(checkTaskQuery, [taskId]);
  
      if (taskResult.rows.length === 0 || taskResult.rows[0].owner_id !== req.user.userId) {
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

// Routes
// Get tasks for project manager
app.get('/api/project-manager/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.task_id, t.title, t.description, t.status, t.priority, t.due_date,
             p.name as project_name, u.name as assigned_user
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      LEFT JOIN users u ON t.assigned_to = u.user_id
      WHERE p.owner_id = $1
    `, [req.user.userId]);

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;

  try {
    // Verify project ownership
    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE project_id = $1',
      [project_id]
    );

    if (projectCheck.rows.length === 0 || projectCheck.rows[0].owner_id !== req.user.userId) {
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

// Update task
app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, due_date } = req.body;

  try {
    // Verify project ownership
    const projectCheck = await pool.query(`
      SELECT p.owner_id 
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = $1
    `, [taskId]);

    if (projectCheck.rows.length === 0 || projectCheck.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this task' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4, due_date = $5
       WHERE task_id = $6
       RETURNING *`,
      [title, description, status, priority, due_date, taskId]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task


// Get projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT project_id, name FROM projects WHERE owner_id = $1',
      [req.user.userId]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, name FROM users where role = 'Member' "
    );
    res.json({ users: result.rows });
    console.log(result)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
      const userId = req.user;
      const projectId = req.params.id;

      // Check if the user is a Project Manager
      const userRoleResult = await pool.query(
          `SELECT role FROM users WHERE user_id = $1`,
          [userId]
      );

      if (!userRoleResult.rows.length || userRoleResult.rows[0].role !== 'Project Manager') {
          return res.status(403).json({ error: 'Forbidden', message: "You don't have privilege, contact admin" });
      }

      // Fetch the team and team members of the Project Manager
      const teamQuery = `
          SELECT 
              t.team_id, t.name AS team_name, 
              u.user_id, u.name AS member_name, 
              u.email, u.role AS user_role, 
              tm.role AS team_role
          FROM teams t
          JOIN team_members tm ON t.team_id = tm.team_id
          JOIN users u ON tm.user_id = u.user_id
          WHERE t.owner_id = (
              SELECT pm.user_id 
              FROM project_members pm
              JOIN users u ON pm.user_id = u.user_id
              WHERE pm.project_id = $1 AND u.role = 'Project Manager'
          )
      `;

      const teamResult = await pool.query(teamQuery, [projectId]);

      res.json(teamResult.rows);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error', message: 'Something went wrong' });
  }
});
// File Routes
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, u.name as submitter_name 
      FROM files f
      JOIN users u ON f.user_id = u.user_id
      WHERE f.status = 'pending'
    `);
    res.json({ files: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['approve', 'reject'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE files SET status = $1 WHERE file_id = $2',
      [status, req.params.id]
   );
   res.json({ message: `File ${req.params.id} updated` });
   } catch (error) {
            res.json({error:error})
   }
   });
  // GET /api/reports

const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Get consolidated report data
// Reports API Endpoints
app.get('/api/reports', authenticateToken, async (req, res) => {
  const { start, end } = req.query;

  try {
    const [projectProgress, taskDistribution, timeline, metrics] = await Promise.all([
      getProjectProgress(start, end),
      getTaskDistribution(start, end),
      getTimelineData(start, end),
      getDetailedMetrics(start, end)
    ]);

    res.json({
      projects: projectProgress,
      taskDistribution,
      timeline,
      metrics
    });
 

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Helper Functions for Reports
async function getProjectProgress(startDate, endDate) {
  const query = `
    SELECT 
      p.project_id AS id,
      p.name,
      COUNT(t.task_id) AS total_tasks,
      COUNT(t.task_id) FILTER (WHERE t.status = 'Completed') AS completed,
      COUNT(t.task_id) FILTER (WHERE t.status != 'Completed') AS pending,
      COUNT(pm.user_id) AS team_size,
      u.name AS owner_name
    FROM projects p
    LEFT JOIN tasks t ON p.project_id = t.project_id
    LEFT JOIN project_members pm ON p.project_id = pm.project_id
    LEFT JOIN users u ON p.owner_id = u.user_id
    WHERE 
      ($1::DATE IS NULL OR p.created_at >= $1) AND
      ($2::DATE IS NULL OR p.created_at <= $2)
    GROUP BY p.project_id, u.name
    ORDER BY p.created_at DESC`;

  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

async function getTaskDistribution(startDate, endDate) {
  const query = `
    SELECT 
      status AS name, 
      COUNT(*) AS value,
      CASE status
        WHEN 'Completed' THEN '#10B981'
        WHEN 'In Progress' THEN '#3B82F6'
        ELSE '#F59E0B'
      END AS color
    FROM tasks
    WHERE 
      ($1::DATE IS NULL OR created_at >= $1) AND
      ($2::DATE IS NULL OR created_at <= $2)
    GROUP BY status`;

  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

async function getTimelineData(startDate, endDate) {
  const query = `
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS tasks,
      COUNT(*) FILTER (WHERE status = 'Completed') AS milestones
    FROM tasks
    WHERE 
      ($1::DATE IS NULL OR created_at >= $1) AND
      ($2::DATE IS NULL OR created_at <= $2)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)`;

  const result = await pool.query(query, [startDate, endDate]);
  return result.rows.map(row => ({
    ...row,
    date: formatDate(row.date)
  }));
}

async function getDetailedMetrics(startDate, endDate) {
  const query = `
   SELECT
  p.project_id,
  p.name,
  p.created_at,
  (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.project_id) AS total_tasks,
  (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) AS team_size,
  (SELECT COUNT(*) FROM files f WHERE f.project_id = p.project_id) AS total_files,
  COALESCE((
    SELECT SUM(te.hours)
    FROM time_entries te
    WHERE te.user_id IN (
      SELECT pm.user_id
      FROM project_members pm
      WHERE pm.project_id = p.project_id
    )
  ), 0) AS total_hours
FROM projects p
WHERE
  ($1::DATE IS NULL OR p.created_at >= $1) AND
  ($2::DATE IS NULL OR p.created_at <= $2);`;

  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

// Helper function to format date


// Create reports table if it doesn't exist
const createReportsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        recipient VARCHAR(50) NOT NULL CHECK (recipient IN ('admin', 'team')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
        feedback TEXT,
        attachment_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Reports table created or already exists');
  } catch (error) {
    console.error('Error creating reports table:', error);
  }
};

createReportsTable();

// Get team reports
app.get('/api/reports/team', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch reports where recipient is 'team' and authored by the logged-in user
    const query = `
      SELECT 
        r.report_id AS id,
        r.title,
        r.content,
        r.status,
        r.feedback,
        r.attachment_url,
        r.created_at AS date,
        jsonb_build_object(
          'name', u.name,
          'email', u.email
        ) AS author
      FROM reports r
      JOIN users u ON r.author_id = u.user_id
      WHERE r.recipient = 'team' AND r.author_id = $1
      ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching team reports:', error);
    res.status(500).json({ error: 'Failed to fetch team reports' });
  }
});

// Get admin reports
app.get('/api/reports/admin', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch reports where recipient is 'admin' and authored by the logged-in user
    const query = `
      SELECT 
        r.report_id AS id,
        r.title,
        r.content,
        r.status,
        r.feedback,
        r.attachment_url,
        r.created_at AS date,
        jsonb_build_object(
          'name', u.name,
          'email', u.email
        ) AS author
      FROM reports r
      JOIN users u ON r.author_id = u.user_id
      WHERE r.recipient = 'admin' AND r.author_id = $1
      ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    res.status(500).json({ error: 'Failed to fetch admin reports' });
  }
});

// Submit a report to admin
app.post('/api/admin', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, content, attachment_url } = req.body;

    const query = `
      INSERT INTO reports (title, content, author_id, recipient, attachment_url)
      VALUES ($1, $2, $3, 'admin', $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [title, content, userId, attachment_url]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting report to admin:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Update report status
app.patch('/api/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, feedback } = req.body;

    const query = `
      UPDATE reports
      SET status = $1, feedback = $2
      WHERE report_id = $3
      RETURNING *;
    `;

    const result = await pool.query(query, [status, feedback, reportId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// Add to existing imports
import pdfkit from 'pdfkit';


// Configure report storage
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/reports/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const reportUpload = multer({ storage: reportStorage });

// New database queries
const getTimeReportData = async (userId, type) => {
  let dateFilter = '';
  const now = new Date();
  
  switch(type) {
    case 'daily':
      dateFilter = `DATE(te.created_at) = CURRENT_DATE`;
      break;
    case 'weekly':
      dateFilter = `EXTRACT(WEEK FROM te.created_at) = EXTRACT(WEEK FROM NOW())`;
      break;
    case 'monthly':
      dateFilter = `EXTRACT(MONTH FROM te.created_at) = EXTRACT(MONTH FROM NOW())`;
      break;
    default:
      dateFilter = '1=1';
  }

  const query = `
    SELECT 
      p.name AS project_name,
      SUM(te.hours) AS total_hours,
      COUNT(t.task_id) AS tasks_completed,
      ARRAY_AGG(DISTINCT t.title) AS task_titles
    FROM time_entries te
    JOIN project_members pm ON te.user_id = pm.user_id
    JOIN projects p ON pm.project_id = p.project_id
    LEFT JOIN tasks t ON t.assigned_to = te.user_id 
      AND t.status = 'Completed'
      AND DATE(t.created_at) BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE
    WHERE te.user_id = $1 AND ${dateFilter}
    GROUP BY p.project_id
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Calendar Events Endpoints
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Report Endpoints
app.post('/api/reports', 
  authenticateToken, 
  reportUpload.single('reportFile'),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const filePath = req.file.path;

      const query = `
        INSERT INTO reports 
          (user_id, title, description, file_path, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        req.user.userId,
        title,
        description,
        filePath
      ]);
      
      res.status(201).json({ report: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Report submission failed' });
    }
  }
);

app.get('/api/member/reports', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        report_id AS id,
        title,
        description,
        file_path AS url,
        created_at
      FROM reports
      WHERE author_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [req.user.userId]);
    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Error fetching reports:', error); // Log the error
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});


app.get('/api/member/reports/time', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const reportData = await getTimeReportData(req.user.userId, type);

    // Generate CSV
    const csvData = reportData.map(entry => 
      `${entry.project_name},${entry.total_hours},${entry.tasks_completed}`
    ).join('\n');

    // Generate PDF
    const pdfDoc = new pdfkit();
    let pdfBuffer = Buffer.from('');
    pdfDoc.on('data', chunk => pdfBuffer = Buffer.concat([pdfBuffer, chunk]));
    
    reportData.forEach(entry => {
      pdfDoc.text(`Project: ${entry.project_name}`);
      pdfDoc.text(`Hours: ${entry.total_hours}`);
      pdfDoc.text(`Tasks Completed: ${entry.tasks_completed}`);
      pdfDoc.moveDown();
    });

    pdfDoc.end();

    res.json({
      csv: `Project,Hours,Tasks\n${csvData}`,
      pdf: pdfBuffer.toString('base64'),
      summary: {
        totalHours: reportData.reduce((sum, entry) => sum + parseFloat(entry.total_hours), 0),
        completedTasks: reportData.reduce((sum, entry) => sum + entry.tasks_completed, 0),
        projects: reportData.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Report generation failed' });
  }
});

// WebSocket Message History
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        m.message_id AS id,
        m.message,
        m.created_at,
        u.name AS sender
      FROM messages m
      JOIN users u ON m.user_id = u.user_id
      WHERE m.room = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [req.query.room]);
    res.json({ messages: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});
app.get('/api/member/team', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

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

    const { rows } = await pool.query(teamQuery, [userId]);

    // Group members by project
    const groupedTeam = rows.reduce((acc, member) => {
      const project = acc.find(p => p.project_id === member.project_id);
      if (project) {
        project.members.push({
          user_id: member.user_id,
          name: member.name,
          email: member.email,
          role: member.project_role,
          profile_picture: member.profile_picture
        });
      } else {
        acc.push({
          project_id: member.project_id,
          project_name: member.project_name,
          members: [{
            user_id: member.user_id,
            name: member.name,
            email: member.email,
            role: member.project_role,
            profile_picture: member.profile_picture
          }]
        });
      }
      return acc;
    }, []);

    res.json({ teams: groupedTeam });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ 
      error: 'Failed to fetch team members',
      details: error.message
    });
  }
});
app.get('/api/member/active-project', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeProjectQuery = `
      SELECT 
        p.project_id,
        p.name,
        p.description,
        p.created_at AS project_start,
        COUNT(t.task_id) FILTER (WHERE t.status = 'Completed') AS completed_tasks,
        COUNT(t.task_id) AS total_tasks,
        (SELECT MAX(due_date) FROM tasks WHERE project_id = p.project_id) AS nearest_deadline
      FROM projects p
      JOIN project_members pm ON p.project_id = pm.project_id
      LEFT JOIN tasks t ON p.project_id = t.project_id
      WHERE pm.user_id = $1
      GROUP BY p.project_id
      ORDER BY 
        CASE WHEN EXISTS (
          SELECT 1 FROM tasks 
          WHERE project_id = p.project_id 
          AND due_date > NOW()
        ) THEN 0 ELSE 1 END,
        nearest_deadline ASC
      LIMIT 1
    `;

    const { rows } = await pool.query(activeProjectQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active project found',
        message: 'You are not currently assigned to any active projects' 
      });
    }

    const projectData = {
      ...rows[0],
      progress: Math.round((rows[0].completed_tasks / rows[0].total_tasks) * 100) || 0,
      deadlines: {
        nearest: rows[0].nearest_deadline,
        overdue: rows[0].nearest_deadline < new Date()
      }
    };

    res.json({ project: projectData });

  } catch (error) {
    console.error('Error fetching active project:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve active project',
      details: error.message 
    });
  }
});
// middleware/adminMiddleware.js
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      error: 'Forbidden - Administrator privileges required',
      requiredRole: 'Admin',
      currentUser: req.user.user_id
    });
  }
  next();
};

// controllers/adminController.js


const getSystemMetrics = async (req, res) => {
  try {
    const metricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM projects) AS total_projects,
        (SELECT COUNT(*) FROM tasks) AS total_tasks,
        (SELECT COUNT(*) FROM activity_logs) AS total_activities,
        (SELECT COALESCE(SUM(budget), 0) FROM projects) AS total_budget;
    `;

    const roleDistributionQuery = `
      SELECT role, COUNT(*) 
      FROM users 
      GROUP BY role;
    `;

    const [metricsRes, roleRes] = await Promise.all([
      pool.query(metricsQuery),
      pool.query(roleDistributionQuery)
    ]);

    res.json({
      ...metricsRes.rows[0],
      role_distribution: roleRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        al.log_id, al.action, al.created_at,
        u.user_id, u.name AS user_name, u.email,
        p.project_id, p.name AS project_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN projects p ON al.project_id = p.project_id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await pool.query(query, [limit, offset]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (!['Admin', 'Manager', 'Member', 'Developer', 'Project Manager'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const query = `
      UPDATE users 
      SET role = $1 
      WHERE user_id = $2 
      RETURNING user_id, name, email, role
    `;

    const { rows } = await pool.query(query, [newRole, userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.user.userId;
    
    const query = `
      SELECT user_id, name, email, role 
      FROM users 
      WHERE user_id = $1
    `;

    const { rows } = await pool.query(query, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate token with user data
    const token = generateToken(rows[0]);
    
    res.json({ 
      token,
      user: rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// routes/adminRoutes.js



app.get('/api/admin/audit-logs', adminAuth, getAuditLogs);
app.patch('/api/users/:userId/role', adminAuth, updateUserRole);
app.post('/api/impersonate', adminAuth, impersonateUser);
app.get("/api/metrics", async (req, res) => {
  try {
    const cpuUsage = await pidusage(process.pid);
    
    const metrics = {
      cpu: cpuUsage.cpu.toFixed(2), 
      memory: ((os.freemem() / os.totalmem()) * 100).toFixed(2), 
      storage: (os.totalmem() / (1024 ** 3)).toFixed(2), 
      network: os.networkInterfaces(), 
      activeUsers: Math.floor(Math.random() * 100), 
      requests: Math.floor(Math.random() * 200), 
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Error fetching system metrics" });
  }
});

// Start Server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});