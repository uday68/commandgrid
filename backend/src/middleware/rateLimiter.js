import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../Config/redis.js';
import { logger } from '../utils/logger.js';
import { AppError } from './errorHandler.js';

// Create unique store instances for each limiter
const createStore = (prefix) => new RedisStore({
  sendCommand: async (...args) => redisClient.sendCommand(args),
  prefix: `rate-limit:${prefix}:`
});

// Global API rate limiter
export const apiLimiter = rateLimit({
  store: createStore('api'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// Auth rate limiter
export const authLimiter = rateLimit({
  store: createStore('auth'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  store: createStore('upload'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 uploads per 15 minutes
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Don't count failed uploads against the limit
  handler: (req, res, next, options) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId
    });
    res.status(429).json({
      status: 'error',
      message: options.message
    });
  }
});

// Search rate limiter
export const searchLimiter = rateLimit({
  store: createStore('search'),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// Report generation rate limiter
export const reportLimiter = rateLimit({
  store: createStore('report'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 report generations per hour
  message: 'Too many report generation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Report rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// API key rate limiter
export const apiKeyLimiter = rateLimit({
  store: createStore('apiKey'),
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each API key to 60 requests per minute
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('API key rate limit exceeded', {
      apiKey: req.headers['x-api-key'],
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// Comment rate limiter
export const commentLimiter = rateLimit({
  store: createStore('comment'),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 comments per minute
  message: 'Too many comments, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Comment rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});

// Like rate limiter
export const likeLimiter = rateLimit({
  store: createStore('like'),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 likes per minute
  message: 'Too many likes, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Like rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    throw new AppError(429, options.message);
  }
});