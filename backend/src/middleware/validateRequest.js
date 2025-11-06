import { z } from 'zod';
import { AppError } from '../utils/errorHandler.js';

/**
 * Middleware to validate request data against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate request body against schema
      const validatedData = await schema.parseAsync(req.body);
      
      // Replace request body with validated data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return next(new AppError(400, 'Validation failed', formattedErrors));
      }
      
      // Handle other errors
      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate query parameters against schema
      const validatedData = await schema.parseAsync(req.query);
      
      // Replace query parameters with validated data
      req.query = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return next(new AppError(400, 'Invalid query parameters', formattedErrors));
      }
      
      // Handle other errors
      next(error);
    }
  };
};

/**
 * Middleware to validate request parameters against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate route parameters against schema
      const validatedData = await schema.parseAsync(req.params);
      
      // Replace route parameters with validated data
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return next(new AppError(400, 'Invalid route parameters', formattedErrors));
      }
      
      // Handle other errors
      next(error);
    }
  };
}; 