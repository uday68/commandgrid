import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import { AppError } from './errorHandler.js';
import { redisClient } from '../Config/redis.js';
import { logSecurityThreat } from '../utils/activityLogger.js';

/**
 * @desc   Rate limiting middleware for security endpoints
 * @usage  Apply to routes that need rate limiting
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: async (req, res, next, options) => {
    // Log the rate limit hit
    try {
      await pool.query(
        `INSERT INTO audit_logs (ip_address, action_type, action_details, severity)
         VALUES ($1, $2, $3, $4)`,
        [
          req.ip || '0.0.0.0', // Provide fallback for IP
          'rate_limit_exceeded',
          `Rate limit exceeded for endpoint: ${req.originalUrl}`,
          'medium'
        ]
      );
      // Send the rate limit response
      res.status(options.statusCode).json(options.message);
    } catch (error) {
      console.error('Error logging rate limit:', error);
      // Even if logging fails, still send a rate limit response
      // to prevent exposing server errors to client
      res.status(options.statusCode).json(options.message);
    }
  }
});

/**
 * @desc   More restrictive rate limiting for sensitive operations
 * @usage  Apply to security critical routes like auth
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests for this operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, next, options) => {
    try {
      // Log this as a potential security threat
      await pool.query(
        `INSERT INTO security_threats (type, description, severity, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [
          'Potential Brute Force',
          `Multiple attempts detected for sensitive operation: ${req.originalUrl}`,
          'medium',
          req.ip || '0.0.0.0' // Provide fallback for IP
        ]
      );
      // Send the rate limit response
      res.status(options.statusCode).json(options.message);
    } catch (error) {
      console.error('Error logging security threat:', error);
      // Don't expose backend errors to client
      res.status(options.statusCode).json(options.message);
    }
  },
  // Add skip function to bypass rate limiting for certain scenarios (e.g. dev environments)
  skip: (req) => {
    // Skip rate limiting in development environment
    return process.env.NODE_ENV === 'development' && req.get('X-Development-Skip-Limits') === 'true';
  }
});

/**
 * @desc   Input validation middleware for security requests
 * @usage  Apply to routes that require validated input
 */
export const validateSecurityRequest = [
  // Validate scanType for scan requests
  body('scanType')
    .optional()
    .isIn(['full', 'quick', 'vulnerability', 'dependency', 'user_audit'])
    .withMessage('Invalid scan type'),
  
  // Validate reportType for report requests  
  body('reportType')
    .optional()
    .isIn(['security_overview', 'vulnerability_assessment', 'user_activity', 'incident_report'])
    .withMessage('Invalid report type'),
    
  // Validate timePeriod for report requests
  body('timePeriod')
    .optional()
    .isIn(['7d', '30d', '90d', 'year'])
    .withMessage('Invalid time period'),
    
  // Process validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * @desc   Check if the client has latest security patches
 * @usage  Apply to routes that should enforce client security
 */
const securityPatchCheck = async (req, res, next) => {
  // This is a simplified check - in production you would likely
  // check User-Agent against a database of known vulnerable versions
  const userAgent = req.headers['user-agent'] || '';
  
  // Simple check for outdated browsers as an example
  const outdatedBrowsers = [
    /MSIE [1-9]\./,         // IE 9 or lower
    /Firefox\/[1-6][0-9]\./,  // Firefox 69 or lower
    /Chrome\/[1-8][0-9]\./    // Chrome 89 or lower
  ];
  
  const isOutdated = outdatedBrowsers.some(pattern => pattern.test(userAgent));
  
  if (isOutdated) {
    // Log warning
    try {
      await pool.query(
        `INSERT INTO audit_logs (ip_address, action_type, action_details, severity, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.ip,
          'outdated_client',
          'Access attempt from outdated browser',
          'low',
          userAgent
        ]
      );
    } catch (error) {
      console.error('Error logging outdated client:', error);
    }
    
    // We just warn but don't block - in production you might choose to block certain endpoints
    req.securityWarnings = {
      outdatedClient: true,
      message: 'Your browser appears to be outdated and may have security vulnerabilities'
    };
  }
  
  next();
};

/**
 * @desc   Configure security headers for the application
 * @usage  Apply early in middleware chain
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * @desc   Prevent parameter pollution
 * @usage  Apply before routes are defined
 */
const parameterProtection = hpp();

/**
 * @desc   Sanitize user input to prevent XSS attacks
 * @usage  Apply before routes are defined
 */
const xssSanitization = xss();

/**
 * @desc   Log all security-related requests
 * @usage  Apply to security API endpoints
 */
const logSecurityRequest = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const adminId = req.user?.adminId || null;
    
    await pool.query(
      `INSERT INTO audit_logs 
       (user_id, admin_id, ip_address, action_type, action_details, severity, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        adminId,
        req.ip,
        'security_api_request',
        `Security endpoint accessed: ${req.method} ${req.originalUrl}`,
        'info',
        req.headers['user-agent']
      ]
    );
  } catch (error) {
    console.error('Error logging security request:', error);
    // Continue processing even if logging fails
  }
  next();
};

/**
 * @desc   Validate content-type middleware
 * @usage  Apply to routes that should only accept certain content types
 */
const requireJsonContentType = (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ 
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json'
    });
  }
  next();
};

/**
 * @desc   Error handling middleware for security routes
 * @usage  Apply after all security middleware
 */
const securityErrorHandler = (err, req, res, next) => {
  console.error('Security middleware error:', err);
  
  // Log the error to database
  try {
    pool.query(
      `INSERT INTO error_logs (error_message, stack_trace, request_path, request_method, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        err.message || 'Unknown error',
        err.stack || '',
        req.originalUrl,
        req.method,
        req.ip || '0.0.0.0',
        req.get('user-agent') || ''
      ]
    ).catch(logErr => console.error('Failed to log error to database:', logErr));
  } catch (logErr) {
    console.error('Error during error logging:', logErr);
  }
  
  // Don't expose internal server errors to client
  res.status(500).json({
    error: 'An error occurred while processing your request',
    requestId: Date.now().toString(36) + Math.random().toString(36).substr(2)
  });
};

// CORS configuration
const corsOptions = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError(403, 'Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400 // 24 hours
});

// Request sanitization
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

// Validate API key middleware
export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // Check if API key exists in Redis
    const isValid = await redisClient.get(`api-key:${apiKey}`);
    if (!isValid) {
      throw new AppError('Invalid API key', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// IP blocking middleware
const ipBlocker = async (req, res, next) => {
  const ip = req.ip;
  const blockedIPs = await redis.smembers('blocked_ips');
  
  if (blockedIPs.includes(ip)) {
    return next(new AppError(403, 'IP address is blocked'));
  }
  
  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.headers['content-length'] > maxSize) {
    return next(new AppError(413, 'Request entity too large'));
  }
  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const securityInfo = {
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  };

  // Log suspicious activities
  if (req.path.includes('admin') || req.path.includes('api')) {
    logger.warn('Security event:', securityInfo);
  }

  next();
};

// Request body sanitization middleware
export const sanitizeBody = (req, res, next) => {
  try {
    if (req.body) {
      // Remove any potentially dangerous characters
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key]
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
        }
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// XSS protection middleware
export const xssProtection = (req, res, next) => {
  try {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        }
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// SQL injection protection middleware
export const sqlInjectionProtection = (req, res, next) => {
  try {
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i;
    
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string' && sqlPattern.test(req.body[key])) {
          logSecurityThreat({
            type: 'sql_injection_attempt',
            description: `Potential SQL injection attempt in ${key}`,
            severity: 'high',
            ip: req.ip
          });
          throw new AppError('Invalid input detected', 400);
        }
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Request size limit middleware
export const requestSizeLimit = (req, res, next) => {
  const MAX_SIZE = 1024 * 1024; // 1MB
  if (req.headers['content-length'] > MAX_SIZE) {
    throw new AppError('Request entity too large', 413);
  }
  next();
};

// Export all security middleware
export default {
  validateApiKey,
  sanitizeBody,
  xssProtection,
  sqlInjectionProtection,
  requestSizeLimit,
  securityHeaders,
  corsOptions,
  parameterProtection,
  xssSanitization,
  logSecurityRequest,
  requireJsonContentType,
  securityErrorHandler,
  ipBlocker,
  requestSizeLimiter,
  securityLogger
};
