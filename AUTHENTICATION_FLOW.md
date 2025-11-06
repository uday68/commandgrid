# Authentication Flow Documentation

## Overview
The project management tool now uses a unified authentication system where the main backend (port 5000) handles all authentication, and the AI backend (port 8000) validates tokens issued by the main backend.

## Architecture

### Main Backend (Node.js - Port 5000)
- **Location**: `backend/src/Routes/auth/`
- **Responsibilities**:
  - User registration and login
  - Password hashing and verification (bcrypt)
  - JWT token generation and validation
  - Database connection and user management
  - Admin and user role management

### AI Backend (Python FastAPI - Port 8000)
- **Location**: `ai_backend/api/main.py`
- **Responsibilities**:
  - Validates JWT tokens from main backend
  - Provides AI-powered project management features
  - No longer handles authentication directly

## Authentication Flow

1. **User Login**: User submits credentials to frontend
2. **Frontend → Main Backend**: Login request sent to `http://localhost:5000/api/auth/login`
3. **Main Backend**: 
   - Validates credentials against database
   - Returns JWT tokens (`authToken` and `refreshToken`)
   - Returns user data
4. **Frontend Storage**: Stores tokens in localStorage
5. **AI Backend Requests**: Frontend uses main backend's `authToken` for AI backend API calls
6. **AI Backend Validation**: AI backend validates the JWT token using the same secret as main backend

## Key Changes Made

### Frontend (`pmt/src/pages/Login.jsx`)
- ✅ Removed separate AI backend authentication
- ✅ Removed axios dependency from login (using apiService instead)
- ✅ Now relies only on main backend authentication

### AI Backend (`ai_backend/api/main.py`)
- ✅ Removed login endpoints
- ✅ Removed mock user system
- ✅ Removed separate token generation
- ✅ Updated `get_current_user` to validate main backend tokens
- ✅ Updated WebSocket authentication

### API Service (`pmt/src/utils/api.js`)
- ✅ Already configured correctly to use main backend tokens for AI backend calls
- ✅ Falls back to main auth token when AI-specific token not available

## Environment Variables

Both backends should use the same JWT configuration:

### Main Backend (.env)
```env
JWT_SECRET=s3cUr3JwT$eCr3tK3y!2025
JWT_REFRESH_SECRET=your_jwt_refresh_secret
DB_USER=postgres
DB_PASSWORD=newpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=pmt
```

### AI Backend (.env)
```env
JWT_SECRET=s3cUr3JwT$eCr3tK3y!2025
JWT_ALGORITHM=HS256
DB_USER=postgres
DB_PASSWORD=newpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=pmt
```

## Testing the Fix

1. Start main backend: `cd backend && npm start`
2. Start AI backend: `cd ai_backend && python start_ai_backend.py`
3. Start frontend: `cd pmt && npm run dev`
4. Login with valid credentials - should no longer see 401 errors from AI backend

## Benefits

- **Unified Authentication**: Single source of truth for user authentication
- **Reduced Complexity**: No need to maintain separate authentication systems
- **Better Security**: Centralized token management and validation
- **Improved Performance**: No redundant authentication requests
