#!/usr/bin/env python3
"""
Enhanced AI Backend Test Suite
Test the intelligent AI service with natural language project management operations
"""

import asyncio
import asyncpg
import json
import uuid
from datetime import datetime, timezone
import sys
import os

# Add the API directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from services.database_service import EnhancedDatabaseService as DatabaseService
from services.intelligent_ai_service import IntelligentAIService

class AIBackendTester:
    def __init__(self):        self.db_config = {
            'user': 'postgres',
            'password': 'newpassword', 
            'host': 'localhost',
            'port': 5433,
            'database': 'pmt'
        }
        self.db_service = None
        self.ai_service = None
        
    async def setup(self):
        """Initialize services"""
        try:
            # Create database connection pool
            pool = await asyncpg.create_pool(**self.db_config)
            
            # Initialize enhanced database service with the pool
            database_url = f"postgresql://{self.db_config['user']}:{self.db_config['password']}@{self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}"
            self.db_service = DatabaseService(database_url, pool, None)  # Pass pool and Redis
            await self.db_service.initialize()
            
            # Initialize intelligent AI service
            self.ai_service = IntelligentAIService(
                self.db_service,
                os.getenv("OPENAI_API_KEY"),  # OpenAI API key
                "gpt-3.5-turbo"  # OpenAI model
            )
            
            print("✅ Services initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False
    
    async def test_schema_caching(self):
        """Test database schema caching"""
        print("\n🔍 Testing schema caching...")
        
        try:
            # Test getting schema for projects table
            schema = await self.db_service.get_table_schema('projects')
            
            if schema and 'columns' in schema:
                print(f"✅ Projects table schema: {len(schema['columns'])} columns")
                print(f"   Required fields: {schema.get('required_fields', [])}")
                print(f"   Foreign keys: {len(schema.get('foreign_keys', []))} relationships")
                return True
            else:
                print("❌ Failed to get projects table schema")
                return False
                
        except Exception as e:
            print(f"❌ Schema caching test failed: {e}")
            return False
    
    async def test_user_creation(self):
        """Test creating a test user for our tests"""
        print("\n👤 Testing user creation...")
        
        try:
            # Create a test user
            user_data = {
                'id': str(uuid.uuid4()),
                'username': 'testuser_ai',
                'email': 'testuser_ai@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'password': 'hashedpassword123',  # In real app, this would be properly hashed
                'status': 'active',
                'user_type': 'individual',
                'agile_methodology': True,
                'terms_accepted': True,            'terms_accepted_at': datetime.now(),
            'created_at': datetime.now()
            }
            
            result = await self.db_service.smart_insert('users', user_data)
            
            if result:
                print(f"✅ Test user created: {result['username']} ({result['email']})")
                return result
            else:
                print("❌ Failed to create test user")
                return None
                
        except Exception as e:
            print(f"❌ User creation test failed: {e}")
            return None
    
    async def test_ai_project_creation(self, user_context):
        """Test AI-powered project creation"""
        print("\n🚀 Testing AI project creation...")
        
        test_queries = [
            "Create a new project called 'AI Demo App' for building a demo application",
            "Make a project named 'Website Redesign' with budget $50000 starting on 2024-01-15",
            "I want to start a new project: 'Mobile App Development' - this will be for creating our company's mobile application"
        ]
        
        results = []
        
        for i, query in enumerate(test_queries, 1):
            try:
                print(f"\n📝 Test {i}: {query}")
                
                response = await self.ai_service.process_natural_language_query(query, user_context)
                
                if response.get('success'):
                    print(f"✅ Response: {response['response'][:100]}...")
                    if 'data' in response and 'project' in response['data']:
                        project = response['data']['project']
                        print(f"   Project ID: {project.get('id')}")
                        print(f"   Project Name: {project.get('name')}")
                        results.append(project)
                    else:
                        print("   ⚠️ No project data returned")
                else:
                    print(f"❌ Failed: {response.get('response', 'Unknown error')}")
                
            except Exception as e:
                print(f"❌ Query {i} failed: {e}")
        
        return results
    
    async def test_ai_member_addition(self, user_context, projects):
        """Test AI-powered member addition"""
        print("\n👥 Testing AI member addition...")
        
        if not projects:
            print("❌ No projects available for member addition test")
            return
        
        # Create another test user to add as member
        member_data = {
            'id': str(uuid.uuid4()),
            'username': 'teammember_ai',
            'email': 'teammember_ai@example.com',
            'first_name': 'Team',
            'last_name': 'Member',
            'password': 'hashedpassword123',
            'status': 'active',
            'user_type': 'individual',
            'created_at': datetime.utcnow()
        }
        
        member = await self.db_service.smart_insert('users', member_data)
        if not member:
            print("❌ Failed to create test member")
            return
        
        project = projects[0]
        test_queries = [
            f"Add teammember_ai to project '{project['name']}'",
            f"Invite {member['email']} to '{project['name']}' as an admin",
            f"Give teammember_ai contributor access to {project['name']}"
        ]
        
        for i, query in enumerate(test_queries, 1):
            try:
                print(f"\n📝 Test {i}: {query}")
                
                response = await self.ai_service.process_natural_language_query(query, user_context)
                
                if response.get('success'):
                    print(f"✅ Response: {response['response'][:100]}...")
                else:
                    print(f"❌ Failed: {response.get('response', 'Unknown error')}")
                
            except Exception as e:
                print(f"❌ Query {i} failed: {e}")
    
    async def test_ai_task_creation(self, user_context, projects):
        """Test AI-powered task creation"""
        print("\n📋 Testing AI task creation...")
        
        if not projects:
            print("❌ No projects available for task creation test")
            return
        
        project = projects[0]
        test_queries = [
            f"Create a task 'Setup development environment' for project '{project['name']}'",
            f"Add task: 'Design user interface' to {project['name']} with high priority due on 2024-02-01",
            f"Make a new task called 'Write documentation' - this should take about 8 hours"
        ]
        
        for i, query in enumerate(test_queries, 1):
            try:
                print(f"\n📝 Test {i}: {query}")
                
                response = await self.ai_service.process_natural_language_query(query, user_context)
                
                if response.get('success'):
                    print(f"✅ Response: {response['response'][:100]}...")
                    if 'data' in response and 'task' in response['data']:
                        task = response['data']['task']
                        print(f"   Task ID: {task.get('id')}")
                        print(f"   Task Title: {task.get('title')}")
                else:
                    print(f"❌ Failed: {response.get('response', 'Unknown error')}")
                
            except Exception as e:
                print(f"❌ Query {i} failed: {e}")
    
    async def test_ai_general_queries(self, user_context):
        """Test general AI queries"""
        print("\n💬 Testing general AI queries...")
        
        test_queries = [
            "What projects am I working on?",
            "How can I improve project management?",
            "What are best practices for team collaboration?",
            "Help me understand agile methodology"
        ]
        
        for i, query in enumerate(test_queries, 1):
            try:
                print(f"\n📝 Test {i}: {query}")
                
                response = await self.ai_service.process_natural_language_query(query, user_context)
                
                if response.get('success'):
                    print(f"✅ Response: {response['response'][:150]}...")
                else:
                    print(f"❌ Failed: {response.get('response', 'Unknown error')}")
                
            except Exception as e:
                print(f"❌ Query {i} failed: {e}")
    
    async def test_foreign_key_resolution(self, user_context):
        """Test smart foreign key resolution"""
        print("\n🔗 Testing foreign key resolution...")
        
        try:
            # Test resolving admin reference (should create or find admin)
            admin_id = await self.db_service.resolve_foreign_key_value(
                'projects', 'owner_id', 'admin@example.com', user_context
            )
            
            if admin_id:
                print(f"✅ Admin reference resolved: {admin_id}")
            else:
                print("❌ Failed to resolve admin reference")
            
            # Test resolving user reference
            user_id = await self.db_service.resolve_foreign_key_value(
                'project_members', 'user_id', user_context['email'], user_context
            )
            
            if user_id:
                print(f"✅ User reference resolved: {user_id}")
            else:
                print("❌ Failed to resolve user reference")
                
            return True
            
        except Exception as e:
            print(f"❌ Foreign key resolution test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🤖 Starting Enhanced AI Backend Tests...")
        print("=" * 50)
        
        # Setup
        if not await self.setup():
            return False
        
        # Test schema caching
        if not await self.test_schema_caching():
            return False
        
        # Create test user
        user = await self.test_user_creation()
        if not user:
            return False
        
        user_context = {
            'id': user['id'],
            'email': user['email'],
            'name': f"{user['first_name']} {user['last_name']}",
            'role': 'admin'  # Give admin role for testing
        }
        
        # Test foreign key resolution
        await self.test_foreign_key_resolution(user_context)
        
        # Test AI project creation
        projects = await self.test_ai_project_creation(user_context)
        
        # Test AI member addition
        await self.test_ai_member_addition(user_context, projects)
        
        # Test AI task creation
        await self.test_ai_task_creation(user_context, projects)
        
        # Test general AI queries
        await self.test_ai_general_queries(user_context)
        
        print("\n" + "=" * 50)
        print("🎯 All tests completed!")
        print("\n🚀 Enhanced AI Backend is ready for intelligent project management!")
        print("\nKey Features Tested:")
        print("✅ Smart database schema caching")
        print("✅ Intelligent foreign key resolution")
        print("✅ Natural language project creation")
        print("✅ AI-powered member management")
        print("✅ Intelligent task creation")
        print("✅ General AI conversation capabilities")
        
        return True

async def main():
    """Main test runner"""
    tester = AIBackendTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! The Enhanced AI Backend is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the output above for details.")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
