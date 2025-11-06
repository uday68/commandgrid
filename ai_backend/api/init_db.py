import asyncio
import asyncpg
import logging
from models.config import settings

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def initialize_database():
    """Initialize the database with required tables"""
    logger.info("Creating database tables...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(
            user=settings.db_user,
            password=settings.db_password,
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name
        )
        
        # Create tables
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                avatar_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                CONSTRAINT valid_role CHECK (role IN ('admin', 'project_manager', 'developer', 'member', 'guest'))
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                owner_id UUID NOT NULL REFERENCES users(id),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                budget FLOAT,
                status VARCHAR(20) DEFAULT 'planning',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT valid_status CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived'))
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS project_members (
                project_id UUID NOT NULL REFERENCES projects(id),
                user_id UUID NOT NULL REFERENCES users(id),
                role VARCHAR(20) NOT NULL,
                joined_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (project_id, user_id),
                CONSTRAINT valid_member_role CHECK (role IN ('admin', 'project_manager', 'developer', 'member', 'guest'))
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                project_id UUID NOT NULL REFERENCES projects(id),
                created_by UUID NOT NULL REFERENCES users(id),
                assignee_id UUID REFERENCES users(id),
                due_date TIMESTAMP,
                priority VARCHAR(10) DEFAULT 'medium',
                status VARCHAR(15) DEFAULT 'todo',
                estimated_hours FLOAT,
                actual_hours FLOAT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
                CONSTRAINT valid_status CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'archived'))
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                content_type VARCHAR(100) NOT NULL,
                size INTEGER NOT NULL,
                url VARCHAR(255) NOT NULL,
                uploader_id UUID NOT NULL REFERENCES users(id),
                project_id UUID REFERENCES projects(id),
                task_id UUID REFERENCES tasks(id),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                author_id UUID NOT NULL REFERENCES users(id),
                task_id UUID REFERENCES tasks(id),
                project_id UUID REFERENCES projects(id),
                parent_id UUID REFERENCES comments(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                type VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                related_entity_type VARCHAR(20),
                related_entity_id UUID,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT valid_notification_type CHECK (type IN ('task_assigned', 'task_updated', 'project_updated', 'mention', 'system'))
            )
        """)
        
        # Create indexes
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
            CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
            CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
        """)
        
        # Create admin user if it doesn't exist
        admin_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@example.com')"
        )
        
        if not admin_exists:
            # In a real app, you'd use a proper password hashing function
            await conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role)
                VALUES ($1, $2, $3, $4)
                """,
                "Admin User", "admin@example.com", 
                "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "password"
                "admin"
            )
            logger.info("Created default admin user (admin@example.com / password)")
        
        await conn.close()
        logger.info("Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(initialize_database())