# AI Backend Implementation Guide

## Overview

The AI backend has been redesigned to intelligently interact with the database and assist users with project management tasks through natural language processing. When a user says "create project", the AI will automatically:

1. **Detect the intent** (project creation)
2. **Fetch required database schema** (what fields are needed)
3. **Extract information** from the user's message
4. **Ask for missing information** in a conversational way
5. **Execute the database operation** once all data is collected
6. **Provide confirmation** and next steps

## Architecture

### Core Components

#### 1. SmartAIService (`services/smart_ai_service.py`)
- **Main AI processing engine**
- Handles intent detection and conversation flow
- Manages data collection for database operations
- Integrates with OpenRouter AI API

#### 2. DatabaseService (`services/database_service.py`)
- **Database operations handler**
- Dynamic schema introspection
- CRUD operations for all entities
- Automatic relationship management

#### 3. AI Models (`models/ai_models.py`)
- **Request/Response models**
- Conversation context models
- Data validation models

### Key Features

#### Intent Detection
The AI can detect when users want to:
- ✅ Create projects
- ✅ Add project members
- ✅ Create tasks
- ✅ List projects/tasks
- ✅ Upload files
- ✅ General project management questions

#### Intelligent Data Collection
When creating a project, the AI:
1. **Extracts** any information from the initial request
2. **Identifies** missing required fields
3. **Asks** for missing information one field at a time
4. **Validates** user responses
5. **Executes** the operation when complete

#### Database Integration
- **Dynamic schema reading** - AI knows what fields each table needs
- **Automatic relationship handling** - Creates related records (project members, notifications)
- **Data validation** - Ensures data integrity before insertion
- **Error handling** - Graceful error messages for users

## Usage Examples

### Creating a Project

**User:** "I want to create a new project"

**AI:** "I'd be happy to help you create a new project! What would you like to name this project?"

**User:** "Mobile Shopping App"

**AI:** "Great! Could you provide a description for this project?"

**User:** "A mobile app for online shopping with payment integration"

**AI:** "✅ Project created successfully!

**Project Details:**
- Name: Mobile Shopping App
- Description: A mobile app for online shopping with payment integration
- Priority: Medium
- Project ID: 123e4567-e89b-12d3-a456-426614174000

Your project is now ready! You can start adding team members and creating tasks."

### Adding Team Members

**User:** "Add john@example.com to the Mobile Shopping App project"

**AI:** "I'll add john@example.com to your Mobile Shopping App project. What role should they have? (member, manager, owner, viewer)"

**User:** "developer"

**AI:** "✅ John has been successfully added to the Mobile Shopping App project as a developer. They will receive a notification about being added to the project."

### Creating Tasks

**User:** "Create a task for designing the user interface"

**AI:** "I'll help you create a task. Which project is this task for?"

**User:** "Mobile Shopping App"

**AI:** "Perfect! I'll create the task "Design user interface" for the Mobile Shopping App project. Who should I assign this task to? (you can provide an email or say 'me' for yourself)"

**User:** "me"

**AI:** "✅ Task created successfully!

**Task Details:**
- Title: Design user interface
- Project: Mobile Shopping App
- Assigned to: You
- Priority: Medium
- Status: To Do

The task is now ready and you'll receive a notification."

## Database Tables Supported

### Core Tables
- **users** - User management
- **projects** - Project information
- **project_members** - Project team membership
- **tasks** - Task management
- **notifications** - User notifications
- **files** - File attachments

### AI Tables
- **ai_assistant_sessions** - Conversation history
- **ai_feedback** - User feedback on AI responses
- **ai_interactions** - Individual AI interactions

## API Endpoints

### Main AI Endpoint
```
POST /api/ai/query
Content-Type: application/json

{
  "query": "create a project called MyApp",
  "conversation_id": "optional-conversation-id",
  "context": {}
}
```

### Response Format
```json
{
  "response": "AI response text",
  "confidence": 0.9,
  "processing_time": 1.23,
  "metadata": {
    "conversation_id": "conv_123",
    "operation_intent": "create_project",
    "user_id": "user_123"
  }
}
```

## Configuration

### Environment Variables (.env)
```env
# Database
DB_USER=postgres
DB_PASSWORD=newpassword
DB_HOST=localhost
DB_PORT=5433
DB_NAME=pmt

# Redis
REDIS_URL=redis://localhost:6379

# AI
OPENROUTER_API_KEY=your-api-key-here
DEBUG=true

# JWT (must match main backend)
JWT_SECRET=s3cUr3JwT$eCr3tK3y!2025
```

## Installation & Setup

### 1. Install Dependencies
```bash
cd ai_backend/api
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Test the Setup
```bash
cd ai_backend
python test_ai_backend.py
```

### 4. Start the AI Backend
```bash
cd ai_backend
python start_ai_backend.py
```

The AI backend will start on `http://localhost:8000`

## Integration with Main Backend

The AI backend is designed to work alongside your main backend:

### Authentication
- Uses JWT tokens from the main backend
- Validates tokens using the same secret
- No separate user authentication

### Database
- Connects to the same PostgreSQL database
- Reads existing schema and data
- Creates new records through proper validation

### CORS
- Configured to accept requests from frontend
- Supports credentials for authenticated requests

## Conversation Flow Examples

### Multi-step Project Creation
1. **User:** "create project"
2. **AI:** "What would you like to name this project?"
3. **User:** "E-commerce Website"
4. **AI:** "Could you provide a description for this project?"
5. **User:** "Online store for selling electronics"
6. **AI:** "What's the budget for this project? (optional - you can say 'skip')"
7. **User:** "$50000"
8. **AI:** "✅ Project created successfully! [details...]"

### Smart Information Extraction
**User:** "Create project called 'Mobile App' for building an iOS app with budget $25000"

**AI:** "✅ Project created successfully!
- Name: Mobile App
- Description: Building an iOS app
- Budget: $25,000
[Project ready for team members and tasks]"

## Error Handling

The AI backend handles errors gracefully:

### Database Errors
- Connection issues → "I'm having trouble connecting to the database"
- Missing data → "I need more information to complete this request"
- Validation errors → "The [field] format is invalid, please try again"

### AI Service Errors
- API timeouts → "I'm having trouble processing your request, please try again"
- Invalid API key → "AI service is temporarily unavailable"
- Rate limits → "Too many requests, please wait a moment"

## Testing

Run the test suite to verify everything works:

```bash
cd ai_backend
python test_ai_backend.py
```

The test will verify:
- ✅ Database connection
- ✅ AI service functionality  
- ✅ Intent detection
- ✅ Database operations
- ✅ Schema introspection

## Troubleshooting

### Common Issues

1. **"Import errors"**
   - Run `pip install -r requirements.txt`
   - Check Python path includes the api directory

2. **"Database connection failed"**
   - Verify PostgreSQL is running on port 5433
   - Check credentials in .env file
   - Ensure database 'pmt' exists

3. **"AI service unavailable"**
   - Check OPENROUTER_API_KEY in .env
   - Verify internet connection
   - Check API key validity

4. **"Authentication failed"**
   - Ensure JWT_SECRET matches main backend
   - Check token is being sent in requests
   - Verify user exists in database

## Next Steps

With this setup, users can now:

1. **Chat naturally** with the AI assistant
2. **Create projects** through conversation
3. **Add team members** by email
4. **Create and assign tasks**
5. **Upload files** to projects
6. **Get project insights** and recommendations

The AI backend will continue to learn and improve based on user interactions and feedback.
