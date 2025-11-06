from typing import List, Dict, Any, Optional
from uuid import UUID
import json
from datetime import datetime
from ..models.ai_models import ConversationContext

class ContextManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.max_context_length = 10  # Maximum number of messages to keep in context

    async def get_context(self, conversation_id: str, user_id: UUID) -> List[Dict[str, Any]]:
        """Retrieve the conversation context from Redis."""
        try:
            context_key = f"context:{user_id}:{conversation_id}"
            context_data = await self.redis.get(context_key)
            
            if not context_data:
                # Create new context if none exists
                context = ConversationContext(
                    conversation_id=UUID(conversation_id),
                    messages=[],
                    metadata={
                        "user_id": str(user_id),
                        "created_at": datetime.utcnow().isoformat()
                    }
                )
                await self.save_context(context, user_id)
                return context.messages
            
            context = ConversationContext.parse_raw(context_data)
            return context.messages
            
        except Exception as e:
            # Log error and return empty context
            print(f"Error retrieving context: {str(e)}")
            return []

    async def save_context(self, context: ConversationContext, user_id: UUID) -> None:
        """Save the conversation context to Redis."""
        try:
            context_key = f"context:{user_id}:{context.conversation_id}"
            context.updated_at = datetime.utcnow()
            
            # Ensure we don't exceed max context length
            if len(context.messages) > self.max_context_length:
                context.messages = context.messages[-self.max_context_length:]
            
            await self.redis.set(
                context_key,
                context.json(),
                ex=3600  # Expire after 1 hour
            )
            
        except Exception as e:
            print(f"Error saving context: {str(e)}")
            raise

    async def add_message(self, conversation_id: str, user_id: UUID, message: Dict[str, Any]) -> None:
        """Add a new message to the conversation context."""
        try:
            context = await self.get_context(conversation_id, user_id)
            context.append(message)
            
            # Create new context object with updated messages
            updated_context = ConversationContext(
                conversation_id=UUID(conversation_id),
                messages=context,
                metadata={
                    "user_id": str(user_id),
                    "last_message_at": datetime.utcnow().isoformat()
                }
            )
            
            await self.save_context(updated_context, user_id)
            
        except Exception as e:
            print(f"Error adding message to context: {str(e)}")
            raise

    async def clear_context(self, conversation_id: str, user_id: UUID) -> None:
        """Clear the conversation context."""
        try:
            context_key = f"context:{user_id}:{conversation_id}"
            await self.redis.delete(context_key)
        except Exception as e:
            print(f"Error clearing context: {str(e)}")
            raise 