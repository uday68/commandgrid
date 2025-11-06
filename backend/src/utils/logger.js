import winston from 'winston';
import { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, json } = format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'pmt-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        consoleFormat
      )
    }),
    // File transport for errors
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp(),
        json()
      )
    }),
    // File transport for all logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp(),
        json()
      )
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Create a stream object for Morgan
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Export a function to log API requests
export const logApiRequest = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id,
      ip: req.ip
    });
  });
  next();
};

/**
 * Log user activity
 */
export const logActivity = async ({ userId, projectId = null, action, details = null }) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, project_id, action, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [userId, projectId, action]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

/**
 * Log audit events
 */
export const logAudit = async ({ userId = null, adminId = null, ip, actionType, actionDetails }) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, admin_id, ip_address, action_type, action_details, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, adminId, ip, actionType, actionDetails]
    );
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

/**
 * Log security threats
 */
export const logSecurityThreat = async ({ type, description, severity = 'medium', ip }) => {
  try {
    await pool.query(
      `INSERT INTO security_threats (threat_name, description, severity, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [type, description, severity]
    );
  } catch (err) {
    console.error('Failed to log security threat:', err);
  }
};
