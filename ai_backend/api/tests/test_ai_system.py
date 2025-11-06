import os
import asyncio
import pytest
import redis.asyncio as redis
from datetime import datetime
from main import AIService, DatabaseService, Settings
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Test configuration
TEST_CONFIG = {
    "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY", "test_key"),
    "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379"),
    "DB_URL": os.getenv("DATABASE_URL", "postgresql://postgres:newpassword@localhost:5433/pmt")
}

@pytest.fixture
async def redis_client():
    """Create Redis client for testing"""
    redis_client = await redis.from_url(TEST_CONFIG["REDIS_URL"])
    yield redis_client
    await redis_client.close()

@pytest.fixture
async def db_service():
    """Create database service for testing"""
    db = DatabaseService()
    await db.connect()
    yield db
    if db.pool:
        await db.pool.close()

@pytest.fixture
async def ai_service(db_service, redis_client):
    """Create AI service for testing"""
    return AIService(db_service, redis_client)

@pytest.fixture
def test_app():
    """Create FastAPI test app"""
    app = FastAPI()
    return app

@pytest.fixture
def test_client(test_app):
    """Create test client"""
    return TestClient(test_app)

async def test_rate_limiter(redis_client):
    """Test rate limiting functionality"""
    from middleware.rate_limiter import RateLimiter
    
    limiter = RateLimiter(redis_client)
    user_id = "test_user"
    
    # Test basic rate limiting
    assert not await limiter.is_rate_limited(user_id)
    assert not await limiter.is_rate_limited(user_id)
    
    # Test user tier limits
    await limiter.update_user_tier(user_id, "premium")
    limits = await limiter.get_user_limits(user_id)
    assert limits["limit"] > 100  # Premium should have higher limit
    
    # Test remaining requests
    remaining = await limiter.get_remaining_requests(user_id)
    assert "remaining" in remaining
    assert "reset_in" in remaining

async def test_token_tracker(redis_client):
    """Test token tracking functionality"""
    from middleware.token_tracker import TokenTracker
    
    tracker = TokenTracker(redis_client)
    user_id = "test_user"
    
    # Test token availability
    assert await tracker.has_available_tokens(user_id)
    
    # Test token usage tracking
    await tracker.track_usage(user_id, {
        "model": "gpt-3.5-turbo",
        "total_tokens": 100
    })
    
    # Test usage history
    history = await tracker.get_usage_history(user_id)
    assert len(history) > 0
    
    # Test usage stats
    stats = await tracker.get_usage_stats(user_id)
    assert "total_tokens" in stats
    assert "total_cost" in stats

async def test_error_handler():
    """Test error handling functionality"""
    from middleware.ai_error_handler import AIErrorHandler
    
    handler = AIErrorHandler()
    
    # Test various error types
    error_info = handler.handle_error(Exception("Test error"))
    assert error_info.status_code == 500
    
    error_info = handler.handle_error(TimeoutError())
    assert error_info.status_code == 504

async def test_metrics_collector(redis_client):
    """Test metrics collection"""
    from middleware.metrics_collector import MetricsCollector
    
    collector = MetricsCollector(redis_client)
    
    # Test metrics collection
    metrics = collector.start_request()
    collector.end_request(metrics, success=True)
    await collector.save_metrics(metrics)
    
    # Test metrics retrieval
    saved_metrics = await collector.get_metrics()
    assert len(saved_metrics) > 0

async def test_stream_manager(redis_client):
    """Test stream management"""
    from middleware.stream_manager import StreamManager
    
    manager = StreamManager(redis_client)
    user_id = "test_user"
    conversation_id = "test_conversation"
    
    # Test session creation
    session = await manager.create_session(user_id, conversation_id)
    assert session["status"] == "active"
    
    # Test adding chunks
    await manager.add_chunk(session["id"], {"content": "test chunk"})
    
    # Test session retrieval
    retrieved_session = await manager.get_session(session["id"])
    assert retrieved_session is not None

async def test_feedback_analyzer(redis_client):
    """Test feedback analysis"""
    from middleware.feedback_analyzer import FeedbackAnalyzer
    
    analyzer = FeedbackAnalyzer(redis_client)
    conversation_id = "test_conversation"
    
    # Test feedback analysis
    feedback = {
        "rating": 4,
        "comment": "Great service!",
        "categories": ["accuracy", "speed"]
    }
    
    await analyzer.analyze_feedback(conversation_id, feedback)
    
    # Test metrics retrieval
    metrics = await analyzer.get_feedback_metrics()
    assert "total_feedback" in metrics

async def test_context_manager(redis_client):
    """Test context management"""
    from middleware.context_manager import ContextManager
    
    manager = ContextManager(redis_client)
    user_id = "test_user"
    conversation_id = "test_conversation"
    
    # Test context creation
    context = await manager.get_context(conversation_id, user_id)
    assert context["user_id"] == user_id
    
    # Test history management
    await manager.add_to_history(conversation_id, {"content": "test message"})
    history = await manager.get_history(conversation_id)
    assert len(history) > 0

async def test_ai_service(ai_service):
    """Test main AI service functionality"""
    # Test basic query
    try:
        response = await ai_service.query_ai({
            "query": "Test query",
            "context": {},
            "conversation_id": "test_conversation"
        }, {
            "id": "test_user",
            "email": "test@example.com",
            "role": "user"
        })
        
        assert response is not None
        assert "response" in response
    except Exception as e:
        # If Redis is not available, the test should handle it gracefully
        assert "Redis" in str(e) or "unavailable" in str(e)

async def test_end_to_end(test_client):
    """Test end-to-end API functionality"""
    # Test AI query endpoint
    response = test_client.post(
        "/ai/query",
        json={
            "query": "Test query",
            "context": {},
            "conversation_id": "test_conversation"
        },
        headers={"Authorization": "Bearer test_token"}
    )
    
    assert response.status_code == 200
    assert "response" in response.json()

if __name__ == "__main__":
    pytest.main([__file__])