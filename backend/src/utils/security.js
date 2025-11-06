import bcrypt from 'bcrypt';
import { logSecurityThreat } from './logger.js';

/**
 * Security utilities for the application
 */
class SecurityUtils {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compare a password with a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - Whether the password matches
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Rate limiter data (simple in-memory implementation)
   * In production, use Redis or similar for distributed systems
   */
  static rateLimitData = {
    loginAttempts: {},
    apiRequests: {}
  };

  /**
   * Check if a login attempt should be rate limited
   * @param {string} username - Username or email
   * @param {string} ip - IP address
   * @returns {boolean} - Whether the request is rate limited
   */
  checkLoginRateLimit(username, ip) {
    const key = `${username}:${ip}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    // Initialize or clean up old entries
    if (!SecurityUtils.rateLimitData.loginAttempts[key]) {
      SecurityUtils.rateLimitData.loginAttempts[key] = [];
    } else {
      // Remove attempts outside the time window
      SecurityUtils.rateLimitData.loginAttempts[key] = 
        SecurityUtils.rateLimitData.loginAttempts[key].filter(
          timestamp => now - timestamp < windowMs
        );
    }
    
    // Check if too many attempts
    const attempts = SecurityUtils.rateLimitData.loginAttempts[key].length;
    if (attempts >= 5) {
      // Log security threat for suspicious activity
      logSecurityThreat({
        type: 'Rate Limit Exceeded',
        description: `Too many login attempts for user: ${username}`,
        severity: 'medium',
        ip
      });
      return true; // Rate limited
    }
    
    // Record this attempt
    SecurityUtils.rateLimitData.loginAttempts[key].push(now);
    return false; // Not rate limited
  }

  /**
   * Check if an API request should be rate limited
   * @param {string} endpoint - API endpoint
   * @param {string} ip - IP address
   * @param {number} limit - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - Whether the request is rate limited
   */
  checkApiRateLimit(endpoint, ip, limit = 100, windowMs = 60000) {
    const key = `${endpoint}:${ip}`;
    const now = Date.now();
    
    // Initialize or clean up old entries
    if (!SecurityUtils.rateLimitData.apiRequests[key]) {
      SecurityUtils.rateLimitData.apiRequests[key] = [];
    } else {
      // Remove requests outside the time window
      SecurityUtils.rateLimitData.apiRequests[key] = 
        SecurityUtils.rateLimitData.apiRequests[key].filter(
          timestamp => now - timestamp < windowMs
        );
    }
    
    // Check if too many requests
    const requests = SecurityUtils.rateLimitData.apiRequests[key].length;
    if (requests >= limit) {
      return true; // Rate limited
    }
    
    // Record this request
    SecurityUtils.rateLimitData.apiRequests[key].push(now);
    return false; // Not rate limited
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with strength rating and message
   */
  validatePasswordStrength(password) {
    if (!password || password.length < 8) {
      return { 
        valid: false, 
        strength: 'weak',
        message: 'Password must be at least 8 characters long'
      };
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const criteriaCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars]
      .filter(Boolean).length;
    
    if (criteriaCount < 3) {
      return {
        valid: false,
        strength: 'weak',
        message: 'Password must contain at least 3 of the following: uppercase, lowercase, numbers, special characters'
      };
    }
    
    if (password.length >= 12 && criteriaCount >= 4) {
      return {
        valid: true,
        strength: 'strong',
        message: 'Strong password'
      };
    }
    
    return {
      valid: true,
      strength: 'medium',
      message: 'Medium strength password'
    };
  }
  
  /**
   * Sanitize user input for basic security
   * @param {string} input - User input
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Basic sanitization - for production use a dedicated library
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default new SecurityUtils();
