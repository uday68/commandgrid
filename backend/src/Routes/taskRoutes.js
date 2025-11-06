import express from 'express';
import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTasks,
  assignTask
} from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, taskSchema } from '../middleware/validator.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Apply authentication to all routes
router.use(authenticateToken);

// Create a new task
router.post('/', validate(taskSchema), createTask);

// Get a specific task
router.get('/:taskId', getTask);

// Update a task
router.put('/:taskId', validate(taskSchema), updateTask);

// Delete a task
router.delete('/:taskId', deleteTask);

// List tasks with filters
router.get('/', getTasks);

// Assign task
router.patch('/:taskId/assign', assignTask);

export default router; 