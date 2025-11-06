import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../Config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * @route   POST /api/auth/companyregistration
 * @desc    Register a new company with admin
 * @access  Public
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    const { company, admin } = req.body;
    
    // Validate required fields
    if (!company.name || !admin.firstName || !admin.lastName || !admin.email || !admin.password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if admin email already exists
    const emailCheckResult = await client.query(
      'SELECT * FROM admins WHERE email = $1',
      [admin.email]
    );
    
    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Generate uuid for company
    const companyId = uuidv4();
    
    // Create company
    await client.query(
      `INSERT INTO companies (
        company_id, company_name, address, city, state, zip_code, country, category, sector
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        companyId,
        company.name,
        company.address || null,
        company.city || null,
        company.state || null,
        company.zipCode || null,
        company.country || null,
        company.category || null,
        company.sector || null
      ]
    );
    
    // Hash the admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);
    
    // Generate uuid for admin
    const adminId = uuidv4();
    
    // Create admin
    await client.query(
      `INSERT INTO admins (
        admin_id, first_name, last_name, email, password, company_id, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId,
        admin.firstName,
        admin.lastName,
        admin.email,
        hashedPassword,
        companyId,
        'Admin'
      ]
    );
    
    // Generate token
    const payload = {
      id: adminId,
      email: admin.email,
      role: 'Admin',
      companyId: companyId
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Create refresh token
    const refreshToken = jwt.sign(
      { id: adminId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update admin with refresh token
    await client.query(
      'UPDATE admins SET refresh_token = $1 WHERE admin_id = $2',
      [refreshToken, adminId]
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Return the response
    return res.status(201).json({
      token,
      refreshToken,
      user: {
        id: adminId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'Admin',
        companyId: companyId,
        companyName: company.name
      }
    });
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error registering company and admin:', error);
    return res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;
