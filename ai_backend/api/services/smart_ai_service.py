import time
import json
import re
import aiohttp
import os
import logging
import pathlib
import sys
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID
from datetime import datetime, date, timezone
from fastapi import HTTPException, status

# Import the AI models
import sys
import pathlib
sys.path.append(str(pathlib.Path(__file__).parent.parent))
from models.ai_models import AIQueryRequest, AIQueryResponse

logger = logging.getLogger(__name__)

class SmartAIService:
    """Enhanced AI Service that can interact with database and collect user information intelligently"""
    
    def __init__(self, db_service, redis_client=None):
        self.db = db_service
        self.redis = redis_client
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_endpoint = "https://api.openai.com/v1/chat/completions"
        self.default_model = "gpt-3.5-turbo"
        
        # Conversation context storage
        self.conversation_contexts = {}
        
        # Database operation templates
        self.operation_templates = {
            'create_project': {
                'required_fields': ['name', 'description'],
                'optional_fields': ['budget', 'start_date', 'end_date', 'priority'],
                'validation_rules': {
                    'name': {'min_length': 3, 'max_length': 255},
                    'budget': {'type': 'number', 'min': 0},
                    'priority': {'choices': ['low', 'medium', 'high', 'critical']}
                }
            },
            'add_project_member': {
                'required_fields': ['project_id', 'user_email_or_id'],
                'optional_fields': ['role'],
                'validation_rules': {
                    'role': {'choices': ['member', 'manager', 'owner', 'viewer']}
                }
            },
            'create_task': {
                'required_fields': ['title', 'project_id'],
                'optional_fields': ['description', 'assignee_id', 'due_date', 'priority', 'estimated_hours'],
                'validation_rules': {
                    'title': {'min_length': 3, 'max_length': 255},
                    'priority': {'choices': ['low', 'medium', 'high', 'critical']},
                    'estimated_hours': {'type': 'number', 'min': 0}
                }
            }
        }

    async def process_query(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        """Main query processing method"""
        start_time = time.time()
        user_id = str(user.get('id', user.get('user_id')))
        conversation_id = request.conversation_id or f"conv_{user_id}_{int(time.time())}"
        
        try:
            # Initialize conversation context if not exists
            if conversation_id not in self.conversation_contexts:
                self.conversation_contexts[conversation_id] = {
                    'user_id': user_id,
                    'messages': [],
                    'pending_operation': None,
                    'collected_data': {},
                    'created_at': datetime.now(timezone.utc)
                }
            
            context = self.conversation_contexts[conversation_id]
            context['messages'].append({
                'role': 'user',
                'content': request.query,
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            # Detect if this is a database operation request
            operation_intent = await self._detect_operation_intent(request.query)
            
            if operation_intent:
                response_text = await self._handle_database_operation(
                    operation_intent, request.query, context, user
                )
            else:
                # Regular AI conversation
                response_text = await self._handle_general_conversation(
                    request.query, context, user
                )            # Store AI response in context
            context['messages'].append({
                'role': 'assistant',
                'content': response_text,
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            processing_time = time.time() - start_time
            
            return AIQueryResponse(
                response=response_text,
                confidence=0.9,
                processing_time=processing_time,
                model=self.default_model,
                conversation_id=conversation_id,
                metadata={
                    'conversation_id': conversation_id,
                    'operation_intent': operation_intent,
                    'user_id': user_id
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process AI request: {str(e)}"
            )

    async def _detect_operation_intent(self, query: str) -> Optional[str]:
        """Detect if the user wants to perform a database operation"""
        query_lower = query.lower()
        
        # Project operations
        if any(phrase in query_lower for phrase in ['create project', 'new project', 'start project', 'make project']):
            return 'create_project'
        elif any(phrase in query_lower for phrase in ['add member', 'invite member', 'add user to project']):
            return 'add_project_member'
        elif any(phrase in query_lower for phrase in ['create task', 'new task', 'add task']):
            return 'create_task'
        elif any(phrase in query_lower for phrase in ['show projects', 'list projects', 'my projects']):
            return 'list_projects'
        elif any(phrase in query_lower for phrase in ['show tasks', 'list tasks', 'my tasks']):
            return 'list_tasks'
        elif any(phrase in query_lower for phrase in ['upload file', 'attach file', 'add file']):
            return 'upload_file'
        
        return None

    async def _handle_database_operation(self, operation: str, query: str, context: Dict, user: Dict) -> str:
        """Handle database operations with intelligent data collection"""
        
        if operation == 'create_project':
            return await self._handle_create_project(query, context, user)
        elif operation == 'add_project_member':
            return await self._handle_add_project_member(query, context, user)
        elif operation == 'create_task':
            return await self._handle_create_task(query, context, user)
        elif operation == 'list_projects':
            return await self._handle_list_projects(user)
        elif operation == 'list_tasks':
            return await self._handle_list_tasks(user)
        else:
            return "I understand you want to perform a database operation, but I'm not sure exactly what. Could you please be more specific?"

    async def _handle_create_project(self, query: str, context: Dict, user: Dict) -> str:
        """Handle project creation with data collection"""
        user_id = str(user.get('id', user.get('user_id')))
        
        # Check if we're continuing a project creation process
        if context.get('pending_operation') == 'create_project':
            return await self._continue_project_creation(query, context, user_id)
        
        # Extract any project information from the initial query
        extracted_data = await self._extract_project_data_from_query(query)
        
        # Check what information we still need
        template = self.operation_templates['create_project']
        missing_required = []
        
        for field in template['required_fields']:
            if field not in extracted_data:
                missing_required.append(field)
        
        if missing_required:
            # Start the data collection process
            context['pending_operation'] = 'create_project'
            context['collected_data'] = extracted_data
            context['missing_fields'] = missing_required
            
            return await self._ask_for_missing_project_fields(missing_required, extracted_data)
        else:
            # We have all required data, create the project
            return await self._execute_project_creation(extracted_data, user_id)

    async def _continue_project_creation(self, query: str, context: Dict, user_id: str) -> str:
        """Continue collecting project data"""
        missing_fields = context.get('missing_fields', [])
        collected_data = context.get('collected_data', {})
        
        # Extract new data from user response
        new_data = await self._extract_data_from_response(query, missing_fields)
        collected_data.update(new_data)
        
        # Update missing fields
        still_missing = [field for field in missing_fields if field not in collected_data]
        
        if still_missing:
            context['missing_fields'] = still_missing
            return await self._ask_for_missing_project_fields(still_missing, collected_data)
        else:
            # We have all data, create the project
            context['pending_operation'] = None
            context['missing_fields'] = []
            return await self._execute_project_creation(collected_data, user_id)

    async def _extract_project_data_from_query(self, query: str) -> Dict[str, Any]:
        """Extract project information from natural language query"""
        extracted = {}
        
        # Extract project name
        name_patterns = [
            r'project called "([^"]+)"',
            r'project named "([^"]+)"',
            r'create project "([^"]+)"',
            r'new project "([^"]+)"',
            r'project: ([^\n,]+)',
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                extracted['name'] = match.group(1).strip()
                break
        
        # Extract description
        desc_patterns = [
            r'description:? "([^"]+)"',
            r'about "([^"]+)"',
            r'for ([^,\n]+)',
        ]
        
        for pattern in desc_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                extracted['description'] = match.group(1).strip()
                break
        
        # Extract budget
        budget_patterns = [
            r'budget:? \$?([\d,]+)',
            r'budget of \$?([\d,]+)',
        ]
        
        for pattern in budget_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                budget_str = match.group(1).replace(',', '')
                try:
                    extracted['budget'] = float(budget_str)
                except:
                    pass
                break
        
        return extracted

    async def _ask_for_missing_project_fields(self, missing_fields: List[str], collected_data: Dict) -> str:
        """Generate questions for missing project fields"""
        if not missing_fields:
            return "I have all the information needed."
        
        field_questions = {
            'name': "What would you like to name this project?",
            'description': "Could you provide a description for this project?",
            'budget': "What's the budget for this project? (optional - you can say 'skip' if not applicable)",
            'start_date': "When should this project start? (optional - format: YYYY-MM-DD or say 'skip')",
            'end_date': "When should this project end? (optional - format: YYYY-MM-DD or say 'skip')",
            'priority': "What's the priority level? (low, medium, high, or critical - default is medium)"
        }
        
        current_field = missing_fields[0]
        question = field_questions.get(current_field, f"Please provide the {current_field}:")
        
        if collected_data:
            summary = "So far I have:\n"
            for key, value in collected_data.items():
                summary += f"- {key.title()}: {value}\n"
            return f"{summary}\n{question}"
        
        return question

    async def _extract_data_from_response(self, response: str, expected_fields: List[str]) -> Dict[str, Any]:
        """Extract data from user response"""
        extracted = {}
        response_lower = response.lower().strip()
        
        # Skip field handling
        if response_lower in ['skip', 'none', 'not applicable', 'n/a', 'no']:
            return {}
        
        current_field = expected_fields[0] if expected_fields else None
        
        if current_field == 'name':
            extracted['name'] = response.strip().strip('"')
        elif current_field == 'description':
            extracted['description'] = response.strip().strip('"')
        elif current_field == 'budget':
            # Extract numeric value
            budget_match = re.search(r'[\d,]+\.?\d*', response)
            if budget_match:
                try:
                    extracted['budget'] = float(budget_match.group().replace(',', ''))
                except:
                    pass
        elif current_field == 'priority':
            if any(p in response_lower for p in ['low', 'medium', 'high', 'critical']):
                for priority in ['critical', 'high', 'medium', 'low']:
                    if priority in response_lower:
                        extracted['priority'] = priority
                        break
        elif current_field in ['start_date', 'end_date']:
            # Try to parse date
            date_match = re.search(r'\d{4}-\d{2}-\d{2}', response)
            if date_match:
                try:
                    datetime.strptime(date_match.group(), '%Y-%m-%d')
                    extracted[current_field] = date_match.group()
                except:
                    pass
        
        return extracted

    async def _execute_project_creation(self, project_data: Dict[str, Any], user_id: str) -> str:
        """Execute the actual project creation"""
        try:
            result = await self.db.create_project(project_data, user_id)
            
            return f"""✅ Project created successfully!

**Project Details:**
- Name: {project_data.get('name')}
- Description: {project_data.get('description', 'No description provided')}
- Budget: ${project_data.get('budget', 'Not specified')}
- Priority: {project_data.get('priority', 'medium').title()}
- Project ID: {result['project_id']}

Your project is now ready! You can start adding team members and creating tasks."""
            
        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")
            return f"❌ Sorry, there was an error creating the project: {str(e)}"

    async def _handle_add_project_member(self, query: str, context: Dict, user: Dict) -> str:
        """Handle adding project members"""
        # Implementation for adding project members
        return "I can help you add members to a project. Which project would you like to add members to, and who would you like to add?"

    async def _handle_create_task(self, query: str, context: Dict, user: Dict) -> str:
        """Handle task creation"""
        # Implementation for creating tasks
        return "I can help you create a task. What project is this task for, and what's the task title?"

    async def _handle_list_projects(self, user: Dict) -> str:
        """List user's projects"""
        try:
            user_id = str(user.get('id', user.get('user_id')))
            projects = await self.db.get_user_projects(user_id)
            
            if not projects:
                return "You don't have any projects yet. Would you like to create one?"
            
            response = "📋 **Your Projects:**\n\n"
            for project in projects:
                response += f"• **{project['name']}** ({project['status'].title()})\n"
                response += f"  - Role: {project['role'].title()}\n"
                response += f"  - Priority: {project['priority'].title()}\n"
                if project['description']:
                    response += f"  - Description: {project['description'][:100]}...\n"
                response += f"  - Created: {project['created_at'].strftime('%Y-%m-%d')}\n\n"
            
            return response
            
        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}")
            return f"❌ Sorry, I couldn't retrieve your projects: {str(e)}"

    async def _handle_list_tasks(self, user: Dict) -> str:
        """List user's tasks"""
        return "Task listing functionality is not yet implemented. Would you like me to help you create a new task instead?"

    async def _handle_general_conversation(self, query: str, context: Dict, user: Dict) -> str:
        """Handle general AI conversation"""
        try:
            # Prepare conversation history for context
            messages = [
                {"role": "system", "content": """You are a helpful AI assistant for a project management system. 
                You can help users with:
                - Creating and managing projects
                - Adding team members to projects
                - Creating and assigning tasks
                - Uploading files
                - Managing notifications
                - General project management advice
                
                Be friendly, helpful, and concise in your responses."""}
            ]
            
            # Add recent conversation history
            for msg in context['messages'][-10:]:  # Last 10 messages for context
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })
            
            # Make API call to OpenRouter
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "model": self.default_model,
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7
                }
                
                async with session.post(self.openai_endpoint, headers=headers, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result['choices'][0]['message']['content']
                    else:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error: {response.status} - {error_text}")
                        return "I'm having trouble processing your request right now. Please try again in a moment."
                        
        except Exception as e:
            logger.error(f"Error in general conversation: {str(e)}")
            return "I'm sorry, I'm having trouble understanding your request. Could you please rephrase it?"
