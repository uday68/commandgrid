import os
import sys
import subprocess
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    required_version = (3, 8)
    current_version = sys.version_info[:2]
    
    if current_version < required_version:
        logger.error(f"Python {required_version[0]}.{required_version[1]} or higher is required")
        return False
    
    logger.info(f"Python version {current_version[0]}.{current_version[1]} is compatible")
    return True

def install_dependencies():
    """Install required Python packages"""
    try:
        requirements = [
            "fastapi==0.68.1",
            "uvicorn==0.15.0",
            "python-multipart==0.0.5",
            "python-jose[cryptography]==3.3.0",
            "passlib[bcrypt]==1.7.4",
            "redis==4.5.1",  # Updated from aioredis
            "asyncpg==0.24.0",
            "httpx==0.23.0",
            "openai==0.27.0",
            "pydantic==1.8.2",
            "python-dotenv==0.19.0",
            "pytest==6.2.5",
            "pytest-asyncio==0.15.1"
        ]
        
        for package in requirements:
            logger.info(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        
        logger.info("All dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install dependencies: {str(e)}")
        return False

def create_env_file():
    """Create .env file with required environment variables"""
    env_vars = {
        "OPENROUTER_API_KEY": "your_api_key_here",
        "REDIS_URL": "redis://localhost:6379",
        "DATABASE_URL": "postgresql://postgres:newpassword@localhost:5433/pmt",
        "SECRET_KEY": "your_secret_key_here",
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30"
    }
    
    try:
        with open(".env", "w") as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        
        logger.info(".env file created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create .env file: {str(e)}")
        return False

def create_directories():
    """Create required directories"""
    directories = [
        "uploads",
        "static",
        "logs",
        "tests"
    ]
    
    try:
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
        logger.info("Required directories created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create directories: {str(e)}")
        return False

def setup_logging():
    """Set up logging configuration"""
    try:
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(log_dir, "app.log")),
                logging.StreamHandler()
            ]
        )
        
        logger.info("Logging configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure logging: {str(e)}")
        return False

def main():
    """Main setup function"""
    logger.info("Starting AI Backend setup...")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Create .env file
    if not create_env_file():
        sys.exit(1)
    
    # Create directories
    if not create_directories():
        sys.exit(1)
    
    # Setup logging
    if not setup_logging():
        sys.exit(1)
    
    logger.info("AI Backend setup completed successfully!")
    logger.info("\nNext steps:")
    logger.info("1. Update the .env file with your actual API keys and configuration")
    logger.info("2. Run 'python verify_system.py' to verify the setup")
    logger.info("3. Run 'python run.py' to start the server")

if __name__ == "__main__":
    main()