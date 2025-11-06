import time
import json
import re
import uuid
import aiohttp
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
import logging
from fastapi import HTTPException, status

from .database_service import EnhancedDatabaseService as DatabaseService

logger = logging.getLogger(__name__)

class IntelligentAIService:
    """Enhanced AI service with intelligent database operations and natural language processing"""
      def __init__(self, db: DatabaseService, openai_api_key: str, default_model: str = "gpt-3.5-turbo"):
        self.db = db
        self.openai_api_key = openai_api_key
        self.default_model = default_model
        self.openai_endpoint = "https://api.openai.com/v1/chat/completions"
        
        # Intent patterns for various operations
        self.intent_patterns = {
            'create_project': [
                r'create\s+(?:a\s+)?(?:new\s+)?project\s+(?:called\s+|named\s+)?["\']?([^"\']+)["\']?',
                r'(?:make|build|start)\s+(?:a\s+)?(?:new\s+)?project\s+["\']?([^"\']+)["\']?',
                r'new\s+project\s*[:]\s*["\']?([^"\']+)["\']?',
                r'project\s+creation\s*[:]\s*["\']?([^"\']+)["\']?'
            ],
            'add_member': [
                r'add\s+([^\\s]+(?:\s+[^\\s]+)*)\s+to\s+(?:the\s+)?project\s+["\']?([^"\']+)["\']?',
                r'invite\s+([^\\s]+(?:\s+[^\\s]+)*)\s+to\s+["\']?([^"\']+)["\']?',
                r'(?:give|grant)\s+([^\\s]+(?:\s+[^\\s]+)*)\s+access\s+to\s+["\']?([^"\']+)["\']?'
            ],
            'create_task': [
                r'create\s+(?:a\s+)?(?:new\s+)?task\s+["\']?([^"\']+)["\']?(?:\s+for\s+project\s+["\']?([^"\']+)["\']?)?',
                r'add\s+task\s*[:]\s*["\']?([^"\']+)["\']?(?:\s+to\s+["\']?([^"\']+)["\']?)?',
                r'(?:make|new)\s+task\s+["\']?([^"\']+)["\']?'
            ],
            'upload_file': [
                r'upload\s+(?:a\s+)?file\s+["\']?([^"\']+)["\']?(?:\s+to\s+(?:project\s+)?["\']?([^"\']+)["\']?)?',
                r'attach\s+["\']?([^"\']+)["\']?(?:\s+to\s+["\']?([^"\']+)["\']?)?'
            ],
            'send_notification': [
                r'notify\s+([^\\s]+(?:\s+[^\\s]+)*)\s+(?:about\s+)?["\']?([^"\']+)["\']?',
                r'send\s+(?:a\s+)?notification\s+to\s+([^\\s]+(?:\s+[^\\s]+)*)\s*[:]\s*["\']?([^"\']+)["\']?'
            ]
        }
    
    async def process_natural_language_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """Process natural language query and execute appropriate database operations"""
        try:
            start_time = time.time()
            
            # Detect intent and extract entities
            intent, entities = await self._detect_intent_and_entities(query)
            
            if intent == 'create_project':
                result = await self._handle_project_creation(entities, user_context, query)
            elif intent == 'add_member':
                result = await self._handle_member_addition(entities, user_context, query)
            elif intent == 'create_task':
                result = await self._handle_task_creation(entities, user_context, query)
            elif intent == 'upload_file':
                result = await self._handle_file_upload(entities, user_context, query)
            elif intent == 'send_notification':
                result = await self._handle_notification(entities, user_context, query)
            else:
                # General AI query
                result = await self._handle_general_query(query, user_context)
            
            processing_time = time.time() - start_time
            
            return {
                'response': result.get('response', ''),
                'success': result.get('success', True),
                'data': result.get('data', {}),
                'processing_time': processing_time,
                'intent': intent,
                'entities': entities,
                'metadata': {
                    'user_id': user_context.get('id'),
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing natural language query: {e}")
            return {
                'response': f"❌ Sorry, there was an error processing your request: {str(e)}",
                'success': False,
                'processing_time': time.time() - start_time if 'start_time' in locals() else 0,
                'error': str(e)
            }
    
    async def _detect_intent_and_entities(self, query: str) -> tuple[str, Dict[str, Any]]:
        """Detect user intent and extract entities from the query"""
        query_lower = query.lower().strip()
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, query_lower, re.IGNORECASE)
                if match:
                    entities = {'raw_matches': match.groups()}
                    
                    # Extract specific entities based on intent
                    if intent == 'create_project':
                        entities['project_name'] = match.group(1).strip()
                        entities['description'] = await self._extract_description(query, entities['project_name'])
                        entities['additional_info'] = await self._extract_project_details(query)
                    
                    elif intent == 'add_member':
                        entities['member_identifier'] = match.group(1).strip()
                        entities['project_name'] = match.group(2).strip() if len(match.groups()) > 1 else None
                        entities['role'] = await self._extract_role(query)
                    
                    elif intent == 'create_task':
                        entities['task_title'] = match.group(1).strip()
                        entities['project_name'] = match.group(2).strip() if len(match.groups()) > 1 else None
                        entities['task_details'] = await self._extract_task_details(query)
                    
                    elif intent == 'upload_file':
                        entities['file_name'] = match.group(1).strip()
                        entities['project_name'] = match.group(2).strip() if len(match.groups()) > 1 else None
                    
                    elif intent == 'send_notification':
                        entities['recipient'] = match.group(1).strip()
                        entities['message'] = match.group(2).strip()
                    
                    return intent, entities
        
        return 'general_query', {'query': query}
    
    async def _extract_description(self, query: str, project_name: str) -> Optional[str]:
        """Extract project description from the query"""
        # Look for description patterns
        desc_patterns = [
            r'(?:description|desc)\s*[:]\s*["\']?([^"\']+)["\']?',
            r'(?:about|for)\s+["\']?([^"\']+)["\']?',
            r'(?:that|which)\s+(?:is\s+|will\s+)?(?:for\s+|about\s+)?["\']?([^"\']+)["\']?'
        ]
        
        for pattern in desc_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    async def _extract_project_details(self, query: str) -> Dict[str, Any]:
        """Extract additional project details from the query"""
        details = {}
        
        # Extract budget
        budget_match = re.search(r'budget\s*[:]\s*\$?([0-9,]+(?:\.[0-9]{2})?)', query, re.IGNORECASE)
        if budget_match:
            details['budget'] = float(budget_match.group(1).replace(',', ''))
        
        # Extract dates
        date_patterns = [
            r'(?:start(?:ing)?|begin(?:ning)?)\s+(?:on\s+)?(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})',
            r'(?:end(?:ing)?|finish(?:ing)?|due)\s+(?:on\s+)?(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})'
        ]
        
        for i, pattern in enumerate(date_patterns):
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                key = 'start_date' if i == 0 else 'end_date'
                details[key] = match.group(1)
        
        # Extract priority/status
        if re.search(r'\\b(urgent|high\\s+priority|critical)\\b', query, re.IGNORECASE):
            details['priority'] = 'high'
        elif re.search(r'\\b(low\\s+priority|minor)\\b', query, re.IGNORECASE):
            details['priority'] = 'low'
        
        return details
    
    async def _extract_role(self, query: str) -> str:
        """Extract member role from the query"""
        if re.search(r'\\b(admin|administrator|owner)\\b', query, re.IGNORECASE):
            return 'Admin'
        elif re.search(r'\\b(contributor|developer|member)\\b', query, re.IGNORECASE):
            return 'Contributor'
        elif re.search(r'\\b(viewer|observer|read-only)\\b', query, re.IGNORECASE):
            return 'Viewer'
        
        return 'Contributor'  # Default role
    
    async def _extract_task_details(self, query: str) -> Dict[str, Any]:
        """Extract task details from the query"""
        details = {}
        
        # Extract priority
        if re.search(r'\\b(urgent|high\\s+priority|critical)\\b', query, re.IGNORECASE):
            details['priority'] = 'high'
        elif re.search(r'\\b(medium\\s+priority|normal)\\b', query, re.IGNORECASE):
            details['priority'] = 'medium'
        elif re.search(r'\\b(low\\s+priority|minor)\\b', query, re.IGNORECASE):
            details['priority'] = 'low'
        
        # Extract due date
        due_date_match = re.search(r'(?:due|deadline)\\s+(?:on\\s+)?(\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}-\\d{2}-\\d{2})', query, re.IGNORECASE)
        if due_date_match:
            details['due_date'] = due_date_match.group(1)
        
        # Extract estimated hours
        hours_match = re.search(r'(\\d+)\\s+hours?', query, re.IGNORECASE)
        if hours_match:
            details['estimated_hours'] = int(hours_match.group(1))
        
        return details
    
    async def _handle_project_creation(self, entities: Dict, user_context: Dict, original_query: str) -> Dict[str, Any]:
        """Handle project creation with intelligent field gathering"""
        try:
            project_name = entities.get('project_name')
            if not project_name:
                return {
                    'response': "❌ I couldn't extract the project name from your request. Please specify a project name.",
                    'success': False
                }
            
            # Get project schema to understand required fields
            schema = await self.db.get_table_schema('projects')
            required_fields = schema.get('required_fields', [])
            
            # Build project data
            project_data = {
                'name': project_name,
                'status': 'pending',
                'created_at': datetime.utcnow()
            }
            
            # Add optional fields if extracted
            additional_info = entities.get('additional_info', {})
            if entities.get('description'):
                project_data['description'] = entities['description']
            
            if additional_info.get('budget'):
                project_data['budget'] = additional_info['budget']
            
            if additional_info.get('start_date'):
                project_data['start_date'] = additional_info['start_date']
            
            if additional_info.get('end_date'):
                project_data['end_date'] = additional_info['end_date']
            
            # Create the project using smart insert
            result = await self.db.smart_insert('projects', project_data, user_context)
            
            if result:
                # Create default project memory entry
                await self._create_project_memory(result['id'], original_query, user_context)
                
                response = f"✅ **Project '{project_name}' created successfully!**\\n\\n"
                response += f"📋 **Project ID:** {result['id']}\\n"
                response += f"👤 **Owner:** {user_context.get('name', 'You')}\\n"
                response += f"📅 **Created:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}\\n"
                
                if project_data.get('description'):
                    response += f"📝 **Description:** {project_data['description']}\\n"
                
                if project_data.get('budget'):
                    response += f"💰 **Budget:** ${project_data['budget']:,.2f}\\n"
                
                response += "\\n🎯 **Next steps:**\\n"
                response += "• Add team members: 'add [name] to project [project_name]'\\n"
                response += "• Create tasks: 'create task [task_name] for project [project_name]'\\n"
                response += "• Upload files: 'upload file [filename] to project [project_name]'"
                
                return {
                    'response': response,
                    'success': True,
                    'data': {
                        'project': result,
                        'suggested_actions': [
                            'add_members',
                            'create_tasks',
                            'upload_files'
                        ]
                    }
                }
            else:
                return {
                    'response': "❌ Failed to create the project. Please try again.",
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error in project creation: {e}")
            return {
                'response': f"❌ Sorry, there was an error creating the project: {str(e)}",
                'success': False,
                'error': str(e)
            }
    
    async def _handle_member_addition(self, entities: Dict, user_context: Dict, original_query: str) -> Dict[str, Any]:
        """Handle adding members to projects"""
        try:
            member_identifier = entities.get('member_identifier')
            project_name = entities.get('project_name')
            role = entities.get('role', 'Contributor')
            
            if not member_identifier:
                return {
                    'response': "❌ Please specify who you want to add to the project.",
                    'success': False
                }
            
            # Find the user
            users = await self.db.search_users(member_identifier)
            if not users:
                return {
                    'response': f"❌ Could not find user '{member_identifier}'. Please check the username or email.",
                    'success': False
                }
            
            user_to_add = users[0]  # Take the first match
            
            # Find the project
            if project_name:
                projects = await self.db.get_user_accessible_projects(user_context['id'])
                project = next((p for p in projects if p['name'].lower() == project_name.lower()), None)
                
                if not project:
                    return {
                        'response': f"❌ Could not find project '{project_name}' that you have access to.",
                        'success': False
                    }
                
                project_id = project['id']
            else:
                # If no project specified, ask for clarification
                projects = await self.db.get_user_accessible_projects(user_context['id'])
                if not projects:
                    return {
                        'response': "❌ You don't have any projects to add members to.",
                        'success': False
                    }
                
                project_list = "\\n".join([f"• {p['name']}" for p in projects[:5]])
                return {
                    'response': f"📋 Which project would you like to add {user_to_add['username']} to?\\n\\n{project_list}\\n\\nPlease specify: 'add {member_identifier} to project [project_name]'",
                    'success': False,
                    'data': {'available_projects': projects[:5]}
                }
            
            # Add the member
            member_data = {
                'project_id': project_id,
                'user_id': user_to_add['id'],
                'role': role
            }
            
            result = await self.db.smart_insert('project_members', member_data, user_context)
            
            if result:
                # Send notification to the added user
                await self._send_member_notification(user_to_add, project, user_context)
                
                return {
                    'response': f"✅ **{user_to_add['username']} added to '{project['name']}' successfully!**\\n\\n👤 **Role:** {role}\\n📧 **Email:** {user_to_add['email']}\\n\\n📬 A notification has been sent to the user.",
                    'success': True,
                    'data': {
                        'member': result,
                        'project': project,
                        'user': user_to_add
                    }
                }
            else:
                return {
                    'response': "❌ Failed to add the member. They might already be a member of this project.",
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error in member addition: {e}")
            return {
                'response': f"❌ Sorry, there was an error adding the member: {str(e)}",
                'success': False,
                'error': str(e)
            }
    
    async def _handle_task_creation(self, entities: Dict, user_context: Dict, original_query: str) -> Dict[str, Any]:
        """Handle task creation"""
        try:
            task_title = entities.get('task_title')
            project_name = entities.get('project_name')
            task_details = entities.get('task_details', {})
            
            if not task_title:
                return {
                    'response': "❌ Please specify the task title.",
                    'success': False
                }
            
            # Find the project
            if project_name:
                projects = await self.db.get_user_accessible_projects(user_context['id'])
                project = next((p for p in projects if p['name'].lower() == project_name.lower()), None)
                
                if not project:
                    return {
                        'response': f"❌ Could not find project '{project_name}' that you have access to.",
                        'success': False
                    }
                
                project_id = project['id']
            else:
                # If no project specified, ask for clarification
                projects = await self.db.get_user_accessible_projects(user_context['id'])
                if not projects:
                    return {
                        'response': "❌ You don't have any projects to create tasks in.",
                        'success': False
                    }
                
                project_list = "\\n".join([f"• {p['name']}" for p in projects[:5]])
                return {
                    'response': f"📋 Which project should this task be created in?\\n\\n{project_list}\\n\\nPlease specify: 'create task \\\"{task_title}\\\" for project [project_name]'",
                    'success': False,
                    'data': {'available_projects': projects[:5]}
                }
            
            # Build task data
            task_data = {
                'title': task_title,
                'project_id': project_id,
                'created_by': user_context['id'],
                'status': 'todo',
                'priority': task_details.get('priority', 'medium'),
                'created_at': datetime.utcnow()
            }
            
            if task_details.get('due_date'):
                task_data['due_date'] = task_details['due_date']
            
            if task_details.get('estimated_hours'):
                task_data['estimated_hours'] = task_details['estimated_hours']
            
            # Extract description from the original query
            desc_match = re.search(r'(?:description|details?)\\s*[:]\\s*["\\\']?([^"\\\']+)["\\\']?', original_query, re.IGNORECASE)
            if desc_match:
                task_data['description'] = desc_match.group(1).strip()
            
            result = await self.db.smart_insert('tasks', task_data, user_context)
            
            if result:
                response = f"✅ **Task '{task_title}' created successfully!**\\n\\n"
                response += f"📋 **Task ID:** {result['id']}\\n"
                response += f"🏗️ **Project:** {project['name']}\\n"
                response += f"👤 **Created by:** {user_context.get('name', 'You')}\\n"
                response += f"🎯 **Priority:** {task_data['priority'].title()}\\n"
                response += f"📅 **Status:** {task_data['status'].title()}\\n"
                
                if task_data.get('due_date'):
                    response += f"⏰ **Due Date:** {task_data['due_date']}\\n"
                
                if task_data.get('estimated_hours'):
                    response += f"⏱️ **Estimated Hours:** {task_data['estimated_hours']}\\n"
                
                return {
                    'response': response,
                    'success': True,
                    'data': {
                        'task': result,
                        'project': project
                    }
                }
            else:
                return {
                    'response': "❌ Failed to create the task. Please try again.",
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error in task creation: {e}")
            return {
                'response': f"❌ Sorry, there was an error creating the task: {str(e)}",
                'success': False,
                'error': str(e)
            }
    
    async def _handle_file_upload(self, entities: Dict, user_context: Dict, original_query: str) -> Dict[str, Any]:
        """Handle file upload simulation (placeholder)"""
        file_name = entities.get('file_name')
        project_name = entities.get('project_name')
        
        response = f"📁 **File Upload Request**\\n\\n"
        response += f"📄 **File:** {file_name}\\n"
        
        if project_name:
            response += f"🏗️ **Target Project:** {project_name}\\n"
        
        response += "\\n⚠️ **Note:** File upload functionality is not yet implemented in this demo.\\n"
        response += "In a full implementation, this would:\\n"
        response += "• Validate file type and size\\n"
        response += "• Upload to cloud storage\\n"
        response += "• Create database record\\n"
        response += "• Send notifications to project members"
        
        return {
            'response': response,
            'success': True,
            'data': {
                'file_name': file_name,
                'project_name': project_name,
                'status': 'simulated'
            }
        }
    
    async def _handle_notification(self, entities: Dict, user_context: Dict, original_query: str) -> Dict[str, Any]:
        """Handle sending notifications"""
        try:
            recipient = entities.get('recipient')
            message = entities.get('message')
            
            if not recipient or not message:
                return {
                    'response': "❌ Please specify both the recipient and message for the notification.",
                    'success': False
                }
            
            # Find the recipient user
            users = await self.db.search_users(recipient)
            if not users:
                return {
                    'response': f"❌ Could not find user '{recipient}'.",
                    'success': False
                }
            
            recipient_user = users[0]
            
            # Create notification
            notification_data = {
                'user_id': recipient_user['id'],
                'title': f"Message from {user_context.get('name', 'System')}",
                'message': message,
                'type': 'message',
                'is_read': False,
                'sender_id': user_context['id'],
                'created_at': datetime.utcnow()
            }
            
            result = await self.db.smart_insert('notifications', notification_data, user_context)
            
            if result:
                return {
                    'response': f"✅ **Notification sent successfully!**\\n\\n👤 **To:** {recipient_user['username']} ({recipient_user['email']})\\n💬 **Message:** {message}\\n📅 **Sent:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                    'success': True,
                    'data': {
                        'notification': result,
                        'recipient': recipient_user
                    }
                }
            else:
                return {
                    'response': "❌ Failed to send the notification.",
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return {
                'response': f"❌ Sorry, there was an error sending the notification: {str(e)}",
                'success': False,
                'error': str(e)
            }
    
    async def _handle_general_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """Handle general AI queries"""
        try:
            # Use OpenAI API for general queries
            headers = {
                "Authorization": f"Bearer {self.openai_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.default_model,
                "messages": [
                    {
                        "role": "system",
                        "content": f"You are an AI assistant for a project management system. The user's name is {user_context.get('name', 'User')} and their role is {user_context.get('role', 'member')}. Help them with project management questions and provide guidance on using the system effectively."
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.openai_endpoint, headers=headers, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        ai_response = data['choices'][0]['message']['content']
                        
                        return {
                            'response': ai_response,
                            'success': True,
                            'data': {
                                'model_used': self.default_model,
                                'tokens_used': data.get('usage', {}).get('total_tokens', 0)
                            }
                        }
                    else:
                        error_data = await response.json()
                        logger.error(f"OpenAI API error: {response.status} - {error_data}")
                        
                        return {
                            'response': "I'm having trouble processing your request right now. Please try again in a moment.",
                            'success': False,
                            'error': f"API Error: {response.status}"
                        }
                        
        except Exception as e:
            logger.error(f"Error in general query handling: {e}")
            return {
                'response': "I'm having trouble processing your request right now. Please try again in a moment.",
                'success': False,
                'error': str(e)
            }
    
    async def _create_project_memory(self, project_id: str, initial_query: str, user_context: Dict):
        """Create initial project memory entry"""
        try:
            memory_data = {
                'project_id': project_id,
                'conversations': [
                    {
                        'timestamp': datetime.utcnow().isoformat(),
                        'user': user_context.get('name', 'User'),
                        'query': initial_query,
                        'action': 'project_created'
                    }
                ],
                'decisions': [
                    {
                        'timestamp': datetime.utcnow().isoformat(),
                        'decision': f"Project created by {user_context.get('name', 'User')}",
                        'context': 'initial_creation'
                    }
                ],
                'artifacts': [],
                'knowledge_graph': {
                    'entities': {
                        'creator': user_context.get('id'),
                        'creation_method': 'ai_assistant'
                    },
                    'relationships': []
                }
            }
            
            await self.db.smart_insert('project_memories', memory_data, user_context)
            
        except Exception as e:
            logger.error(f"Error creating project memory: {e}")
    
    async def _send_member_notification(self, user: Dict, project: Dict, inviter: Dict):
        """Send notification to newly added project member"""
        try:
            notification_data = {
                'user_id': user['id'],
                'title': f"Added to Project: {project['name']}",
                'message': f"You have been added to the project '{project['name']}' by {inviter.get('name', 'a team member')}.",
                'type': 'project_invitation',
                'is_read': False,
                'sender_id': inviter['id'],
                'created_at': datetime.utcnow()
            }
            
            await self.db.smart_insert('notifications', notification_data, inviter)
            
        except Exception as e:
            logger.error(f"Error sending member notification: {e}")

    async def query_ai(self, request, user_context: Dict) -> Dict[str, Any]:
        """Main entry point for AI queries"""
        return await self.process_natural_language_query(request.query, user_context)
