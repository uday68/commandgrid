#!/usr/bin/env python3
"""Quick test to find a working OpenRouter model"""

import os
import asyncio
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# Simple models to test quickly
SIMPLE_MODELS = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free", 
    "google/gemma-7b-it:free"
]

async def test_model_quick(model_name: str):
    """Quick test if a model works"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Project Management Tool",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 50
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(ENDPOINT, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ {model_name}: WORKS")
                    return True
                else:
                    print(f"❌ {model_name}: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ {model_name}: {str(e)}")
        return False

async def main():
    print("Quick model test...")
    for model in SIMPLE_MODELS:
        await test_model_quick(model)

if __name__ == "__main__":
    asyncio.run(main())
