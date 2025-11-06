from typing import Dict, Any, Optional
from dataclasses import dataclass
import time
import json
import redis.asyncio as redis
import logging
from datetime import datetime, timedelta

@dataclass
class RequestMetrics:
    start_time: float
    end_time: Optional[float] = None
    success: bool = False
    error: Optional[str] = None
    token_usage: Dict[str, int] = None
    model: str = None
    latency: float = 0.0
    request_size: int = 0
    response_size: int = 0

    def end_request(self, success: bool = True, error: Optional[str] = None) -> None:
        """End metrics collection for a request"""
        self.end_time = time.time()
        self.success = success
        self.error = error
        self.latency = self.end_time - self.start_time

class MetricsCollector:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.logger = logging.getLogger(__name__)
        self.metrics_ttl = 86400  # 24 hours

    def start_request(self) -> RequestMetrics:
        """Start collecting metrics for a request"""
        return RequestMetrics(
            start_time=time.time(),
            token_usage={},
            request_size=0,
            response_size=0
        )

    async def save_metrics(self, metrics: RequestMetrics) -> None:
        """Save metrics to storage"""
        try:
            if not self.redis:
                return

            # Prepare metrics data
            metrics_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'latency': metrics.latency,
                'success': metrics.success,
                'error': metrics.error,
                'token_usage': metrics.token_usage,
                'model': metrics.model,
                'request_size': metrics.request_size,
                'response_size': metrics.response_size
            }

            # Save to Redis
            key = f"metrics:{datetime.utcnow().strftime('%Y%m%d')}"
            await self.redis.rpush(key, json.dumps(metrics_data))
            await self.redis.expire(key, self.metrics_ttl)

            # Log metrics
            self.logger.info(f"Metrics saved: {metrics_data}")

        except Exception as e:
            self.logger.error(f"Error saving metrics: {str(e)}")

    async def get_metrics(self, date: Optional[str] = None) -> list:
        """Get metrics for a specific date"""
        try:
            if not self.redis:
                return []

            date = date or datetime.utcnow().strftime('%Y%m%d')
            key = f"metrics:{date}"
            
            metrics = await self.redis.lrange(key, 0, -1)
            return [json.loads(m) for m in metrics]

        except Exception as e:
            self.logger.error(f"Error getting metrics: {str(e)}")
            return []

    async def get_aggregated_metrics(self, days: int = 7) -> Dict[str, Any]:
        """Get aggregated metrics for the last N days"""
        try:
            if not self.redis:
                return {}

            aggregated = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_latency': 0,
                'total_tokens': 0,
                'model_usage': {},
                'error_distribution': {}
            }

            total_latency = 0
            total_requests = 0

            # Get metrics for each day
            for i in range(days):
                date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y%m%d')
                metrics = await self.get_metrics(date)

                for metric in metrics:
                    aggregated['total_requests'] += 1
                    total_latency += metric['latency']

                    if metric['success']:
                        aggregated['successful_requests'] += 1
                    else:
                        aggregated['failed_requests'] += 1
                        error_type = metric['error'] or 'unknown'
                        aggregated['error_distribution'][error_type] = aggregated['error_distribution'].get(error_type, 0) + 1

                    # Aggregate token usage
                    if metric['token_usage']:
                        for model, tokens in metric['token_usage'].items():
                            if model not in aggregated['model_usage']:
                                aggregated['model_usage'][model] = 0
                            aggregated['model_usage'][model] += tokens
                            aggregated['total_tokens'] += tokens

            # Calculate averages
            if total_requests > 0:
                aggregated['average_latency'] = total_latency / total_requests

            return aggregated

        except Exception as e:
            self.logger.error(f"Error getting aggregated metrics: {str(e)}")
            return {}

    async def get_model_performance(self, model: str, days: int = 7) -> Dict[str, Any]:
        """Get performance metrics for a specific model"""
        try:
            if not self.redis:
                return {}

            metrics = await self.get_aggregated_metrics(days)
            model_metrics = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_latency': 0,
                'total_tokens': 0,
                'error_distribution': {}
            }

            total_latency = 0
            total_requests = 0

            # Filter metrics for the specific model
            for i in range(days):
                date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y%m%d')
                daily_metrics = await self.get_metrics(date)

                for metric in daily_metrics:
                    if metric['model'] == model:
                        model_metrics['total_requests'] += 1
                        total_latency += metric['latency']

                        if metric['success']:
                            model_metrics['successful_requests'] += 1
                        else:
                            model_metrics['failed_requests'] += 1
                            error_type = metric['error'] or 'unknown'
                            model_metrics['error_distribution'][error_type] = model_metrics['error_distribution'].get(error_type, 0) + 1

                        if metric['token_usage']:
                            model_metrics['total_tokens'] += metric['token_usage'].get(model, 0)

            # Calculate averages
            if model_metrics['total_requests'] > 0:
                model_metrics['average_latency'] = total_latency / model_metrics['total_requests']

            return model_metrics

        except Exception as e:
            self.logger.error(f"Error getting model performance: {str(e)}")
            return {}

    async def cleanup_old_metrics(self, days_to_keep: int = 30) -> None:
        """Clean up metrics older than specified days"""
        try:
            if not self.redis:
                return

            cutoff_date = (datetime.utcnow() - timedelta(days=days_to_keep)).strftime('%Y%m%d')
            pattern = "metrics:*"
            
            async for key in self.redis.scan_iter(match=pattern):
                date_str = key.decode().split(':')[1]
                if date_str < cutoff_date:
                    await self.redis.delete(key)

        except Exception as e:
            self.logger.error(f"Error cleaning up old metrics: {str(e)}") 