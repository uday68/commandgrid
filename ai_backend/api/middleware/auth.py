from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Optional, Dict
from uuid import UUID
import os
import logging
from datetime import datetime, timedelta
import redis.asyncio as redis

# Setup logging
logger = logging.getLogger(__name__)

# Constants
JWT_SECRET_KEY = os.getenv("JWT_SECRET", "1234567890abcdefghijklmnopqrstuvwxyz")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
BLOCK_DURATION_MINUTES = int(os.getenv("BLOCK_DURATION_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class TokenBlacklist:
    def __init__(self):
        self.redis = None

    async def connect(self):
        if not self.redis:
            self.redis = await redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

    async def add_to_blacklist(self, token: str, expires_in: int):
        await self.connect()
        await self.redis.setex(f"blacklist:{token}", expires_in, "1")

    async def is_blacklisted(self, token: str) -> bool:
        await self.connect()
        return await self.redis.exists(f"blacklist:{token}")

class RateLimiter:
    def __init__(self):
        self.redis = None

    async def connect(self):
        if not self.redis:
            self.redis = await redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

    async def check_rate_limit(self, user_id: str, action: str = "default", limit: int = 100, window: int = 3600) -> bool:
        await self.connect()
        key = f"ratelimit:{action}:{user_id}"
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, window)
        return current <= limit

    async def is_rate_limited(self, user_id: str, action: str = "default", limit: int = 100, window: int = 3600) -> bool:
        """Check if user is rate limited (returns True if limited)"""
        return not await self.check_rate_limit(user_id, action, limit, window)

    async def get_failed_attempts(self, user_id: str) -> int:
        await self.connect()
        attempts = await self.redis.get(f"failed_attempts:{user_id}")
        return int(attempts) if attempts else 0

    async def increment_failed_attempts(self, user_id: str):
        await self.connect()
        key = f"failed_attempts:{user_id}"
        attempts = await self.redis.incr(key)
        if attempts == 1:
            await self.redis.expire(key, BLOCK_DURATION_MINUTES * 60)

    async def reset_failed_attempts(self, user_id: str):
        await self.connect()
        await self.redis.delete(f"failed_attempts:{user_id}")

# Initialize instances
token_blacklist = TokenBlacklist()
rate_limiter = RateLimiter()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a new JWT access token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """
    Create a new JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def decode_token(token: str) -> Optional[Dict]:
    """
    Decode and validate JWT token with additional security checks
    """
    try:
        # Check if token is blacklisted
        if await token_blacklist.is_blacklisted(token):
            logger.warning("Attempted to use blacklisted token")
            return None

        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # Validate token type
        if payload.get("type") not in ["access", "refresh"]:
            logger.warning("Invalid token type")
            return None

        return payload
    except JWTError as e:
        logger.error(f"Token validation error: {str(e)}")
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), request: Request = None) -> Dict:
    """
    Get the current authenticated user from JWT token with enhanced security
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Rate limiting check
    if request:
        client_ip = request.client.host
        if not await rate_limiter.check_rate_limit(client_ip, "auth", 100, 3600):  # 100 requests per hour
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts"
            )

    payload = await decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Check if user is blocked due to failed attempts
    failed_attempts = await rate_limiter.get_failed_attempts(user_id)
    if failed_attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily blocked. Try again in {BLOCK_DURATION_MINUTES} minutes."
        )

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "member"),
        "token_type": payload.get("type")
    }

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> Dict:
    """
    Verify that the current user is active
    """
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user

async def verify_token_type(token: str, expected_type: str) -> bool:
    """
    Verify that the token is of the expected type (access or refresh)
    """
    payload = await decode_token(token)
    return payload and payload.get("type") == expected_type

async def blacklist_token(token: str):
    """
    Add a token to the blacklist
    """
    payload = await decode_token(token)
    if payload:
        exp = payload.get("exp")
        if exp:
            ttl = exp - int(datetime.utcnow().timestamp())
            if ttl > 0:
                await token_blacklist.add_to_blacklist(token, ttl)

def admin_required(current_user: dict = Depends(get_current_user)):
    """
    Verify that the authenticated user has admin role
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permissions required"
        )
    return current_user