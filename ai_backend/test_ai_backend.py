#!/usr/bin/env python3
"""
Test script for AI Backend
This script tests the AI backend functionality including database operations
"""

import asyncio
import asyncpg
import os
import sys
import json
from datetime import datetime
from uuid import uuid4, UUID

# Add the API directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

async def test_database_connection():
    """Test database connection"""
    try:
        print("🔗 Testing database connection...")
        
        # Database configuration (same as in .env)
        DB_CONFIG = {
            'host': 'localhost',
            'port': 5433,
            'database': 'pmt',
            'user': 'postgres',
            'password': 'newpassword'
        }
        
        # Test connection
        conn = await asyncpg.connect(**DB_CONFIG)
        
        # Test basic query
        version = await conn.fetchval("SELECT version()")
        print(f"✅ Database connected successfully!")
        print(f"   PostgreSQL version: {version[:50]}...")
        
        # Test if required tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        table_names = [table['table_name'] for table in tables]
        required_tables = ['users', 'projects', 'tasks', 'notifications', 'project_members']
        
        print(f"📋 Found {len(table_names)} tables in database:")
        for table in table_names:
            status = "✅" if table in required_tables else "ℹ️"
            print(f"   {status} {table}")
        
        missing_tables = [table for table in required_tables if table not in table_names]
        if missing_tables:
            print(f"⚠️  Missing required tables: {missing_tables}")
        else:
            print("✅ All required tables are present")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

async def test_ai_service():
    """Test AI service functionality"""
    try:
        print("\n🤖 Testing AI service...")
        
        # Import AI service components
        from services.smart_ai_service import SmartAIService
        from services.database_service import DatabaseService as DBService
        from models.ai_models import AIQueryRequest
        
        # Create database service
        db_config = {
            'host': 'localhost',
            'port': 5433,
            'database': 'pmt',
            'user': 'postgres',
            'password': 'newpassword'
        }
        
        pool = await asyncpg.create_pool(**db_config)
        db_service = DBService(pool)
        
        # Create AI service
        ai_service = SmartAIService(db_service)
        
        # Test basic conversation
        print("💬 Testing basic conversation...")
        request = AIQueryRequest(
            query="Hello, can you help me with project management?",
            conversation_id="test-conv-001"
        )
        
        mock_user = {
            'id': str(uuid4()),
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        response = await ai_service.process_query(request, mock_user)
        print(f"✅ AI Response: {response.response[:100]}...")
        
        # Test project creation intent detection
        print("\n📂 Testing project creation intent...")
        request = AIQueryRequest(
            query='I want to create a new project called "Test Project" for developing a mobile app',
            conversation_id="test-conv-002"
        )
        
        response = await ai_service.process_query(request, mock_user)
        print(f"✅ Project creation response: {response.response[:100]}...")
        
        await pool.close()
        return True
        
    except Exception as e:
        print(f"❌ AI service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_database_operations():
    """Test database operations"""
    try:
        print("\n💾 Testing database operations...")
        
        from services.database_service import DatabaseService as DBService
        
        # Create database service
        db_config = {
            'host': 'localhost',
            'port': 5433,
            'database': 'pmt',
            'user': 'postgres',
            'password': 'newpassword'
        }
        
        pool = await asyncpg.create_pool(**db_config)
        db_service = DBService(pool)
        
        # Test getting table schema
        print("📊 Testing table schema retrieval...")
        if 'projects' in await db_service.get_table_list():
            schema = await db_service.get_table_schema('projects')
            print(f"✅ Projects table schema: {len(schema['columns'])} columns")
            print(f"   Required fields: {schema['required_fields']}")
            print(f"   Optional fields: {schema['optional_fields'][:3]}...")
        
        # Test user search (if users table exists)
        if 'users' in await db_service.get_table_list():
            print("👥 Testing user search...")
            users = await db_service.search_users("test", 5)
            print(f"✅ Found {len(users)} users matching 'test'")
        
        await pool.close()
        return True
        
    except Exception as e:
        print(f"❌ Database operations test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🧪 AI Backend Test Suite")
    print("=" * 50)
    
    # Test database connection
    db_success = await test_database_connection()
    
    # Test AI service
    ai_success = await test_ai_service()
    
    # Test database operations
    db_ops_success = await test_database_operations()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"   Database Connection: {'✅ PASS' if db_success else '❌ FAIL'}")
    print(f"   AI Service: {'✅ PASS' if ai_success else '❌ FAIL'}")
    print(f"   Database Operations: {'✅ PASS' if db_ops_success else '❌ FAIL'}")
    
    overall_success = db_success and ai_success and db_ops_success
    print(f"\n🎯 Overall: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    if overall_success:
        print("\n🚀 AI Backend is ready for use!")
        print("You can now:")
        print("   • Start the AI backend server: python start_ai_backend.py")
        print("   • Send requests to: http://localhost:8000/api/ai/query")
        print("   • Use natural language like: 'create a project called MyApp'")
    else:
        print("\n🔧 Please fix the failing tests before using the AI backend.")

if __name__ == "__main__":
    asyncio.run(main())
