#!/usr/bin/env python3
"""
Simple test to verify AI service is working
"""
import asyncio
import sys
import os

# Add the current directory to the path so we can import main
sys.path.insert(0, os.path.dirname(__file__))

from main import app

async def test_ai_service():
    """Test the AI service initialization and basic functionality"""
    try:
        print("🧪 Testing AI service initialization...")
        
        # Test if AI service is available
        if hasattr(app.state, 'ai') and app.state.ai:
            print("✅ AI service is initialized")
            
            # Test model configuration
            model_config = await app.state.ai.get_model_config("meta-llama/llama-3.1-8b-instruct:free")
            print(f"✅ Model config: {model_config}")
            
            # Test a simple query (mock user)
            from main import AIQueryRequest
            mock_user = {"id": "test-user", "email": "test@example.com"}
            
            request = AIQueryRequest(
                query="Hello, this is a test",
                conversation_id="test-conv-123"
            )
            
            print("🔄 Testing AI query...")
            response = await app.state.ai.query_ai(request, mock_user)
            
            if response and response.response:
                print(f"✅ AI Query successful: {response.response[:100]}...")
                print("🎉 AI service is working correctly!")
                return True
            else:
                print("❌ AI Query failed - no response")
                return False
                
        else:
            print("❌ AI service is not initialized")
            return False
            
    except Exception as e:
        print(f"❌ Error testing AI service: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting AI service test...")
    success = asyncio.run(test_ai_service())
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)
