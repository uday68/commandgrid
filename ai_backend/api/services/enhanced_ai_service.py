import time
import json
import re
import aiohttp
import os
from typing import Dict, List, Optional, Any
from uuid import UUID
import redis.asyncio as redis
from fastapi import HTTPException, status
from ..models.ai_models import AIQueryRequest, AIQueryResponse, ErrorResponse
from .database_service import DatabaseService
from .model_manager import ModelManager
from .cache_manager import CacheManager
from .security_manager import SecurityManager
from .context_manager import ContextManager

class ModelError(Exception):
    pass

class ResponseProcessingError(Exception):
    pass

class EnhancedAIService:
    def __init__(self, db: DatabaseService, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.model_manager = ModelManager()
        self.cache_manager = CacheManager(redis_client)
        self.security_manager = SecurityManager()
        self.metrics_manager = MetricsManager(redis_client)
        self.context_manager = ContextManager(redis_client)
        self.error_handler = ErrorHandler(redis_client)
        self.rate_limiter = RateLimiter(redis_client)

    async def process_query(self, request: AIQueryRequest, user: dict) -> AIQueryResponse:
        try:
            # 1. Input Validation and Sanitization
            sanitized_query = self.security_manager.sanitize_input(request.query)
            
            # 2. Check Cache
            cache_key = self._generate_cache_key(sanitized_query, user['id'])
            cached_response = await self.cache_manager.get(cache_key)
            if cached_response:
                return cached_response
                
            # 3. Rate Limiting
            if await self.rate_limiter.is_rate_limited(user['id'], user.get('plan', 'free')):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later."
                )
                
            # 4. Context Management
            context = await self.context_manager.get_context(
                request.context.get('conversation_id', str(UUID(int=0))),
                user['id']
            )
            
            # 5. Model Selection
            model = await self.model_manager.select_model(request.query, context)
            
            # 6. Request Processing
            start_time = time.time()
            response = await self._process_with_model(model, sanitized_query, context)
            
            # 7. Response Processing
            processed_response = await self._process_response(response, context, time.time() - start_time)
            
            # 8. Cache Results
            await self.cache_manager.set(cache_key, processed_response)
            
            # 9. Metrics Collection
            await self.metrics_manager.record_request(
                user_id=user['id'],
                model=model['name'],
                duration=time.time() - start_time,
                success=True
            )
            
            return processed_response
            
        except Exception as e:
            await self.metrics_manager.record_error(user['id'], str(e))
            error_response = await self.error_handler.handle_error(e)
            raise HTTPException(
                status_code=error_response.status_code,
                detail=error_response.message
            )

    def _generate_cache_key(self, query: str, user_id: UUID) -> str:
        """Generate a unique cache key for the query."""
        return f"query:{user_id}:{hash(query)}"

    async def _process_with_model(self, model: Dict, query: str, context: List[Dict]) -> Dict:
        """Process the query with the selected model."""
        try:
            # Prepare the prompt with context
            prompt = self._prepare_prompt(query, context)
            
            # Make the API call
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    model['endpoint'],
                    json={
                        "prompt": prompt,
                        "max_tokens": model['max_tokens'],
                        "temperature": model['temperature']
                    },
                    headers={"Authorization": f"Bearer {model['api_key']}"}
                ) as response:
                    if response.status != 200:
                        raise ModelError(f"Model API error: {response.status}")
                    return await response.json()
        except Exception as e:
            raise ModelError(f"Error processing with model: {str(e)}")

    async def _process_response(self, response: Dict, context: List[Dict], processing_time: float) -> AIQueryResponse:
        """Process and format the model response."""
        try:
            # Extract the response text and calculate confidence
            response_text = response['choices'][0]['text']
            confidence = response.get('confidence', 0.8)  # Default confidence if not provided
            
            # Create metadata from additional response data
            metadata = {
                'model': response.get('model', 'default'),
                'context_length': len(context),
                'raw_response': response
            }
            
            return AIQueryResponse(
                response=response_text,
                confidence=confidence,
                processing_time=processing_time,
                metadata=metadata
            )
        except Exception as e:
            raise ResponseProcessingError(f"Error processing response: {str(e)}")

    def _prepare_prompt(self, query: str, context: List[Dict]) -> str:
        """Prepare the prompt with context."""
        context_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in context])
        return f"{context_str}\nUser: {query}\nAssistant:"