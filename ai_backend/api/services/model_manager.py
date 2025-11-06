import os
from typing import Dict, List, Optional
from ..config import settings

class ModelManager:
    def __init__(self):
        self.models = {            "default": {
                "name": "gpt-3.5-turbo",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "max_tokens": 2048,
                "temperature": 0.7,
                "fallback": "gpt-3.5-turbo-16k"
            },            "code": {
                "name": "gpt-3.5-turbo",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "max_tokens": 1000,
                "temperature": 0.2
            },
            "analysis": {
                "name": "gpt-3.5-turbo",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "max_tokens": 1500,
                "temperature": 0.5
            }
        }
        
    async def select_model(self, query: str, context: List[Dict]) -> Dict:
        """Select the optimal model based on query type and context."""
        # Check for code-related keywords
        code_keywords = ["code", "function", "class", "method", "algorithm", "bug", "error"]
        if any(keyword in query.lower() for keyword in code_keywords):
            return self.models["code"]
            
        # Check for analysis-related keywords
        analysis_keywords = ["analyze", "analysis", "report", "summary", "review"]
        if any(keyword in query.lower() for keyword in analysis_keywords):
            return self.models["analysis"]
            
        # Default to the default model
        return self.models["default"]
        
    async def get_model_config(self, model_name: str) -> Dict:
        """Get configuration for a specific model."""
        return self.models.get(model_name, self.models["default"])
        
    async def get_fallback_model(self, model_name: str) -> Optional[Dict]:
        """Get fallback model configuration if available."""
        model = self.models.get(model_name)
        if model and "fallback" in model:
            return self.models.get(model["fallback"])
        return None 