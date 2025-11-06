#!/usr/bin/env python3
"""Test AI backend startup"""

import os
import sys
from dotenv import load_dotenv

print("Loading environment variables...")
load_dotenv()

print(f"OPENROUTER_API_KEY: {os.getenv('OPENROUTER_API_KEY', 'NOT SET')[:20]}...")
print(f"JWT_SECRET: {os.getenv('JWT_SECRET', 'NOT SET')[:20]}...")
print(f"DEBUG: {os.getenv('DEBUG', 'NOT SET')}")

try:
    from middleware.metrics_collector import MetricsCollector, RequestMetrics
    print("✓ MetricsCollector imported successfully")
    
    # Test RequestMetrics
    metrics = RequestMetrics(start_time=0.0)
    print("✓ RequestMetrics created successfully")
    
    # Test end_request method
    metrics.end_request(success=True)
    print("✓ RequestMetrics.end_request() works")
    
except Exception as e:
    print(f"✗ Error with MetricsCollector: {e}")

try:
    from middleware.ai_error_handler import AIErrorHandler
    error_handler = AIErrorHandler()
    print("✓ AIErrorHandler imported and initialized successfully")
except Exception as e:
    print(f"✗ Error with AIErrorHandler: {e}")

try:
    from main import AIService, DatabaseService
    print("✓ AIService and DatabaseService imported successfully")
    
    # Test minimal initialization
    db = DatabaseService()
    ai_service = AIService(db, None)  # No Redis
    print("✓ AIService initialized successfully without Redis")
    
except Exception as e:
    print(f"✗ Error with AIService: {e}")
    import traceback
    traceback.print_exc()

print("Test completed!")
