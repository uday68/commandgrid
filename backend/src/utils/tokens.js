import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate access token for authentication
 * @param {Object} user - User object containing user information
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
  return jwt.sign({
    userId: user.user_id || null,
    adminId: user.admin_id || null,
    role: user.role || 'User',
    companyId: user.company_id || null
  }, process.env.SECRET_KEY, { expiresIn: '15m' });
};

/**
 * Generate refresh token for extended sessions
 * @param {Object} user - User object containing user information
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign({
    userId: user.user_id || null,
    adminId: user.admin_id || null
  }, process.env.REFRESH_SECRET_KEY, { expiresIn: '7d' });
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Promise<Object|null>} - Decoded token or null if invalid
 */
const verifyRefreshToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.REFRESH_SECRET_KEY, (err, decoded) => {
      if (err) {
        return resolve(null);
      }
      resolve(decoded);
    });
  });
};

/**
 * Generate a password reset token
 * @param {string} userId - User ID
 * @returns {string} - Reset token
 */
const generatePasswordResetToken = (userId) => {
  // For password reset, we use a simpler approach with crypto
  return crypto.randomBytes(32).toString('hex');
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken
};
