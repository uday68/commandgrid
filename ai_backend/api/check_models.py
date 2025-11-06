#!/usr/bin/env python3
"""Check available models from OpenRouter"""

import os
import asyncio
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

async def get_available_models():
    """Get list of available models from OpenRouter"""
    if not API_KEY:
        print("❌ No API key configured")
        return
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    models = data.get("data", [])
                    
                    print(f"Found {len(models)} models")
                    
                    # Filter for free models
                    free_models = [m for m in models if "free" in m.get("id", "").lower()]
                    print(f"\nFree models ({len(free_models)}):")
                    for model in free_models[:10]:  # Show first 10
                        print(f"  - {model.get('id', 'Unknown')}")
                    
                    # Show some popular models
                    popular_keywords = ["llama", "gemma", "phi", "mistral"]
                    print(f"\nPopular models:")
                    for model in models:
                        model_id = model.get("id", "").lower()
                        if any(keyword in model_id for keyword in popular_keywords):
                            print(f"  - {model.get('id', 'Unknown')}")
                            if len([m for m in models if any(k in m.get("id", "").lower() for k in popular_keywords)]) >= 10:
                                break
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to get models ({response.status}): {error_text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

async def test_simple_model():
    """Test a very basic model that should work"""
    models_to_try = [
        "openai/gpt-3.5-turbo",
        "anthropic/claude-3-haiku",
        "google/gemini-flash-1.5",
        "meta-llama/llama-3-8b-instruct",
        "microsoft/phi-3-medium-128k-instruct"
    ]
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Project Management Tool",
        "Content-Type": "application/json"
    }
    
    for model in models_to_try:
        print(f"\nTesting: {model}")
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 10
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "No response")
                        print(f"✅ {model}: {content}")
                        return model  # Return first working model
                    else:
                        error_text = await response.text()
                        print(f"❌ {model}: {response.status} - {error_text[:100]}")
        except Exception as e:
            print(f"❌ {model}: {str(e)}")
    
    return None

async def main():
    print("Checking OpenRouter API...")
    print(f"API Key: {API_KEY[:20]}..." if API_KEY else "No API Key")
    
    await get_available_models()
    
    print("\n" + "="*50)
    print("Testing individual models...")
    working_model = await test_simple_model()
    
    if working_model:
        print(f"\n✅ Found working model: {working_model}")
    else:
        print("\n❌ No working models found")

if __name__ == "__main__":
    asyncio.run(main())
