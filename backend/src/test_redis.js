// Script to diagnose Redis connectivity issues
import { redisClient } from './Config/redis.js';
import { logger } from './utils/logger.js';

// Wait for connection
async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    
    // Make sure Redis is connected
    if (!redisClient.isReady) {
      console.log('Waiting for Redis to connect...');
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('Redis connection timeout');
          process.exit(1);
        }, 10000);
        
        redisClient.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    
    console.log('Redis is connected');
    
    // Test basic operations
    const testKey = 'test:connection:' + Date.now();
    
    console.log('Testing SET operation');
    await redisClient.set(testKey, 'test value');
    
    console.log('Testing GET operation');
    const value = await redisClient.get(testKey);
    console.log('Retrieved value:', value);
    
    console.log('Testing SET with EX option');
    await redisClient.set(testKey + ':ex', 'test with expiration', {
      EX: 10 // 10 seconds
    });
    
    console.log('Testing DEL operation');
    await redisClient.del(testKey);
    
    console.log('All Redis operations completed successfully');
    
  } catch (error) {
    console.error('Redis test failed:', error);
  } finally {
    redisClient.quit();
  }
}

testRedis();
