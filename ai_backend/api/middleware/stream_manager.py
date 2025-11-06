from typing import Dict, Any, Optional, AsyncGenerator
import redis.asyncio as redis
import json
import asyncio
import logging
from datetime import datetime, timedelta

class StreamManager:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.logger = logging.getLogger(__name__)
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.session_ttl = 3600  # 1 hour
        self.cleanup_interval = 300  # 5 minutes

    async def create_session(self, user_id: str, conversation_id: str) -> Dict[str, Any]:
        """Create a new streaming session"""
        try:
            session_id = f"{user_id}:{conversation_id}"
            session = {
                'id': session_id,
                'user_id': user_id,
                'conversation_id': conversation_id,
                'created_at': datetime.utcnow().isoformat(),
                'last_activity': datetime.utcnow().isoformat(),
                'status': 'active',
                'chunks': [],
                'error': None
            }

            # Store session in Redis
            if self.redis:
                await self.redis.setex(
                    f"stream_session:{session_id}",
                    self.session_ttl,
                    json.dumps(session)
                )

            # Store in memory
            self.active_sessions[session_id] = session

            # Start cleanup task if not already running
            if not hasattr(self, '_cleanup_task'):
                self._cleanup_task = asyncio.create_task(self._cleanup_loop())

            return session

        except Exception as e:
            self.logger.error(f"Error creating stream session: {str(e)}")
            raise

    async def add_chunk(self, session_id: str, chunk: Dict[str, Any]) -> None:
        """Add a chunk to the stream session"""
        try:
            session = self.active_sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")

            # Update session
            session['last_activity'] = datetime.utcnow().isoformat()
            session['chunks'].append(chunk)

            # Store in Redis
            if self.redis:
                await self.redis.setex(
                    f"stream_session:{session_id}",
                    self.session_ttl,
                    json.dumps(session)
                )

        except Exception as e:
            self.logger.error(f"Error adding chunk to session: {str(e)}")
            raise

    async def close(self, session_id: str, error: Optional[str] = None) -> None:
        """Close a streaming session"""
        try:
            session = self.active_sessions.get(session_id)
            if not session:
                return

            # Update session
            session['status'] = 'closed'
            session['last_activity'] = datetime.utcnow().isoformat()
            if error:
                session['error'] = error

            # Store in Redis
            if self.redis:
                await self.redis.setex(
                    f"stream_session:{session_id}",
                    self.session_ttl,
                    json.dumps(session)
                )

            # Remove from memory
            self.active_sessions.pop(session_id, None)

        except Exception as e:
            self.logger.error(f"Error closing session: {str(e)}")
            raise

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session details"""
        try:
            # Check memory first
            session = self.active_sessions.get(session_id)
            if session:
                return session

            # Check Redis
            if self.redis:
                data = await self.redis.get(f"stream_session:{session_id}")
                if data:
                    return json.loads(data)

            return None

        except Exception as e:
            self.logger.error(f"Error getting session: {str(e)}")
            return None

    async def get_session_chunks(self, session_id: str) -> list:
        """Get all chunks for a session"""
        try:
            session = await self.get_session(session_id)
            return session['chunks'] if session else []

        except Exception as e:
            self.logger.error(f"Error getting session chunks: {str(e)}")
            return []

    async def _cleanup_loop(self) -> None:
        """Background task to clean up expired sessions"""
        while True:
            try:
                await self._cleanup_expired_sessions()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                self.logger.error(f"Error in cleanup loop: {str(e)}")
                await asyncio.sleep(60)  # Wait a minute before retrying

    async def _cleanup_expired_sessions(self) -> None:
        """Clean up expired sessions"""
        try:
            now = datetime.utcnow()
            expired_sessions = []

            # Check memory sessions
            for session_id, session in self.active_sessions.items():
                last_activity = datetime.fromisoformat(session['last_activity'])
                if now - last_activity > timedelta(seconds=self.session_ttl):
                    expired_sessions.append(session_id)

            # Remove expired sessions
            for session_id in expired_sessions:
                await self.close(session_id, "Session expired")

            # Clean up Redis
            if self.redis:
                pattern = "stream_session:*"
                async for key in self.redis.scan_iter(match=pattern):
                    data = await self.redis.get(key)
                    if data:
                        session = json.loads(data)
                        last_activity = datetime.fromisoformat(session['last_activity'])
                        if now - last_activity > timedelta(seconds=self.session_ttl):
                            await self.redis.delete(key)

        except Exception as e:
            self.logger.error(f"Error cleaning up expired sessions: {str(e)}")

    async def stream_response(self, session_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response chunks for a session"""
        try:
            session = await self.get_session(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")

            # Stream existing chunks
            for chunk in session['chunks']:
                yield chunk

            # Wait for new chunks
            while session['status'] == 'active':
                if session['error']:
                    raise Exception(session['error'])

                # Get latest session state
                session = await self.get_session(session_id)
                if not session or session['status'] != 'active':
                    break

                # Check for new chunks
                if len(session['chunks']) > 0:
                    yield session['chunks'][-1]

                await asyncio.sleep(0.1)

        except Exception as e:
            self.logger.error(f"Error streaming response: {str(e)}")
            await self.close(session_id, str(e))
            raise

    async def get_active_sessions(self, user_id: Optional[str] = None) -> list:
        """Get list of active sessions"""
        try:
            sessions = []
            
            # Get from memory
            for session in self.active_sessions.values():
                if not user_id or session['user_id'] == user_id:
                    sessions.append(session)

            # Get from Redis
            if self.redis:
                pattern = "stream_session:*"
                async for key in self.redis.scan_iter(match=pattern):
                    data = await self.redis.get(key)
                    if data:
                        session = json.loads(data)
                        if session['status'] == 'active' and (not user_id or session['user_id'] == user_id):
                            sessions.append(session)

            return sessions

        except Exception as e:
            self.logger.error(f"Error getting active sessions: {str(e)}")
            return [] 