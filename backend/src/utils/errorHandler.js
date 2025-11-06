/**
 * Utility for standardized error handling and logging
 */

// Custom error class for application errors
export class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Log errors to console with additional context
export const logError = (error, context = {}) => {
  console.error({
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString()
  });
};

// Format error response for API endpoints
export const formatErrorResponse = (error, defaultMessage = 'Internal Server Error') => {
  // For production, avoid exposing internal error details
  if (process.env.NODE_ENV === 'production') {
    return { error: defaultMessage };
  }
  
  // For development, include more details
  return {
    error: error.message || defaultMessage,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

// Async route handler wrapper for cleaner error handling
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    logError(error, { 
      path: req.path, 
      method: req.method,
      query: req.query,
      ip: req.ip
    });
    
    res.status(500).json(formatErrorResponse(error));
  });
};

// Check if error is related to database validation
export const isValidationError = (error) => {
  return error.code === '23505' || // Unique constraint violation
         error.code === '23503' || // Foreign key violation
         error.code === '23502';   // Not null violation
};

// Handle database-specific errors
export const handleDatabaseError = (error) => {
  // Postgres-specific error codes
  switch(error.code) {
    case '23505': // unique_violation
      return {
        status: 409, // Conflict
        message: 'A record with this data already exists.'
      };
    case '23503': // foreign_key_violation
      return {
        status: 400, // Bad Request
        message: 'Related record not found.'
      };
    case '23502': // not_null_violation
      return {
        status: 400, // Bad Request
        message: `Required field missing: ${error.column || 'unknown'}`
      };
    default:
      return {
        status: 500,
        message: 'Database operation failed.'
      };
  }
};
