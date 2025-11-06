import time
import json
from typing import Dict, Optional, Any
import redis.asyncio as redis

class CacheManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour
        
    async def get(self, key: str) -> Optional[Dict]:
        """Get cached response if available and not expired."""
        cached = await self.redis.get(f"ai:cache:{key}")
        if cached:
            data = json.loads(cached)
            if not self._is_expired(data):
                return data["value"]
        return None
        
    async def set(self, key: str, value: Dict, ttl: Optional[int] = None):
        """Cache a response with optional TTL."""
        data = {
            "value": value,
            "timestamp": time.time(),
            "ttl": ttl or self.default_ttl
        }
        await self.redis.setex(
            f"ai:cache:{key}",
            ttl or self.default_ttl,
            json.dumps(data)
        )
        
    async def delete(self, key: str):
        """Delete a cached response."""
        await self.redis.delete(f"ai:cache:{key}")
        
    async def clear_user_cache(self, user_id: str):
        """Clear all cached responses for a user."""
        pattern = f"ai:cache:query:{user_id}:*"
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
            
    def _is_expired(self, data: Dict) -> bool:
        """Check if cached data has expired."""
        return time.time() - data["timestamp"] > data["ttl"]
        
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        keys = await self.redis.keys("ai:cache:*")
        return {
            "total_cached": len(keys),
            "memory_used": await self.redis.memory_usage("ai:cache:*"),
            "hit_rate": await self._calculate_hit_rate()
        }
        
    async def _calculate_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        hits = await self.redis.get("ai:cache:hits") or 0
        misses = await self.redis.get("ai:cache:misses") or 0
        total = hits + misses
        return hits / total if total > 0 else 0 