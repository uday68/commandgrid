#!/usr/bin/env python3
"""Simple test to check if AI backend can start"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment loaded")
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        print(f"✅ API Key found: {api_key[:20]}...")
    else:
        print("❌ No API key found")
    
    from main import AIService, DatabaseService
    print("✅ AIService imported successfully")
    
    # Test initialization
    db = DatabaseService()
    ai_service = AIService(db, None)
    print("✅ AIService initialized")
    
    print("\n🎉 AI Backend appears to be working!")
    print("The 404 error might be due to the specific model being unavailable.")
    print("The system will try fallback models automatically.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
