import { z } from 'zod';
import { AppError } from './errorHandler.js';

// User validation schemas
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  role: z.enum(['user', 'admin', 'manager']).optional()
});

// Project validation schemas
export const projectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'on-hold', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  members: z.array(z.number()).optional()
});

// Task validation schemas
export const taskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.number().optional(),
  projectId: z.number()
});

// Team validation schemas
export const teamSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  members: z.array(z.number()),
  projectId: z.number()
});

// Chat message validation schemas
export const messageSchema = z.object({
  content: z.string().min(1).max(1000),
  roomId: z.number(),
  type: z.enum(['text', 'file', 'image']),
  fileUrl: z.string().url().optional()
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['document', 'image', 'video', 'audio']),
  projectId: z.number().optional(),
  taskId: z.number().optional()
});

// Validation middleware factory
export const validate = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.parseAsync(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Validation error', {
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

// Query parameter validation
export const validateQuery = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.parseAsync(req.query);
    req.query = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid query parameters', {
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

// URL parameter validation
export const validateParams = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.parseAsync(req.params);
    req.params = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid URL parameters', {
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
}; 