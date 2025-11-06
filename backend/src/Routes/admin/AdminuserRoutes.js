// User Management API Endpoints

// Import required modules
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { sendWelcomeEmail } from '../../services/email.js';
import { pool } from '../../Config/database.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        user_id, name, email, username, role, 
        profile_picture, status, requires_password_update,
        created_at, updated_at
      FROM users 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      username, 
      password, 
      role,
      requiresPasswordUpdate
    } = req.body;
    
    const companyId = req.user.companyId;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const query = `
      INSERT INTO users (
        name, email, username, password_hash, 
        role, company_id, requires_password_update
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      name, 
      email, 
      username, 
      hashedPassword, 
      role, 
      companyId,
      requiresPasswordUpdate || false
    ];

    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    // Remove sensitive data before sending response
    delete newUser.password_hash;

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      name, 
      email, 
      username, 
      role,
      requiresPasswordUpdate
    } = req.body;
    
    const companyId = req.user.companyId;

    // Verify user exists and belongs to company
    const verifyQuery = `
      SELECT 1 FROM users 
      WHERE user_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [userId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const addField = (field, value) => {
      if (value !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    };

    addField('name', name);
    addField('email', email);
    addField('username', username);
    addField('role', role);
    addField('requires_password_update', requiresPasswordUpdate);
    addField('updated_at', new Date());

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    values.push(userId);

    const result = await pool.query(query, values);
    const updatedUser = result.rows[0];

    // Remove sensitive data before sending response
    delete updatedUser.password_hash;

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;

    // Verify user exists and belongs to company
    const verifyQuery = `
      SELECT 1 FROM users 
      WHERE user_id = $1 AND company_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [userId, companyId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete user from all projects
      await client.query(
        'DELETE FROM project_members WHERE user_id = $1',
        [userId]
      );

      // Delete user's tasks
      await client.query(
        'DELETE FROM tasks WHERE assigned_to = $1',
        [userId]
      );

      // Delete the user
      await client.query(
        'DELETE FROM users WHERE user_id = $1',
        [userId]
      );

      await client.query('COMMIT');
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send welcome email (Admin only)
router.post('/:userId/send-welcome', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { requiresPasswordUpdate } = req.body;
    const companyId = req.user.companyId;

    // Get user details
    const userQuery = `
      SELECT name, email FROM users 
      WHERE user_id = $1 AND company_id = $2
    `;
    const userResult = await pool.query(userQuery, [userId, companyId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate a temporary token for password setup
    const tempToken = jwt.sign(
      { userId, email: user.email, purpose: 'welcome' },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Send welcome email
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      token: tempToken,
      requiresPasswordUpdate
    });

    res.json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send update password email
const sendUpdatePasswordMail = async (email, name, resetToken) => {
  try {
    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'commandgrid2025@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'fusionneatprj3',
      },
      secure: false,
    });
    
    // Build reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/updatepassword?token=${resetToken}`;
    
    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'commandgrid2025@gmail.com',
      to: email,
      subject: 'Update Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3f51b5; color: white; padding: 20px; text-align: center;">
            <h1>Password Update Request</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
            <p>Hello ${name},</p>
            <p>You've requested to update your password.</p>
            <p>Please click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Update Password
              </a>
            </div>
            
            <p>If you didn't request this change, you can ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
          </div>
        </div>
      `,
      text: `
        Hello ${name},
        
        You've requested to update your password.
        
        Please click on the link below to update your password:
        ${resetUrl}
        
        If you didn't request this change, you can ignore this email.
        This link will expire in 24 hours.
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Password update email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password update email:', error);
    throw error;
  }
};

// Add a new endpoint to trigger password reset
router.post('/:userId/reset-password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details
    const userQuery = `
      SELECT name, email FROM users 
      WHERE user_id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = jwt.sign(
      { userId, purpose: 'password_reset' },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    // Store token in database
    const tokenQuery = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at) 
      VALUES ($1, $2, NOW() + INTERVAL '24 HOURS')
    `;
    await pool.query(tokenQuery, [userId, resetToken]);
    
    // Send email
    await sendUpdatePasswordMail(user.email, user.name, resetToken);
    
    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
});

export default router;