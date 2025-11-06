import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../Config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { emailService } from '../../utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads/'));
  },
  filename: (req, file, cb) => {
    // Create a unique filename
    const uniqueName = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to insert OTP into DB
async function storeOtpInDb({ email, otp, expiresAt, context = 'registration', ipAddress, userAgent }) {
  await pool.query(
    `INSERT INTO otp_verification (email, otp, expires_at, context, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [email, otp, expiresAt, context, ipAddress, userAgent]
  );
}

// Helper to mark OTP as verified
async function markOtpVerified(otpId) {
  await pool.query(
    `UPDATE otp_verification SET verified = TRUE, verified_at = NOW() WHERE id = $1`,
    [otpId]
  );
}

// Helper to verify OTP from DB
async function verifyOtpFromDb({ email, otp, context = 'registration' }) {
  const result = await pool.query(
    `SELECT * FROM otp_verification WHERE email = $1 AND otp = $2 AND context = $3 AND verified = FALSE ORDER BY created_at DESC LIMIT 1`,
    [email, otp, context]
  );
  return result.rows[0];
}

/**
 * @route   POST /api/auth/userregistration/register
 * @desc    Register a new user (individual, team, or company member) with OTP
 * @access  Public
 */
router.post('/register', upload.single('profilePicture'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Parse the JSON data
    const userData = req.body.data ? JSON.parse(req.body.data) : req.body;
    
    // Extract basic user data
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      timeZone,
      agileMethodology,
      registrationType,
      termsAccepted,
      termsAcceptedAt,
      ipAddress,
      userAgent,
      deviceInfo
    } = userData;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !registrationType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if email already exists
    const emailCheckResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Generate a username from email (if not provided)
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    // Check if username already exists
    const usernameCheckResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (usernameCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Username already in use' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate UUID
    const userId = uuidv4();
    
    // Handle company registration if applicable
    let companyId = null;
    if (registrationType === 'company' && userData.company) {
      // Create company
      companyId = uuidv4();
      await client.query(
        `INSERT INTO companies (
          company_id, company_name, industry, company_size
        ) VALUES ($1, $2, $3, $4)`,
        [
          companyId,
          userData.company.name,
          userData.company.industry || 'Other',
          userData.company.size || '1-10'
        ]
      );
    }
    
    // Handle profile picture if uploaded
    let profilePicturePath = null;
    if (req.file) {
      profilePicturePath = req.file.filename;
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await storeOtpInDb({
      email,
      otp,
      expiresAt: otpExpiry,
      context: 'registration',
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.headers['user-agent']
    });
    
    // Send OTP email
    try {
      // For development, just log the OTP instead of sending email
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 OTP for ${email}: ${otp} (valid for 10 minutes)`);
        console.log(`📧 Email sending disabled in development mode`);
      } else {
        await emailService.sendEmail({
          to: email,
          template: 'notification',
          data: {
            title: 'Your OTP Code',
            message: `Your OTP code is: <b>${otp}</b>. It is valid for 10 minutes.`,
            type: 'info',
            priority: 'high',
            actionText: 'Verify OTP',
            actionUrl: '', // Optional, can be left blank
            details: '', // Optional, can be left blank
            category: 'OTP'
          },
          subject: 'Your OTP Code',
        });
      }
    } catch (err) {
      console.error('Email sending failed, but continuing with registration:', err.message);
      console.log(`🔐 OTP for ${email}: ${otp} (valid for 10 minutes)`);
      // Don't return error - allow registration to continue even if email fails
    }
    
    // Insert user into database
    const insertUserQuery = `
      INSERT INTO users (
        user_id, email, username, password_hash, name, first_name, last_name, 
        phone, time_zone, profile_picture, role, agile_methodology,
        registration_type, terms_accepted, terms_accepted_at, company_id,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING user_id, email, first_name, last_name, role, registration_type
    `;
    
    // Set role - if team registration, set to Admin by default
    let role;
    if (registrationType === 'team' && userData.team) {
      role = 'Admin'; // Team creator is automatically an Admin
    } else {
      role = userData.role && ['Admin', 'Manager', 'Member', 'Developer', 'Project Manager'].includes(userData.role) 
        ? userData.role 
        : 'Member'; // Default to 'Member' instead of 'User'
    }
    const fullName = `${firstName} ${lastName}`.trim();
    
    const userResult = await client.query(insertUserQuery, [
      userId,
      email,
      username,
      hashedPassword,
      fullName, // Add the name field
      firstName,
      lastName,
      phone || null,
      timeZone || 'UTC',
      profilePicturePath,
      role,
      agileMethodology === undefined ? true : agileMethodology,
      registrationType,
      termsAccepted || false,
      termsAcceptedAt || null,
      companyId,
      'pending_verification', // status
    ]);      // Handle team registration if applicable
    if (registrationType === 'team' && userData.team) {
      const teamId = uuidv4();
      const adminId = uuidv4();
        // First, insert into admins table to mark the user as admin of the team
      // Make sure this completes successfully before proceeding
      try {
        const adminResult = await client.query(
          `INSERT INTO admins(
            admin_id, first_name, last_name, email, password, role, company_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING admin_id`,
          [
            adminId,
            firstName,
            lastName,
            email,
            hashedPassword, // Reusing the same hashed password
            'Admin',
            companyId
          ]
        );
        
        // Ensure the admin record was created successfully and we have the admin_id
        if (!adminResult.rows[0] || !adminResult.rows[0].admin_id) {
          throw new Error('Failed to create admin record or retrieve admin_id');
        }
        
        // Confirm that the admin record exists to satisfy the foreign key constraint
        const checkAdminResult = await client.query(
          `SELECT admin_id FROM admins WHERE admin_id = $1`,
          [adminId]
        );
        
        if (checkAdminResult.rows.length === 0) {
          throw new Error(`Admin record with ID ${adminId} not found`);
        }
        
        // Insert the team into teams table
        // Use adminId as the owner_id to satisfy the foreign key constraint fk_owner_id
        await client.query(
          `INSERT INTO teams (
            team_id, name, description, team_size, created_by, owner_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            teamId,
            userData.team.name,
            userData.team.description || '',
            userData.team.size || '2-5',
            userId,
            adminId  // Using adminId to reference the admins table as required by fk_owner_id constraint
          ]
        );
      } catch (err) {
        console.error('Error creating admin/team records:', err);
        throw err;
      }      // Add user as team member with a valid role based on the team_members_role_check constraint
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [teamId, userId, 'Project Manager'] // Using 'Project Manager' which is allowed by the constraint
      );
      
      // Add team leader entry
      await client.query(
        `INSERT INTO team_leader (team_id, leader_id, assigned_by)
         VALUES ($1, $2,$3)`,
        [teamId, userId, userId] // Using userId as both team leader and assigned by  
      );
    }
    
    // Create user profile
    await client.query(
      `INSERT INTO user_profiles (
        user_id, bio, skills
      ) VALUES ($1, $2, $3)`,
      [userId, '', '{}']
    );
    
    // Insert into AUTH.USERS for compatibility
    await client.query(
      `INSERT INTO auth.users (id, email) 
       VALUES ($1, $2)`,
      [userId, email]
    );
    
    // Log the registration event
    await client.query(
      `INSERT INTO audit_logs (
        user_id, ip_address, action_type, action_details, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        ipAddress || req.ip,
        'registration',
        JSON.stringify({
          registrationType,
          deviceInfo
        }),
        userAgent || req.headers['user-agent']
      ]
    );
    
    // Create activity log entry
    await client.query(
      `INSERT INTO activity_logs (
        user_id, action, timestamp
      ) VALUES ($1, $2, NOW())`,
      [userId, 'account_created']
    );
    
    // Instead of returning token, ask user to verify OTP
    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Registration successful. Please verify the OTP sent to your email.',
      email,
    });
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error registering user:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * @route   POST /api/auth/userregistration/verify-otp
 * @desc    Verify OTP for user registration
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  console.log('OTP verification request received:', { email, otp, body: req.body });
  
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    console.log(`Verifying OTP for email: ${email}, OTP: ${otp}`);
    
    const record = await verifyOtpFromDb({ email, otp, context: 'registration' });
    
    console.log('OTP record found:', record);
    
    if (!record) {
      console.log('Invalid OTP - no record found');
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date() > record.expires_at) {
      console.log('OTP expired');
      return res.status(400).json({ message: 'OTP expired.' });
    }

    // Mark user as active and OTP as verified
    const client = await pool.connect();
    try {
      await client.query('UPDATE users SET status = $1 WHERE email = $2', ['active', email]);
      await markOtpVerified(record.id);
      console.log(`Account activated for email: ${email}`);
      return res.json({ message: 'OTP verified. Account activated.' });
    } catch (err) {
      console.error('Database error during account activation:', err);
      return res.status(500).json({ message: 'Failed to activate account', error: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error in OTP verification:', err);
    return res.status(500).json({ message: 'Failed to verify OTP', error: err.message });
  }
});

// Helper to check OTP resend rate limit
async function isOtpResendRateLimited(email) {
  // Allow max 3 resends in last 10 minutes
  const result = await pool.query(
    `SELECT COUNT(*) FROM otp_verification WHERE email = $1 AND context = 'registration' AND created_at > NOW() - INTERVAL '10 minutes'`,
    [email]
  );
  return parseInt(result.rows[0].count, 10) >= 3;
}

/**
 * @route   POST /api/auth/userregistration/resend-otp
 * @desc    Resend OTP for user registration
 * @access  Public
 */
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  // Rate limit check
  if (await isOtpResendRateLimited(email)) {
    return res.status(429).json({ message: 'Too many OTP requests. Please wait before trying again.' });
  }

  // Expire all previous OTPs for this email/context
  await pool.query(
    `UPDATE otp_verification SET verified = TRUE WHERE email = $1 AND context = 'registration' AND verified = FALSE`,
    [email]
  );

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await storeOtpInDb({
    email,
    otp,
    expiresAt: otpExpiry,
    context: 'registration',
    ipAddress: '', // Optionally get from req
    userAgent: '' // Optionally get from req
  });
  
  // Send OTP email
  try {
    // For development, just log the OTP instead of sending email
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 OTP resent for ${email}: ${otp} (valid for 10 minutes)`);
      console.log(`📧 Email sending disabled in development mode`);
    } else {
      await emailService.sendEmail({
        to: email,
        template: 'notification',
        data: {
          title: 'Your OTP Code',
          message: `Your OTP code is: <b>${otp}</b>. It is valid for 10 minutes.`,
          type: 'info',
          priority: 'high',
          actionText: 'Verify OTP',
          actionUrl: '',
          details: '',
          category: 'OTP'
        },
        subject: 'Your OTP Code',
      });
    }
    return res.json({ message: 'OTP resent successfully.' });
  } catch (err) {
    console.error('Email sending failed during resend, but continuing:', err.message);
    console.log(`🔐 OTP for ${email}: ${otp} (valid for 10 minutes)`);
    return res.json({ message: 'OTP resent successfully.' }); // Return success even if email fails
  }
});

export default router;