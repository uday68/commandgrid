@echo off
echo 🚀 Starting Project Management Tool Demo Setup...

REM Check if we're in the right directory
if not exist "ai_backend" (
    echo [ERROR] Please run this script from the project root directory
    echo Expected directories: ai_backend, pmt, backend
    pause
    exit /b 1
)

if not exist "pmt" (
    echo [ERROR] pmt directory not found
    pause
    exit /b 1
)

if not exist "backend" (
    echo [ERROR] backend directory not found
    pause
    exit /b 1
)

echo [INFO] Setting up Data Visualization Demo...

REM 1. Check sample datasets
echo [INFO] Checking sample datasets...
if exist "sample_datasets" (
    echo [INFO] Sample datasets found ✓
    dir sample_datasets
) else (
    echo [WARNING] Creating sample datasets directory...
    mkdir sample_datasets
)

REM 2. Copy datasets to public folder for frontend access
echo [INFO] Setting up frontend assets...
if not exist "pmt\public\sample_datasets" mkdir "pmt\public\sample_datasets"

if exist "sample_datasets\project_data.csv" (
    copy "sample_datasets\*.csv" "pmt\public\sample_datasets\" >nul 2>&1
    echo [INFO] Sample datasets copied to public folder ✓
) else (
    echo [WARNING] Sample datasets not found in sample_datasets/
)

REM 3. Check AI backend dependencies
echo [INFO] Setting up AI backend...
cd ai_backend

echo [INFO] Installing AI backend dependencies...
pip install fastapi uvicorn redis asyncpg aiohttp python-multipart python-jose[cryptography] passlib[bcrypt] python-dotenv pandas matplotlib reportlab

cd ..

REM 4. Setup frontend
echo [INFO] Setting up frontend...
cd pmt

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
) else (
    echo [INFO] Frontend dependencies already installed ✓
)

cd ..

REM 5. Setup backend
echo [INFO] Setting up backend...
cd backend

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
) else (
    echo [INFO] Backend dependencies already installed ✓
)

cd ..

echo.
echo [INFO] Demo setup complete! 🎉
echo.
echo 📋 To start the demo:
echo 1. Terminal 1: cd ai_backend ^&^& python start_ai_backend.py
echo 2. Terminal 2: cd backend ^&^& npm run dev
echo 3. Terminal 3: cd pmt ^&^& npm start
echo.
echo 🌐 Access points:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo - AI Backend: http://localhost:8000
echo.
echo 📊 Demo features:
echo - Sample datasets in /sample_datasets/
echo - Enhanced data visualization with AI
echo - Interactive chat assistant  
echo - Real-time analytics dashboard
echo.
echo [INFO] Happy coding! 🚀
pause
