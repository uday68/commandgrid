from typing import Optional, Dict, Any
import redis.asyncio as redis
from fastapi import HTTPException, status
import json
import time

class TokenTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_tokens = {
            'free': 1000,
            'basic': 5000,
            'premium': 20000,
            'enterprise': 100000
        }
        self.token_cost = {
            'gpt-3.5-turbo': 0.002,  # per 1K tokens
            'gpt-4': 0.03,           # per 1K tokens
            'claude-2': 0.02         # per 1K tokens
        }

    async def has_available_tokens(self, user_id: str) -> bool:
        """Check if user has available tokens"""
        try:
            remaining = await self.get_remaining_tokens(user_id)
            return remaining > 0
        except Exception as e:
            print(f"Error checking token availability: {str(e)}")
            return False

    async def get_remaining_tokens(self, user_id: str) -> int:
        """Get remaining tokens for a user"""
        try:
            key = f"user_tokens:{user_id}"
            tokens = await self.redis.get(key)
            
            if tokens is None:
                # Initialize tokens based on user tier
                tier = await self.get_user_tier(user_id)
                initial_tokens = self.default_tokens.get(tier, self.default_tokens['free'])
                await self.redis.set(key, initial_tokens)
                return initial_tokens
            
            return int(tokens)
        except Exception as e:
            print(f"Error getting remaining tokens: {str(e)}")
            return 0

    async def track_usage(self, user_id: str, usage: Dict[str, Any]) -> None:
        """Track token usage for a user"""
        try:
            key = f"user_tokens:{user_id}"
            model = usage.get('model', 'gpt-3.5-turbo')
            tokens = usage.get('total_tokens', 0)
            
            # Calculate cost
            cost = self.token_cost.get(model, 0.002) * (tokens / 1000)
            
            # Update remaining tokens
            current = await self.get_remaining_tokens(user_id)
            remaining = max(0, current - tokens)
            await self.redis.set(key, remaining)
            
            # Log usage
            await self.log_usage(user_id, {
                'model': model,
                'tokens': tokens,
                'cost': cost,
                'timestamp': time.time()
            })
            
        except Exception as e:
            print(f"Error tracking token usage: {str(e)}")

    async def get_user_tier(self, user_id: str) -> str:
        """Get user's subscription tier"""
        try:
            key = f"user_tier:{user_id}"
            tier = await self.redis.get(key)
            return tier.decode() if tier else 'free'
        except Exception as e:
            print(f"Error getting user tier: {str(e)}")
            return 'free'

    async def log_usage(self, user_id: str, usage: Dict[str, Any]) -> None:
        """Log token usage details"""
        try:
            key = f"token_usage:{user_id}"
            usage_list = await self.redis.get(key)
            
            if usage_list is None:
                usage_list = []
            else:
                usage_list = json.loads(usage_list)
            
            usage_list.append(usage)
            
            # Keep only last 1000 usage records
            if len(usage_list) > 1000:
                usage_list = usage_list[-1000:]
            
            await self.redis.set(key, json.dumps(usage_list))
            
        except Exception as e:
            print(f"Error logging token usage: {str(e)}")

    async def get_usage_history(self, user_id: str, limit: int = 100) -> list:
        """Get user's token usage history"""
        try:
            key = f"token_usage:{user_id}"
            usage_list = await self.redis.get(key)
            
            if usage_list is None:
                return []
            
            usage_list = json.loads(usage_list)
            return usage_list[-limit:]
            
        except Exception as e:
            print(f"Error getting usage history: {str(e)}")
            return []

    async def add_tokens(self, user_id: str, amount: int) -> None:
        """Add tokens to user's balance"""
        try:
            key = f"user_tokens:{user_id}"
            current = await self.get_remaining_tokens(user_id)
            await self.redis.set(key, current + amount)
        except Exception as e:
            print(f"Error adding tokens: {str(e)}")

    async def reset_tokens(self, user_id: str) -> None:
        """Reset user's token balance based on their tier"""
        try:
            tier = await self.get_user_tier(user_id)
            initial_tokens = self.default_tokens.get(tier, self.default_tokens['free'])
            key = f"user_tokens:{user_id}"
            await self.redis.set(key, initial_tokens)
        except Exception as e:
            print(f"Error resetting tokens: {str(e)}")

    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user's token usage statistics"""
        try:
            usage_history = await self.get_usage_history(user_id)
            
            total_tokens = sum(usage['tokens'] for usage in usage_history)
            total_cost = sum(usage['cost'] for usage in usage_history)
            
            model_usage = {}
            for usage in usage_history:
                model = usage['model']
                if model not in model_usage:
                    model_usage[model] = 0
                model_usage[model] += usage['tokens']
            
            return {
                'total_tokens': total_tokens,
                'total_cost': total_cost,
                'model_usage': model_usage,
                'remaining': await self.get_remaining_tokens(user_id)
            }
            
        except Exception as e:
            print(f"Error getting usage stats: {str(e)}")
            return {
                'total_tokens': 0,
                'total_cost': 0,
                'model_usage': {},
                'remaining': 0
            } 