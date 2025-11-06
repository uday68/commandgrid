#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from main import Settings
from services.database_service import EnhancedDatabaseService

async def test_db_connection():
    """Test database connection and schema caching"""
    print("🔗 Testing database connection...")
    
    try:
        settings = Settings()
        print(f"Database URL: {settings.DATABASE_URL}")
        
        # Create database service
        db_service = EnhancedDatabaseService(database_url=settings.DATABASE_URL)
        
        # Connect and cache schemas
        await db_service.connect()
        
        print(f"✅ Database connected successfully!")
        print(f"✅ Schema cache has {len(db_service._schema_cache)} tables")
        
        # Check specific tables
        for table_name in ['users', 'projects', 'tasks']:
            if table_name in db_service._schema_cache:
                schema = db_service._schema_cache[table_name]
                print(f"✅ {table_name} table: {len(schema.columns)} columns")
                print(f"   Primary keys: {schema.primary_keys}")
            else:
                print(f"❌ {table_name} table not found in schema cache")
        
        # Test a simple query
        async with db_service.pool.acquire() as conn:
            result = await conn.fetch("SELECT COUNT(*) as count FROM users LIMIT 1")
            print(f"✅ Users table query successful: {result[0]['count']} users")
        
        await db_service.close()
        print("✅ All database tests passed!")
        
    except Exception as e:
        print(f"❌ Database test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_db_connection())
