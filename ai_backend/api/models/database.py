import asyncpg
import redis.asyncio as redis
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration settings"""
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "newpassword")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 5433))
    DB_NAME: str = os.getenv("DB_NAME", "pmt")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    @property
    def DATABASE_URL(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

config = DatabaseConfig()

async def get_db_pool():
    """Create and return a PostgreSQL connection pool"""
    try:
        pool = await asyncpg.create_pool(
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            host=config.DB_HOST,
            port=config.DB_PORT,
            database=config.DB_NAME,
            min_size=5,
            max_size=20,
            command_timeout=30
        )
        logger.info("Database connection pool established successfully")
        return pool
    except Exception as e:
        logger.error(f"Failed to create database connection pool: {e}")
        raise

async def get_redis_connection():
    """Create and return a Redis connection"""
    try:
        redis_client = await redis.from_url(config.REDIS_URL)
        logger.info("Redis connection established successfully")
        return redis_client
    except Exception as e:
        logger.error(f"Failed to create Redis connection: {e}")
        raise

class DatabaseService:
    """Enhanced database service for AI backend"""
    
    def __init__(self):
        self.pool = None
        self.redis = None
    
    async def connect(self):
        """Initialize database connections"""
        try:
            self.pool = await get_db_pool()
            self.redis = await get_redis_connection()
            logger.info("Database service connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect database service: {e}")
            raise
    
    async def disconnect(self):
        """Close database connections"""
        try:
            if self.pool:
                await self.pool.close()
            if self.redis:
                await self.redis.close()
            logger.info("Database service disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting database service: {e}")
    
    async def get_user_by_id(self, user_id: str) -> dict:
        """Get user by ID from users table"""
        try:
            async with self.pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT * FROM users WHERE user_id = $1",
                    user_id
                )
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> dict:
        """Get user by email from users table"""
        try:
            async with self.pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT * FROM users WHERE email = $1",
                    email
                )
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def get_table_schema(self, table_name: str) -> dict:
        """Get table schema information"""
        try:
            async with self.pool.acquire() as conn:
                # Get column information
                columns = await conn.fetch("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                    ORDER BY ordinal_position
                """, table_name)
                
                # Get primary key information
                pk_result = await conn.fetch("""
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = $1 
                        AND tc.constraint_type = 'PRIMARY KEY'
                        AND tc.table_schema = 'public'
                """, table_name)
                
                # Get foreign key information
                fk_result = await conn.fetch("""
                    SELECT 
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu 
                        ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.table_name = $1 
                        AND tc.constraint_type = 'FOREIGN KEY'
                        AND tc.table_schema = 'public'
                """, table_name)
                
                return {
                    'columns': [dict(col) for col in columns],
                    'primary_keys': [pk['column_name'] for pk in pk_result],
                    'foreign_keys': [dict(fk) for fk in fk_result]
                }
        except Exception as e:
            logger.error(f"Error getting schema for table {table_name}: {e}")
            return None
    
    async def search_users(self, search_term: str, limit: int = 10) -> list:
        """Search users by name or email"""
        try:
            async with self.pool.acquire() as conn:
                users = await conn.fetch("""
                    SELECT user_id, name, email, role 
                    FROM users 
                    WHERE name ILIKE $1 OR email ILIKE $1
                    LIMIT $2
                """, f"%{search_term}%", limit)
                return [dict(user) for user in users]
        except Exception as e:
            logger.error(f"Error searching users with term '{search_term}': {e}")
            return []
    
    async def create_project(self, project_data: dict, created_by: str) -> dict:
        """Create a new project"""
        try:
            async with self.pool.acquire() as conn:
                # First check if the user exists in users table
                user = await conn.fetchrow(
                    "SELECT user_id FROM users WHERE user_id = $1",
                    created_by
                )
                if not user:
                    raise ValueError(f"User {created_by} not found in users table")
                
                # Insert the project
                project = await conn.fetchrow("""
                    INSERT INTO projects (
                        name, description, owner_id, budget, status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                    RETURNING *
                """, 
                    project_data['name'],
                    project_data.get('description'),
                    created_by,
                    project_data.get('budget'),
                    project_data.get('status', 'planning')
                )
                
                return dict(project) if project else None
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise
    
    async def add_project_member(self, project_id: str, user_id: str, role: str = 'member') -> dict:
        """Add a member to a project"""
        try:
            async with self.pool.acquire() as conn:
                # Check if project_members table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'project_members'
                    )
                """)
                
                if table_exists:
                    member = await conn.fetchrow("""
                        INSERT INTO project_members (project_id, user_id, role, joined_at)
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (project_id, user_id) 
                        DO UPDATE SET role = $3, joined_at = NOW()
                        RETURNING *
                    """, project_id, user_id, role)
                    return dict(member) if member else None
                else:
                    logger.warning("project_members table does not exist")
                    return None
        except Exception as e:
            logger.error(f"Error adding project member: {e}")
            raise
    
    async def create_task(self, task_data: dict, created_by: str) -> dict:
        """Create a new task"""
        try:
            async with self.pool.acquire() as conn:
                task = await conn.fetchrow("""
                    INSERT INTO tasks (
                        title, description, project_id, creator_id, assignee_id,
                        priority, status, due_date, estimated_hours, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    RETURNING *
                """,
                    task_data['title'],
                    task_data.get('description'),
                    task_data['project_id'],
                    created_by,
                    task_data.get('assignee_id'),
                    task_data.get('priority', 'medium'),
                    task_data.get('status', 'todo'),
                    task_data.get('due_date'),
                    task_data.get('estimated_hours')
                )
                return dict(task) if task else None
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            raise
    
    async def create_notification(self, user_id: str, notification_data: dict) -> dict:
        """Create a notification for user"""
        try:
            async with self.pool.acquire() as conn:
                notification = await conn.fetchrow("""
                    INSERT INTO notifications (
                        user_id, type, message, is_read, created_at
                    ) VALUES ($1, $2, $3, $4, NOW())
                    RETURNING *
                """,
                    user_id,
                    notification_data['type'],
                    notification_data['message'],
                    notification_data.get('is_read', False)
                )
                return dict(notification) if notification else None
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise