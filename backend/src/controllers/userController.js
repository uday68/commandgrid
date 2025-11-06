import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../Config/database.js';
import nodemailer from 'nodemailer';

// Configure nodemailer with stored credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password'
  }
});

/**
 * Get all users for a company with search and filtering
 */
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, sort = 'name', order = 'asc' } = req.query;
    const companyId = req.user.companyId;
    
    // Start building the query
    let query = `
      SELECT 
        user_id, name, email, username, role, 
        profile_picture, requires_password_update, 
        last_active, created_at, status
      FROM users 
      WHERE company_id = $1
    `;
    
    // Build params array starting with companyId
    const params = [companyId];
    let paramIndex = 2;
    
    // Add search condition if provided
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add role filter if provided
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    // Add status filter if provided
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    // Add sorting
    query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    
    const result = await pool.query(query, params);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
};

/**
 * Create a new user
 */
export const createUser = async (req, res) => {
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
    
    // Validate input
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }
    
    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 AND company_id = $2',
      [email, companyId]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Check if username already exists
    const usernameCheck = await pool.query(
      'SELECT 1 FROM users WHERE username = $1 AND company_id = $2',
      [username, companyId]
    );
    
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const query = `
      INSERT INTO users (
        name, email, username, password_hash, role, 
        company_id, requires_password_update, status, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW()) 
      RETURNING user_id, name, email, username, role, 
        requires_password_update, created_at
    `;
    
    const result = await pool.query(query, [
      name, 
      email, 
      username, 
      hashedPassword, 
      role, 
      companyId, 
      requiresPasswordUpdate || true
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Failed to create user',
      error: error.message 
    });
  }
};

/**
 * Update an existing user
 */
export const updateUser = async (req, res) => {
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
      return res.status(404).json({ message: 'User not found' });
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
      return res.status(400).json({ message: 'No valid updates provided' });
    }

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING user_id, name, email, username, role, 
        requires_password_update, status, updated_at
    `;
    values.push(userId, companyId);

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Failed to update user',
      error: error.message 
    });
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;
    
    // Check if user exists and belongs to the company
    const checkQuery = `
      SELECT 1 FROM users
      WHERE user_id = $1 AND company_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [userId, companyId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Begin transaction to handle all user data cleanly
    await pool.query('BEGIN');
    
    try {
      // Delete related records first (to handle foreign key constraints)
      await pool.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM team_members WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM project_members WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM task_comments WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM time_entries WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM available_member WHERE user_id = $1', [userId]);
      
      // Archive tasks instead of deleting them
      await pool.query(`
        UPDATE tasks 
        SET status = 'unassigned', assigned_to = NULL, updated_at = NOW()
        WHERE assigned_to = $1
      `, [userId]);
      
      // Finally delete the user
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
      
      await pool.query('COMMIT');
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Failed to delete user',
      error: error.message 
    });
  }
};

/**
 * Send welcome email to user
 */
export const sendWelcomeEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { customMessage } = req.body;
    
    // Get user details
    const userQuery = `
      SELECT name, email, company_id
      FROM users
      WHERE user_id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get company name
    const companyQuery = `
      SELECT company_name
      FROM companies
      WHERE company_id = $1
    `;
    const companyResult = await pool.query(companyQuery, [user.company_id]);
    const companyName = companyResult.rows[0]?.company_name || 'Our Company';
    
    // Generate token for registration link
    const token = jwt.sign(
      { userId, companyId: user.company_id },
      process.env.SECRET_KEY,
      { expiresIn: '48h' }
    );
    
    // Registration link
    const registrationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/complete-registration?token=${token}`;
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: user.email,
      subject: `Welcome to ${companyName}'s Project Management Tool!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3f51b5; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to ${companyName}</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
            <p>Hello ${user.name},</p>
            <p>Welcome to our project management platform! You've been added as a team member.</p>
            
            ${customMessage ? `<p><strong>Message from administrator:</strong> ${customMessage}</p>` : ''}
            
            <p>To complete your registration and set up your account, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationLink}" style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Complete Registration
              </a>
            </div>
            
            <p>This link will expire in 48 hours.</p>
            
            <p>If you have any questions, please contact your administrator.</p>
            
            <p>Thanks,<br>${companyName} Team</p>
          </div>
          <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
            <p>If you didn't expect this email, please ignore it.</p>
          </div>
        </div>
      `,
      text: `
        Welcome to ${companyName}!
        
        Hello ${user.name},
        
        Welcome to our project management platform! You've been added as a team member.
        
        ${customMessage ? `Message from administrator: ${customMessage}` : ''}
        
        To complete your registration and set up your account, please visit the following link:
        ${registrationLink}
        
        This link will expire in 48 hours.
        
        If you have any questions, please contact your administrator.
        
        Thanks,
        ${companyName} Team
        
        If you didn't expect this email, please ignore it.
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    // Update user status
    await pool.query(`
      UPDATE users
      SET welcome_email_sent = true, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
    
    res.json({ 
      message: 'Welcome email sent successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ 
      message: 'Failed to send welcome email',
      error: error.message 
    });
  }
};

/**
 * Impersonate user
 */
export const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.adminId;
    const adminCompanyId = req.user.companyId;
    
    if (!adminId) {
      return res.status(403).json({ message: 'Only administrators can impersonate users' });
    }
    
    // Verify the user belongs to the same company
    const userQuery = `
      SELECT user_id, name, email, role, company_id
      FROM users
      WHERE user_id = $1 AND company_id = $2
    `;
    const userResult = await pool.query(userQuery, [userId, adminCompanyId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or not in your company' });
    }
    
    const user = userResult.rows[0];
    
    // Log the impersonation for audit purposes
    await pool.query(`
      INSERT INTO audit_logs (
        admin_id, user_id, action, ip_address, timestamp, details
      )
      VALUES ($1, $2, 'impersonation', $3, NOW(), $4)
    `, [
      adminId,
      userId,
      req.ip,
      JSON.stringify({ adminEmail: req.user.email })
    ]);
    
    // Create an impersonation token
    const token = jwt.sign(
      {
        userId: user.user_id,
        adminId: adminId, // Keep track of the admin who is impersonating
        role: user.role,
        companyId: user.company_id,
        impersonatedBy: adminId
      },
      process.env.SECRET_KEY,
      { expiresIn: '1h' } // Short expiration for security
    );
    
    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      expiresIn: 3600, // 1 hour in seconds
      isImpersonation: true
    });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ 
      message: 'Failed to impersonate user',
      error: error.message 
    });
  }
};

/**
 * End impersonation session
 */
export const endImpersonation = async (req, res) => {
  try {
    const { adminId } = req.user;
    
    if (!adminId || !req.user.impersonatedBy) {
      return res.status(400).json({ message: 'Not an impersonation session' });
    }
    
    // Get original admin details
    const adminQuery = `
      SELECT admin_id, email, company_id
      FROM admins
      WHERE admin_id = $1
    `;
    const adminResult = await pool.query(adminQuery, [adminId]);
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    const admin = adminResult.rows[0];
    
    // Create new token with admin credentials
    const token = jwt.sign(
      {
        adminId: admin.admin_id,
        role: 'Admin',
        companyId: admin.company_id
      },
      process.env.SECRET_KEY,
      { expiresIn: '15m' }
    );
    
    // Log the end of impersonation
    await pool.query(`
      INSERT INTO audit_logs (
        admin_id, user_id, action, ip_address, timestamp
      )
      VALUES ($1, $2, 'end_impersonation', $3, NOW())
    `, [
      adminId,
      req.user.userId,
      req.ip
    ]);
    
    res.json({
      token,
      user: {
        id: admin.admin_id,
        email: admin.email,
        role: 'Admin',
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    res.status(500).json({ 
      message: 'Failed to end impersonation',
      error: error.message 
    });
  }
};

/**
 * Get user activity
 */
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;
    
    // Verify the user belongs to the company
    const userCheck = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user activity log
    const activityQuery = `
      SELECT 
        al.log_id,
        al.action,
        al.timestamp,
        al.resource_type,
        al.resource_id,
        CASE
          WHEN al.resource_type = 'project' THEN 
            (SELECT name FROM projects WHERE project_id = al.resource_id)
          WHEN al.resource_type = 'task' THEN 
            (SELECT title FROM tasks WHERE task_id = al.resource_id)
          ELSE NULL
        END as resource_name
      FROM activity_logs al
      WHERE al.user_id = $1
      ORDER BY al.timestamp DESC
      LIMIT 20
    `;
    
    const activityResult = await pool.query(activityQuery, [userId]);
    
    res.json({ activity: activityResult.rows });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user activity',
      error: error.message 
    });
  }
};

/**
 * Reset user password
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const companyId = req.user.companyId;
    
    // Verify user exists and belongs to company
    const userCheck = await pool.query(
      'SELECT name, email FROM users WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and set requires_password_update flag
    await pool.query(`
      UPDATE users
      SET 
        password_hash = $1, 
        requires_password_update = true,
        updated_at = NOW()
      WHERE user_id = $2
    `, [hashedPassword, userId]);
    
    // Send notification email to user
    const user = userCheck.rows[0];
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: user.email,
      subject: 'Your Password Has Been Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3f51b5; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Notification</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
            <p>Hello ${user.name},</p>
            <p>Your password has been reset by your administrator.</p>
            <p>You'll need to create a new password the next time you log in.</p>
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      `,
      text: `
        Password Reset Notification
        
        Hello ${user.name},
        
        Your password has been reset by your administrator.
        You'll need to create a new password the next time you log in.
        
        If you have any questions, please contact your administrator.
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      message: 'Failed to reset password',
      error: error.message 
    });
  }
};

export default {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  sendWelcomeEmail,
  impersonateUser,
  endImpersonation,
  getUserActivity,
  resetUserPassword
};
