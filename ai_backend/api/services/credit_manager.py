"""
OpenAI Credit Management Service
Manages the $40 budget and tracks usage to prevent overspending
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, asdict
import aioredis
from models.config import settings

logger = logging.getLogger(__name__)

@dataclass
class UsageMetrics:
    """Track usage metrics for credit management"""
    total_spent: float = 0.0
    daily_spent: float = 0.0
    hourly_spent: float = 0.0
    total_requests: int = 0
    hourly_requests: int = 0
    last_reset_date: str = ""
    last_reset_hour: str = ""

class CreditManager:
    """Manages OpenAI API credit usage and limits"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.usage_file = os.path.join(os.path.dirname(__file__), '..', 'usage_tracking.json')
        
    async def get_usage_metrics(self) -> UsageMetrics:
        """Get current usage metrics"""
        try:
            if self.redis:
                # Try to get from Redis first
                data = await self.redis.get("openai_usage_metrics")
                if data:
                    return UsageMetrics(**json.loads(data))
            
            # Fallback to file
            if os.path.exists(self.usage_file):
                with open(self.usage_file, 'r') as f:
                    data = json.load(f)
                    return UsageMetrics(**data)
            
            return UsageMetrics()
            
        except Exception as e:
            logger.error(f"Failed to get usage metrics: {e}")
            return UsageMetrics()
    
    async def save_usage_metrics(self, metrics: UsageMetrics):
        """Save usage metrics"""
        try:
            data = asdict(metrics)
            
            if self.redis:
                await self.redis.set("openai_usage_metrics", json.dumps(data), ex=86400)  # 24h expiry
            
            # Also save to file as backup
            os.makedirs(os.path.dirname(self.usage_file), exist_ok=True)
            with open(self.usage_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save usage metrics: {e}")
    
    async def reset_daily_usage_if_needed(self, metrics: UsageMetrics) -> UsageMetrics:
        """Reset daily usage if it's a new day"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        if metrics.last_reset_date != today:
            metrics.daily_spent = 0.0
            metrics.last_reset_date = today
            logger.info(f"Reset daily usage for {today}")
            
        return metrics
    
    async def reset_hourly_usage_if_needed(self, metrics: UsageMetrics) -> UsageMetrics:
        """Reset hourly usage if it's a new hour"""
        current_hour = datetime.now().strftime("%Y-%m-%d-%H")
        
        if metrics.last_reset_hour != current_hour:
            metrics.hourly_spent = 0.0
            metrics.hourly_requests = 0
            metrics.last_reset_hour = current_hour
            logger.info(f"Reset hourly usage for {current_hour}")
            
        return metrics
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost based on token usage"""
        pricing = settings.OPENAI_MODEL_PRICING.get(model, settings.OPENAI_MODEL_PRICING["gpt-3.5-turbo"])
        
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        
        return input_cost + output_cost
    
    async def check_limits_before_request(self, model: str, estimated_tokens: int) -> Tuple[bool, str]:
        """Check if request can be made within limits"""
        metrics = await self.get_usage_metrics()
        metrics = await self.reset_daily_usage_if_needed(metrics)
        metrics = await self.reset_hourly_usage_if_needed(metrics)
        
        # Estimate cost for the request
        estimated_cost = self.calculate_cost(model, estimated_tokens, estimated_tokens // 2)
        
        # Check total budget limit
        if metrics.total_spent + estimated_cost > settings.OPENAI_CREDIT_LIMIT:
            remaining = settings.OPENAI_CREDIT_LIMIT - metrics.total_spent
            return False, f"Total budget limit reached. Remaining: ${remaining:.4f}"
        
        # Check daily limit
        if metrics.daily_spent + estimated_cost > settings.OPENAI_DAILY_LIMIT:
            remaining = settings.OPENAI_DAILY_LIMIT - metrics.daily_spent
            return False, f"Daily limit reached. Remaining today: ${remaining:.4f}"
        
        # Check hourly limit
        if metrics.hourly_spent + estimated_cost > settings.OPENAI_HOURLY_LIMIT:
            remaining = settings.OPENAI_HOURLY_LIMIT - metrics.hourly_spent
            return False, f"Hourly limit reached. Remaining this hour: ${remaining:.4f}"
        
        # Check request count limit
        if metrics.hourly_requests >= settings.OPENAI_REQUEST_LIMIT:
            return False, f"Hourly request limit reached ({settings.OPENAI_REQUEST_LIMIT} requests/hour)"
        
        return True, "OK"
    
    async def record_usage(self, model: str, input_tokens: int, output_tokens: int):
        """Record actual usage after API call"""
        cost = self.calculate_cost(model, input_tokens, output_tokens)
        
        metrics = await self.get_usage_metrics()
        metrics = await self.reset_daily_usage_if_needed(metrics)
        metrics = await self.reset_hourly_usage_if_needed(metrics)
        
        # Update metrics
        metrics.total_spent += cost
        metrics.daily_spent += cost
        metrics.hourly_spent += cost
        metrics.total_requests += 1
        metrics.hourly_requests += 1
        
        await self.save_usage_metrics(metrics)
        
        # Log usage
        logger.info(f"OpenAI Usage - Model: {model}, Tokens: {input_tokens}+{output_tokens}, Cost: ${cost:.6f}")
        logger.info(f"Total spent: ${metrics.total_spent:.4f}/${settings.OPENAI_CREDIT_LIMIT}")
        logger.info(f"Daily spent: ${metrics.daily_spent:.4f}/${settings.OPENAI_DAILY_LIMIT}")
        
        # Warning if approaching limits
        if metrics.total_spent > settings.OPENAI_CREDIT_LIMIT * 0.8:
            logger.warning(f"Approaching total budget limit: ${metrics.total_spent:.4f}/${settings.OPENAI_CREDIT_LIMIT}")
        
        if metrics.daily_spent > settings.OPENAI_DAILY_LIMIT * 0.8:
            logger.warning(f"Approaching daily limit: ${metrics.daily_spent:.4f}/${settings.OPENAI_DAILY_LIMIT}")
    
    async def get_usage_summary(self) -> Dict:
        """Get usage summary for reporting"""
        metrics = await self.get_usage_metrics()
        metrics = await self.reset_daily_usage_if_needed(metrics)
        metrics = await self.reset_hourly_usage_if_needed(metrics)
        
        return {
            "total_budget": settings.OPENAI_CREDIT_LIMIT,
            "total_spent": metrics.total_spent,
            "total_remaining": settings.OPENAI_CREDIT_LIMIT - metrics.total_spent,
            "daily_limit": settings.OPENAI_DAILY_LIMIT,
            "daily_spent": metrics.daily_spent,
            "daily_remaining": settings.OPENAI_DAILY_LIMIT - metrics.daily_spent,
            "hourly_limit": settings.OPENAI_HOURLY_LIMIT,
            "hourly_spent": metrics.hourly_spent,
            "hourly_remaining": settings.OPENAI_HOURLY_LIMIT - metrics.hourly_spent,
            "total_requests": metrics.total_requests,
            "hourly_requests": metrics.hourly_requests,
            "request_limit_remaining": settings.OPENAI_REQUEST_LIMIT - metrics.hourly_requests,
            "usage_percentage": (metrics.total_spent / settings.OPENAI_CREDIT_LIMIT) * 100,
            "last_reset_date": metrics.last_reset_date,
            "last_reset_hour": metrics.last_reset_hour
        }

# Global instance
credit_manager = CreditManager()
