import { redisClient } from '../Config/redis.js';
import { logger } from '../utils/logger.js';

// Cache middleware factory
export const cache = (duration = 300) => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = `cache:${req.originalUrl || req.url}`;

  try {
    const cachedResponse = await redisClient.get(key);
    if (cachedResponse) {
      const data = JSON.parse(cachedResponse);
      return res.json(data);
    }

    // Store original res.json
    const originalJson = res.json;

    // Override res.json method
    res.json = function(body) {
      // Store in cache using modern Redis client API
      try {
        // Using set with options object for modern Redis clients
        redisClient.set(key, JSON.stringify(body), { 
          EX: duration 
        }).catch(err => logger.error('Cache set error:', err));
      } catch (err) {
        logger.error('Redis set operation failed:', err);
        // Try alternative method for older clients
        try {
          redisClient.set(key, JSON.stringify(body));
          redisClient.expire(key, duration);
        } catch (err2) {
          logger.error('Redis fallback operation failed:', err2);
        }
      }

      // Call original method
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error:', error);
    next();
  }
};

// Alias for cache middleware
export const cacheMiddleware = cache;

// Cache invalidation middleware
export const invalidateCache = (patterns) => async (req, res, next) => {
  try {
    const keys = await redisClient.keys(patterns);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated cache keys: ${keys.join(', ')}`);
    }
    next();
  } catch (error) {
    logger.error('Cache invalidation error:', error);
    next();
  }
};

// Cache key generator
export const generateCacheKey = (req) => {
  const { originalUrl, query, params, user } = req;
  return `cache:${originalUrl}:${JSON.stringify(query)}:${JSON.stringify(params)}:${user?.id || 'anonymous'}`;
};

// Cache middleware with custom key generator
export const cacheWithKey = (keyGenerator, duration = 300) => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = keyGenerator(req);

  try {
    const cachedResponse = await redisClient.get(key);
    if (cachedResponse) {
      const data = JSON.parse(cachedResponse);
      return res.json(data);
    }

    // Store original res.json
    const originalJson = res.json;

    // Override res.json method
    res.json = function(body) {
      // Store in cache using modern Redis client API with fallback
      try {
        redisClient.set(key, JSON.stringify(body), { 
          EX: duration 
        }).catch(err => logger.error('Cache set error:', err));
      } catch (err) {
        logger.error('Redis set operation failed:', err);
        // Try alternative method
        try {
          redisClient.set(key, JSON.stringify(body));
          redisClient.expire(key, duration);
        } catch (err2) {
          logger.error('Redis fallback operation failed:', err2);
        }
      }

      // Call original method
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error:', error);
    next();
  }
};

// Cache middleware for specific routes
export const routeCache = {
  // Project routes
  projectList: cache(300), // 5 minutes
  projectDetails: cache(600), // 10 minutes
  projectMembers: cache(300), // 5 minutes

  // Task routes
  taskList: cache(300), // 5 minutes
  taskDetails: cache(600), // 10 minutes
  taskComments: cache(300), // 5 minutes

  // Team routes
  teamList: cache(300), // 5 minutes
  teamDetails: cache(600), // 10 minutes
  teamMembers: cache(300), // 5 minutes

  // User routes
  userProfile: cache(600), // 10 minutes
  userSettings: cache(300), // 5 minutes

  // Metrics routes
  projectMetrics: cache(300), // 5 minutes
  teamMetrics: cache(300), // 5 minutes
  userMetrics: cache(300), // 5 minutes
};
