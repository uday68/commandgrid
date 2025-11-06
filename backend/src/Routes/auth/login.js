import express from 'express';
import { pool } from '../../Config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const router = express.Router();

// Generate access token
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.user_id || user.admin_id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    },
    process.env.JWT_SECRET || 's3cUr3JwT$eCr3tK3y!2025',
    { expiresIn: '1h' }
  );
}
console.log('Access token secret:', process.env.JWT_SECRET)
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.user_id || user.admin_id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    },
    process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
    { expiresIn: '7d' }
  );
}

// Login route
router.post('/', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
     const userQuery = `
      SELECT user_id, name, email, password_hash, role, company_id, registration_type
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
    }    console.log('User logged in:', user.email);
    console.log('User role:', user.role);
    console.log('User registration type:', user.registration_type);
    res.json({
      authToken,
      refreshToken,
      user: {
        id: user.user_id || user.admin_id,
        email: user.email,
        name: user.name || 'Administrator',
        role: user.role,
        companyId: user.company_id,
        registration_type: user.registration_type || 'individual',
        isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;