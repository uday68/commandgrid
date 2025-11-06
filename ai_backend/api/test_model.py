#!/usr/bin/env python3
"""Test different AI models with OpenRouter"""

import os
import asyncio
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# Models to test
MODELS_TO_TEST = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free", 
    "nousresearch/nous-capybara-7b:free",
    "openchat/openchat-7b:free",
    "huggingface/zephyr-7b-beta:free"
]

async def test_model(model_name: str):
    """Test if a model is available and working"""
    print(f"\nTesting model: {model_name}")
    
    if not API_KEY:
        print("❌ No API key configured")
        return False
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Project Management Tool",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Say hello"}
        ],
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                ENDPOINT,
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "No response")
                    print(f"✅ Success: {content[:50]}...")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Failed ({response.status}): {error_text[:100]}...")
                    return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

async def main():
    print("Testing OpenRouter AI models...")
    print(f"API Key: {API_KEY[:20]}..." if API_KEY else "No API Key")
    
    working_models = []
    
    for model in MODELS_TO_TEST:
        if await test_model(model):
            working_models.append(model)
    
    print(f"\n📊 Results:")
    print(f"Working models: {len(working_models)}/{len(MODELS_TO_TEST)}")
    
    if working_models:
        print("✅ Available models:")
        for model in working_models:
            print(f"  - {model}")
        print(f"\n💡 Recommended default: {working_models[0]}")
    else:
        print("❌ No models are working. Check your API key and internet connection.")

if __name__ == "__main__":
    asyncio.run(main())
