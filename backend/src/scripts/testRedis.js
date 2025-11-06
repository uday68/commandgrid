import { redisClient } from '../Config/redis.js';
import { logger } from '../utils/logger.js';

async function testRedisConnection() {
  try {
    // Test basic operations
    await redisClient.set('test:key', 'Hello Redis!');
    const value = await redisClient.get('test:key');
    logger.info('Redis test value:', value);

    // Test cache operations
    await redisClient.setex('test:cache', 60, JSON.stringify({ test: 'data' }));
    const cached = await redisClient.get('test:cache');
    logger.info('Redis cache test:', JSON.parse(cached));

    // Clean up test keys
    await redisClient.del('test:key', 'test:cache');
    logger.info('Redis connection test completed successfully');
  } catch (error) {
    logger.error('Redis connection test failed:', error);
  } finally {
    // Close the connection
    await redisClient.quit();
  }
}

testRedisConnection(); 