#!/bin/bash

echo "🚀 Starting Project Management Tool Demo Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "ai_backend" ] || [ ! -d "pmt" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory (d:\project_management_tool)"
    exit 1
fi

print_status "Setting up Data Visualization Demo..."

# 1. Check sample datasets
print_status "Checking sample datasets..."
if [ -d "sample_datasets" ]; then
    print_status "Sample datasets found ✓"
    ls -la sample_datasets/
else
    print_warning "Creating sample datasets directory..."
    mkdir -p sample_datasets
fi

# 2. Copy datasets to public folder for frontend access
print_status "Setting up frontend assets..."
mkdir -p pmt/public/sample_datasets
if [ -f "sample_datasets/project_data.csv" ]; then
    cp sample_datasets/*.csv pmt/public/sample_datasets/ 2>/dev/null || true
    print_status "Sample datasets copied to public folder ✓"
else
    print_warning "Sample datasets not found in sample_datasets/"
fi

# 3. Check AI backend dependencies
print_status "Checking AI backend..."
cd ai_backend

if [ -f "requirements.txt" ]; then
    print_status "Installing AI backend dependencies..."
    pip install -r requirements.txt
else
    print_status "Installing core AI backend dependencies..."
    pip install fastapi uvicorn redis asyncpg aiohttp python-multipart python-jose[cryptography] passlib[bcrypt] python-dotenv
fi

# 4. Check if Redis is available
print_status "Checking Redis availability..."
redis-cli ping 2>/dev/null && print_status "Redis is running ✓" || print_warning "Redis not available - some features may be limited"

# 5. Check database connection
print_status "Checking database connection..."
python -c "
import asyncpg
import asyncio
import os

async def check_db():
    try:
        conn = await asyncpg.connect(
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'newpassword'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', 5433),
            database=os.getenv('DB_NAME', 'pmt')
        )
        await conn.close()
        print('Database connection: OK')
    except Exception as e:
        print(f'Database connection failed: {e}')

asyncio.run(check_db())
"

cd ..

# 6. Setup frontend
print_status "Setting up frontend..."
cd pmt

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
else
    print_status "Frontend dependencies already installed ✓"
fi

cd ..

# 7. Setup backend
print_status "Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
else
    print_status "Backend dependencies already installed ✓"
fi

cd ..

print_status "Demo setup complete! 🎉"
echo ""
echo "📋 To start the demo:"
echo "1. Terminal 1: cd ai_backend && python start_ai_backend.py"
echo "2. Terminal 2: cd backend && npm run dev"
echo "3. Terminal 3: cd pmt && npm start"
echo ""
echo "🌐 Access points:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- AI Backend: http://localhost:8000"
echo ""
echo "📊 Demo features:"
echo "- Sample datasets in /sample_datasets/"
echo "- Enhanced data visualization with AI"
echo "- Interactive chat assistant"
echo "- Real-time analytics dashboard"
echo ""
print_status "Happy coding! 🚀"
