from typing import Dict, Any, Optional, List
import redis.asyncio as redis
import json
import logging
from datetime import datetime, timedelta

class ContextManager:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.logger = logging.getLogger(__name__)
        self.context_ttl = 86400  # 24 hours
        self.max_history = 50  # Maximum number of messages to keep in history

    async def get_context(self, conversation_id: str, user_id: str, initial_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get or create conversation context"""
        try:
            if not conversation_id:
                return self._create_new_context(user_id, initial_context)

            # Try to get existing context
            context = await self._get_existing_context(conversation_id)
            if context:
                return context

            # Create new context if not found
            return self._create_new_context(user_id, initial_context)

        except Exception as e:
            self.logger.error(f"Error getting context: {str(e)}")
            return self._create_new_context(user_id, initial_context)

    async def update_context(self, conversation_id: str, context_update: Dict[str, Any]) -> Dict[str, Any]:
        """Update conversation context"""
        try:
            if not self.redis:
                return context_update

            # Get existing context
            context = await self._get_existing_context(conversation_id)
            if not context:
                return context_update

            # Update context
            context.update(context_update)
            context['last_updated'] = datetime.utcnow().isoformat()

            # Store updated context
            await self._store_context(conversation_id, context)

            return context

        except Exception as e:
            self.logger.error(f"Error updating context: {str(e)}")
            return context_update

    async def add_to_history(self, conversation_id: str, message: Dict[str, Any]) -> None:
        """Add message to conversation history"""
        try:
            if not self.redis:
                return

            # Get existing history
            history = await self.get_history(conversation_id)
            
            # Add new message
            history.append({
                'timestamp': datetime.utcnow().isoformat(),
                'message': message
            })

            # Trim history if needed
            if len(history) > self.max_history:
                history = history[-self.max_history:]

            # Store updated history
            await self._store_history(conversation_id, history)

        except Exception as e:
            self.logger.error(f"Error adding to history: {str(e)}")

    async def get_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get conversation history"""
        try:
            if not self.redis:
                return []

            key = f"conversation_history:{conversation_id}"
            history_data = await self.redis.get(key)
            
            if history_data:
                return json.loads(history_data)
            return []

        except Exception as e:
            self.logger.error(f"Error getting history: {str(e)}")
            return []

    async def clear_history(self, conversation_id: str) -> None:
        """Clear conversation history"""
        try:
            if not self.redis:
                return

            key = f"conversation_history:{conversation_id}"
            await self.redis.delete(key)

        except Exception as e:
            self.logger.error(f"Error clearing history: {str(e)}")

    def _create_new_context(self, user_id: str, initial_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create new conversation context"""
        context = {
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'last_updated': datetime.utcnow().isoformat(),
            'message_count': 0,
            'metadata': {}
        }

        if initial_context:
            context.update(initial_context)

        return context

    async def _get_existing_context(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get existing conversation context"""
        try:
            if not self.redis:
                return None

            key = f"conversation_context:{conversation_id}"
            context_data = await self.redis.get(key)
            
            if context_data:
                return json.loads(context_data)
            return None

        except Exception as e:
            self.logger.error(f"Error getting existing context: {str(e)}")
            return None

    async def _store_context(self, conversation_id: str, context: Dict[str, Any]) -> None:
        """Store conversation context"""
        try:
            if not self.redis:
                return

            key = f"conversation_context:{conversation_id}"
            await self.redis.setex(
                key,
                self.context_ttl,
                json.dumps(context)
            )

        except Exception as e:
            self.logger.error(f"Error storing context: {str(e)}")

    async def _store_history(self, conversation_id: str, history: List[Dict[str, Any]]) -> None:
        """Store conversation history"""
        try:
            if not self.redis:
                return

            key = f"conversation_history:{conversation_id}"
            await self.redis.setex(
                key,
                self.context_ttl,
                json.dumps(history)
            )

        except Exception as e:
            self.logger.error(f"Error storing history: {str(e)}")

    async def get_conversation_summary(self, conversation_id: str) -> Dict[str, Any]:
        """Get summary of conversation"""
        try:
            context = await self._get_existing_context(conversation_id)
            history = await self.get_history(conversation_id)

            if not context:
                return {}

            return {
                'conversation_id': conversation_id,
                'user_id': context['user_id'],
                'created_at': context['created_at'],
                'last_updated': context['last_updated'],
                'message_count': len(history),
                'metadata': context.get('metadata', {}),
                'recent_messages': history[-5:] if history else []
            }

        except Exception as e:
            self.logger.error(f"Error getting conversation summary: {str(e)}")
            return {}

    async def search_history(self, conversation_id: str, query: str) -> List[Dict[str, Any]]:
        """Search conversation history"""
        try:
            history = await self.get_history(conversation_id)
            query = query.lower()

            results = []
            for entry in history:
                message = entry['message']
                if query in message.get('content', '').lower():
                    results.append(entry)

            return results

        except Exception as e:
            self.logger.error(f"Error searching history: {str(e)}")
            return []

    async def get_user_conversations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversations for a user"""
        try:
            if not self.redis:
                return []

            pattern = f"conversation_context:*"
            conversations = []

            async for key in self.redis.scan_iter(match=pattern):
                context_data = await self.redis.get(key)
                if context_data:
                    context = json.loads(context_data)
                    if context['user_id'] == user_id:
                        conversation_id = key.decode().split(':')[1]
                        summary = await self.get_conversation_summary(conversation_id)
                        conversations.append(summary)

            # Sort by last updated and limit results
            conversations.sort(key=lambda x: x['last_updated'], reverse=True)
            return conversations[:limit]

        except Exception as e:
            self.logger.error(f"Error getting user conversations: {str(e)}")
            return []

    async def cleanup_old_conversations(self, days: int = 7) -> None:
        """Clean up old conversations"""
        try:
            if not self.redis:
                return

            cutoff_date = datetime.utcnow() - timedelta(days=days)
            pattern = "conversation_context:*"

            async for key in self.redis.scan_iter(match=pattern):
                context_data = await self.redis.get(key)
                if context_data:
                    context = json.loads(context_data)
                    last_updated = datetime.fromisoformat(context['last_updated'])

                    if last_updated < cutoff_date:
                        conversation_id = key.decode().split(':')[1]
                        await self.redis.delete(key)
                        await self.redis.delete(f"conversation_history:{conversation_id}")

        except Exception as e:
            self.logger.error(f"Error cleaning up old conversations: {str(e)}") 