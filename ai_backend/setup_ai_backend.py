#!/usr/bin/env python3
"""
Setup script for AI Backend
This script helps set up the AI backend for the first time
"""

import os
import sys
import subprocess
import asyncio

def install_dependencies():
    """Install Python dependencies for AI backend"""
    print("📦 Installing AI Backend dependencies...")
    
    ai_backend_path = os.path.join(os.path.dirname(__file__), "ai_backend", "api")
    requirements_file = os.path.join(ai_backend_path, "requirements.txt")
    
    if not os.path.exists(requirements_file):
        print("❌ requirements.txt not found in ai_backend/api/")
        return False
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_environment():
    """Check if environment is properly configured"""
    print("🔍 Checking environment configuration...")
    
    env_file = os.path.join(os.path.dirname(__file__), "ai_backend", "api", ".env")
    
    if not os.path.exists(env_file):
        print("⚠️  .env file not found, creating from template...")
        create_env_file(env_file)
    
    # Check required environment variables
    required_vars = [
        "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME",
        "REDIS_URL", "JWT_SECRET", "OPENROUTER_API_KEY"
    ]
    
    missing_vars = []
    with open(env_file, 'r') as f:
        content = f.read()
        for var in required_vars:
            if f"{var}=" not in content or f"{var}=" in content and not content.split(f"{var}=")[1].split('\n')[0].strip():
                missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing or empty environment variables: {missing_vars}")
        print("Please edit the .env file and add the missing values")
        return False
    
    print("✅ Environment configuration looks good")
    return True

def create_env_file(env_path):
    """Create .env file from template"""
    env_template = """# AI Backend Configuration

# Database Configuration
DB_USER=postgres
DB_PASSWORD=newpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=pmt

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration (must match main backend)
JWT_SECRET=s3cUr3JwT$eCr3tK3y!2025

# AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key-here
DEBUG=true

# Note: You need to:
# 1. Set up PostgreSQL database 'pmt' on port 5433
# 2. Set up Redis on default port 6379
# 3. Get an OpenRouter API key from https://openrouter.ai
"""
    
    with open(env_path, 'w') as f:
        f.write(env_template)
    
    print(f"✅ Created .env file at {env_path}")
    print("Please edit this file with your actual configuration values")

async def test_setup():
    """Test the AI backend setup"""
    print("🧪 Testing AI backend setup...")
    
    try:
        # Add the ai_backend/api directory to Python path
        ai_api_path = os.path.join(os.path.dirname(__file__), "ai_backend", "api")
        if ai_api_path not in sys.path:
            sys.path.insert(0, ai_api_path)
        
        # Test database connection
        print("  🔗 Testing database connection...")
        import asyncpg
        from dotenv import load_dotenv
        
        # Load environment variables
        env_file = os.path.join(ai_api_path, ".env")
        load_dotenv(env_file)
        
        # Test database connection
        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5433)),
            database=os.getenv("DB_NAME", "pmt"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "newpassword")
        )
        
        version = await conn.fetchval("SELECT version()")
        await conn.close()
        print(f"  ✅ Database connection successful")
        
        # Test Redis connection (optional)
        print("  📡 Testing Redis connection...")
        try:
            import redis.asyncio as redis
            redis_client = await redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
            await redis_client.ping()
            await redis_client.close()
            print("  ✅ Redis connection successful")
        except Exception as e:
            print(f"  ⚠️  Redis connection failed: {e} (optional, AI backend will work without it)")
        
        # Test AI models import
        print("  🤖 Testing AI components...")
        try:
            from models.ai_models import AIQueryRequest, AIQueryResponse
            print("  ✅ AI models imported successfully")
        except Exception as e:
            print(f"  ❌ AI models import failed: {e}")
            return False
        
        print("✅ Setup test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Setup test failed: {e}")
        print("\nPlease check:")
        print("1. PostgreSQL is running on the configured port")
        print("2. Database 'pmt' exists")
        print("3. Credentials in .env are correct")
        print("4. All dependencies are installed")
        return False

def main():
    """Main setup function"""
    print("🚀 AI Backend Setup")
    print("=" * 50)
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Setup failed at dependency installation")
        return
    
    # Check environment
    if not check_environment():
        print("❌ Setup failed at environment check")
        print("Please configure the .env file and run setup again")
        return
    
    # Test setup
    try:
        success = asyncio.run(test_setup())
        if not success:
            print("❌ Setup test failed")
            return
    except Exception as e:
        print(f"❌ Setup test error: {e}")
        return
    
    print("\n" + "=" * 50)
    print("🎉 AI Backend setup completed successfully!")
    print("\nNext steps:")
    print("1. Start the AI backend:")
    print("   python run.py ai")
    print("\n2. Test the AI backend:")
    print("   python ai_backend/test_ai_backend.py")
    print("\n3. Use the AI backend:")
    print("   Send POST requests to http://localhost:8000/api/ai/query")
    print("   Example: {'query': 'create a project called MyApp'}")

if __name__ == "__main__":
    main()
