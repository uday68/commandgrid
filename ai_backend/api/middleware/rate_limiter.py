from typing import Optional
import redis.asyncio as redis
from fastapi import HTTPException, status
import time
import json

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_limit = 100  # requests per minute
        self.default_window = 60  # seconds

    async def is_rate_limited(self, user_id: str) -> bool:
        """Check if a user has exceeded their rate limit"""
        try:
            # Get user's rate limit settings
            user_limits = await self.get_user_limits(user_id)
            limit = user_limits.get('limit', self.default_limit)
            window = user_limits.get('window', self.default_window)

            # Get current request count
            key = f"rate_limit:{user_id}"
            current = await self.redis.get(key)
            
            if current is None:
                # First request in the window
                await self.redis.setex(key, window, 1)
                return False
            
            count = int(current)
            if count >= limit:
                return True
            
            # Increment counter
            await self.redis.incr(key)
            return False

        except Exception as e:
            # Log error but don't block the request
            print(f"Rate limit check error: {str(e)}")
            return False

    async def get_user_limits(self, user_id: str) -> dict:
        """Get rate limit settings for a user"""
        try:
            # Get user's subscription tier
            tier_key = f"user_tier:{user_id}"
            tier = await self.redis.get(tier_key)
            
            if tier is None:
                return {
                    'limit': self.default_limit,
                    'window': self.default_window
                }
            
            # Define limits per tier
            tier_limits = {
                'free': {'limit': 100, 'window': 60},
                'basic': {'limit': 500, 'window': 60},
                'premium': {'limit': 2000, 'window': 60},
                'enterprise': {'limit': 10000, 'window': 60}
            }
            
            return tier_limits.get(tier.decode(), {
                'limit': self.default_limit,
                'window': self.default_window
            })

        except Exception as e:
            print(f"Error getting user limits: {str(e)}")
            return {
                'limit': self.default_limit,
                'window': self.default_window
            }

    async def get_remaining_requests(self, user_id: str) -> dict:
        """Get remaining requests for a user"""
        try:
            user_limits = await self.get_user_limits(user_id)
            key = f"rate_limit:{user_id}"
            
            current = await self.redis.get(key)
            if current is None:
                return {
                    'remaining': user_limits['limit'],
                    'reset_in': user_limits['window']
                }
            
            count = int(current)
            ttl = await self.redis.ttl(key)
            
            return {
                'remaining': max(0, user_limits['limit'] - count),
                'reset_in': ttl
            }

        except Exception as e:
            print(f"Error getting remaining requests: {str(e)}")
            return {
                'remaining': 0,
                'reset_in': 0
            }

    async def reset_rate_limit(self, user_id: str) -> None:
        """Reset rate limit for a user"""
        try:
            key = f"rate_limit:{user_id}"
            await self.redis.delete(key)
        except Exception as e:
            print(f"Error resetting rate limit: {str(e)}")

    async def update_user_tier(self, user_id: str, tier: str) -> None:
        """Update user's subscription tier"""
        try:
            key = f"user_tier:{user_id}"
            await self.redis.set(key, tier)
            # Reset rate limit when tier changes
            await self.reset_rate_limit(user_id)
        except Exception as e:
            print(f"Error updating user tier: {str(e)}") 