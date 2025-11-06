import { pool } from '../Config/database.js';
import bcrypt from 'bcrypt';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
console.log('Profile pictures upload directory:', uploadDir);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  console.log('Creating profiles upload directory:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Configure upload options
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Only .jpeg, .png and .gif files are allowed');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

/**
 * Get user profile data
 * Works with both users and admins tables
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query || 'user'; // Default to user if not specified
    
    // Check if user exists in users table first
    let userQuery;
    let result;
    
    if (userType === 'admin') {
      // Query admins table
      userQuery = `
        SELECT 
          a.admin_id as id, 
          a.first_name, 
          a.last_name, 
          a.email, 
          a.role,
          a.profile_picture, 
          a.created_at,
          a.updated_at,
          a.phone,
          a.location,
          c.company_id,
          c.company_name
        FROM 
          admins a
        LEFT JOIN
          companies c ON a.company_id = c.company_id
        WHERE 
          a.admin_id = $1
      `;
      
      result = await pool.query(userQuery, [userId]);
    } else {
      // Query users table
      userQuery = `
        SELECT 
          u.user_id as id, 
          u.name, 
          u.email, 
          u.role,
          u.profile_picture_url, 
          u.created_at,
          u.updated_at,
          u.phone,
          u.location,
          u.time_zone,
          c.company_id,
          c.company_name
        FROM 
          users u
        LEFT JOIN
          companies c ON u.company_id = c.company_id
        WHERE 
          u.user_id = $1
      `;
      
      result = await pool.query(userQuery, [userId]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = result.rows[0];
    
    // Get user skills if applicable
    if (userType !== 'admin') {
      try {
        const skillsQuery = `
          SELECT skill_name 
          FROM user_skills 
          WHERE user_id = $1
        `;
        
        const skillsResult = await pool.query(skillsQuery, [userId]);
        userData.skills = skillsResult.rows.map(row => row.skill_name);
      } catch (skillsError) {
        console.warn('Failed to fetch user skills:', skillsError);
        userData.skills = [];
      }
    } else {
      userData.skills = [];
    }
    
    // Format company info
    if (userData.company_id) {
      userData.company = {
        company_id: userData.company_id,
        company_name: userData.company_name
      };
    }
    
    // Remove redundant fields
    delete userData.company_id;
    delete userData.company_name;
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile data',
      error: error.message 
    });
  }
};

/**
 * Get current user profile data
 * Uses the authenticated user's ID from the token
 */
export const getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Get user ID from the authenticated token
    const userRole = req.user.role;
    
    // Determine if user is admin based on role
    const isAdmin = userRole === 'Admin' || userRole === 'admin';
    
    let userQuery;
    let result;
    
    if (isAdmin) {
      // Query admins table
      userQuery = `
        SELECT 
          a.admin_id as id, 
          a.admin_id as user_id,
          a.first_name, 
          a.last_name, 
          CONCAT(a.first_name, ' ', a.last_name) as name,
          a.email, 
          a.role,
          a.profile_picture, 
          a.created_at,
          a.updated_at,
          a.phone,
        
          c.company_id,
          c.company_name
        FROM 
          admins a
        LEFT JOIN
          companies c ON a.company_id = c.company_id
        WHERE 
          a.admin_id = $1
      `;
      
      result = await pool.query(userQuery, [userId]);
    } else {
      // Query users table
      userQuery = `
        SELECT 
          u.user_id as id, 
          u.user_id,
          u.name, 
          u.email, 
          u.role,
          u.profile_picture_url as profile_picture, 
          u.created_at,
          u.updated_at,
          u.phone,
          u.location,
          u.time_zone,
          c.company_id,
          c.company_name
        FROM 
          users u
        LEFT JOIN
          companies c ON u.company_id = c.company_id
        WHERE 
          u.user_id = $1
      `;
      
      result = await pool.query(userQuery, [userId]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = result.rows[0];
    
    // Get user skills if not admin
    if (!isAdmin) {
      try {
        const skillsQuery = `
          SELECT skill_name 
          FROM user_skills 
          WHERE user_id = $1
        `;
        
        const skillsResult = await pool.query(skillsQuery, [userId]);
        userData.skills = skillsResult.rows.map(row => row.skill_name);
      } catch (skillsError) {
        console.warn('Failed to fetch user skills:', skillsError);
        userData.skills = [];
      }
    } else {
      userData.skills = [];
    }
    
    // Format company info
    if (userData.company_id) {
      userData.company = {
        company_id: userData.company_id,
        company_name: userData.company_name
      };
    }
    
    // Remove redundant fields
    delete userData.company_id;
    delete userData.company_name;
    
    res.json({ 
      success: true,
      profile: userData
    });
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile data',
      error: error.message 
    });
  }
};

/**
 * Update user profile 
 * Works with both users and admins tables
 */
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query || 'user'; // Default to user if not specified
    
    const {
      name,
      first_name,
      last_name,
      email,
      phone,
      location,
      time_zone,
      currentPassword,
      newPassword,
    } = req.body;
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user/admin exists
      let userExists;
      
      if (userType === 'admin') {
        userExists = await client.query(
          'SELECT admin_id, password FROM admins WHERE admin_id = $1',
          [userId]
        );
      } else {
        userExists = await client.query(
          'SELECT user_id, password_hash FROM users WHERE user_id = $1',
          [userId]
        );
      }
      
      if (userExists.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Handle password update if requested
      if (currentPassword && newPassword) {
        const storedPassword = userType === 'admin' 
          ? userExists.rows[0].password 
          : userExists.rows[0].password_hash;
        
        const isPasswordValid = await bcrypt.compare(currentPassword, storedPassword);
        
        if (!isPasswordValid) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        if (userType === 'admin') {
          await client.query(
            'UPDATE admins SET password = $1 WHERE admin_id = $2',
            [hashedNewPassword, userId]
          );
        } else {
          await client.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [hashedNewPassword, userId]
          );
        }
      }
      
      // Update profile fields
      let updateQuery;
      const updateParams = [];
      let paramIndex = 1;
      
      if (userType === 'admin') {
        // Build dynamic update for admins table
        const fields = [];
        
        if (first_name !== undefined) {
          fields.push(`first_name = $${paramIndex++}`);
          updateParams.push(first_name);
        }
        
        if (last_name !== undefined) {
          fields.push(`last_name = $${paramIndex++}`);
          updateParams.push(last_name);
        }
        
        if (email !== undefined) {
          fields.push(`email = $${paramIndex++}`);
          updateParams.push(email);
        }
        
        if (phone !== undefined) {
          fields.push(`phone = $${paramIndex++}`);
          updateParams.push(phone);
        }
        
        if (location !== undefined) {
          fields.push(`location = $${paramIndex++}`);
          updateParams.push(location);
        }
        
        fields.push(`updated_at = NOW()`);
        
        // User ID is the last parameter
        updateParams.push(userId);
        
        updateQuery = `
          UPDATE admins 
          SET ${fields.join(', ')} 
          WHERE admin_id = $${paramIndex}
          RETURNING admin_id, first_name, last_name, email, role, profile_picture, phone, location, created_at, updated_at
        `;
      } else {
        // Build dynamic update for users table
        const fields = [];
        
        if (name !== undefined) {
          fields.push(`name = $${paramIndex++}`);
          updateParams.push(name);
        }
        
        if (email !== undefined) {
          fields.push(`email = $${paramIndex++}`);
          updateParams.push(email);
        }
        
        if (phone !== undefined) {
          fields.push(`phone = $${paramIndex++}`);
          updateParams.push(phone);
        }
        
        if (location !== undefined) {
          fields.push(`location = $${paramIndex++}`);
          updateParams.push(location);
        }
        
        if (time_zone !== undefined) {
          fields.push(`time_zone = $${paramIndex++}`);
          updateParams.push(time_zone);
        }
        
        fields.push(`updated_at = NOW()`);
        
        // User ID is the last parameter
        updateParams.push(userId);
        
        updateQuery = `
          UPDATE users 
          SET ${fields.join(', ')} 
          WHERE user_id = $${paramIndex}
          RETURNING user_id, name, email, role, profile_picture_url, phone, location, time_zone, created_at, updated_at
        `;
      }
      
      // Execute update
      const updateResult = await client.query(updateQuery, updateParams);
      
      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }
      
      await client.query('COMMIT');
      
      // Get company information again
      let companyInfo = null;
      if (userType === 'admin') {
        const companyQuery = await pool.query(
          'SELECT company_id, company_name FROM companies WHERE company_id = (SELECT company_id FROM admins WHERE admin_id = $1)',
          [userId]
        );
        if (companyQuery.rows.length > 0) {
          companyInfo = {
            company_id: companyQuery.rows[0].company_id,
            company_name: companyQuery.rows[0].company_name
          };
        }
      } else {
        const companyQuery = await pool.query(
          'SELECT company_id, company_name FROM companies WHERE company_id = (SELECT company_id FROM users WHERE user_id = $1)',
          [userId]
        );
        if (companyQuery.rows.length > 0) {
          companyInfo = {
            company_id: companyQuery.rows[0].company_id,
            company_name: companyQuery.rows[0].company_name
          };
        }
      }
      
      // Format response
      const responseData = {
        ...updateResult.rows[0],
        company: companyInfo
      };
      
      res.json(responseData);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: error.message 
    });
  }
};

/**
 * Update profile picture
 * Works with both users and admins tables
 */
export const updateProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query || 'user'; // Default to user if not specified
    
    // Validate userId
    if (!userId || userId === 'null' || userId === 'undefined') {
      console.error('Invalid userId received:', userId);
      return res.status(400).json({ message: 'Invalid user ID provided' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }    const fileName = req.file.filename;
    // Build the full URL for the profile picture
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/profiles/${fileName}`;
    console.log('Profile picture URL being saved:', fileUrl);
    
    // Update profile picture URL in database
    let updateQuery;
    
    if (userType === 'admin') {
      updateQuery = `
        UPDATE admins
        SET profile_picture = $1, updated_at = NOW()
        WHERE admin_id = $2
        RETURNING profile_picture
      `;
    } else {
      updateQuery = `
        UPDATE users
        SET profile_picture_url = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING profile_picture_url
      `;
    }
    
    console.log('Executing update with userId:', userId, 'and fileUrl:', fileUrl);
    const result = await pool.query(updateQuery, [fileUrl, userId]);
    
    if (result.rows.length === 0) {
      // Delete the uploaded file if user not found
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error removing uploaded file:', err);
      });
      
      return res.status(404).json({ message: 'User not found' });
    }
      // Respond with the URL of the profile picture
    const fieldName = userType === 'admin' ? 'profile_picture' : 'profile_picture_url';
    const profilePictureUrl = result.rows[0][fieldName];
    
    console.log('Profile picture updated, returning URL:', profilePictureUrl);
    
    res.json({
      message: 'Profile picture updated successfully',
      profilePictureUrl: profilePictureUrl
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error removing uploaded file:', err);
      });
    }
    
    res.status(500).json({
      message: 'Failed to update profile picture',
      error: error.message
    });
  }
};

export default {
  getUserProfile,
  getCurrentUserProfile,
  updateProfile,
  updateProfilePicture,
  upload
};
