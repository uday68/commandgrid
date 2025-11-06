import asyncio
import asyncpg
import json
import uuid
import logging
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TableSchema:
    table_name: str
    columns: List[Dict[str, Any]]
    primary_keys: List[str]
    foreign_keys: List[Dict[str, str]]

class EnhancedDatabaseService:
    def __init__(self, database_url: str = None, pool: asyncpg.Pool = None, redis_client = None):
        self.database_url = database_url
        self.pool = pool
        self.redis_client = redis_client
        self._schema_cache = {}
        self._table_relationships = {}
        
        # If pool is provided, use it directly
        if self.pool and not self.database_url:
            self.database_url = "provided_pool"        
    async def connect(self):
        """Initialize database connection pool"""
        if self.pool:
            # Pool already provided, just cache schemas
            logger.info("Using provided database connection pool")
            await self._cache_all_schemas()
            return
            
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                server_settings={
                    'jit': 'off'
                }
            )
            logger.info("Database connection pool created successfully")
            await self._cache_all_schemas()
        except Exception as e:
            logger.error(f"Failed to create database connection pool: {e}")
            raise

    async def initialize(self):
        """Initialize the service (alias for connect for compatibility)"""
        await self.connect()

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def _cache_all_schemas(self):
        """Cache all table schemas for performance"""
        try:
            async with self.pool.acquire() as conn:
                # Get all table names
                tables = await conn.fetch("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                """)
                
                for table in tables:
                    table_name = table['table_name']
                    schema = await self._fetch_table_schema(conn, table_name)
                    self._schema_cache[table_name] = schema
                    
                    # Cache relationships
                    relationships = await self._fetch_table_relationships(conn, table_name)
                    self._table_relationships[table_name] = relationships
                    
                logger.info(f"Cached schemas for {len(self._schema_cache)} tables")
        except Exception as e:
            logger.error(f"Error caching schemas: {e}")

    async def _fetch_table_schema(self, conn: asyncpg.Connection, table_name: str) -> Dict:
        """Fetch detailed schema for a specific table"""
        try:
            columns = await conn.fetch("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
                ) pk ON c.column_name = pk.column_name
                WHERE c.table_name = $1
                ORDER BY c.ordinal_position
            """, table_name)
            
            return {
                'table_name': table_name,
                'columns': [dict(col) for col in columns]
            }
        except Exception as e:
            logger.error(f"Error fetching schema for {table_name}: {e}")
            return {}

    async def _fetch_table_relationships(self, conn: asyncpg.Connection, table_name: str) -> Dict:
        """Fetch foreign key relationships for a table"""
        try:
            fks = await conn.fetch("""
                SELECT 
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = $1
                AND tc.constraint_type = 'FOREIGN KEY'
            """, table_name)
            
            relationships = {}
            for fk in fks:
                relationships[fk['column_name']] = {
                    'table': fk['foreign_table_name'],
                    'column': fk['foreign_column_name']
                }
            
            return relationships
        except Exception as e:
            logger.error(f"Error fetching relationships for {table_name}: {e}")
            return {}

    async def get_table_schema(self, table_name: str) -> Optional[Dict]:
        """Get cached table schema"""
        if table_name not in self._schema_cache:
            # Try to fetch if not cached
            async with self.pool.acquire() as conn:
                schema = await self._fetch_table_schema(conn, table_name)
                if schema:
                    self._schema_cache[table_name] = schema
                    relationships = await self._fetch_table_relationships(conn, table_name)
                    self._table_relationships[table_name] = relationships
        
        return self._schema_cache.get(table_name)

    async def resolve_foreign_key_value(self, table_name: str, column_name: str, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve a foreign key value based on table relationships"""
        try:
            relationships = self._table_relationships.get(table_name, {})
            if column_name not in relationships:
                return str(value)
            
            foreign_table = relationships[column_name]['table']
            
            # Special handling for different reference types
            if 'user' in column_name.lower() or foreign_table == 'users':
                return await self._resolve_user_reference(value, user_context)
            elif 'admin' in column_name.lower() or foreign_table == 'admins':
                return await self._resolve_admin_reference(value, user_context)
            elif 'company' in column_name.lower() or foreign_table == 'companies':
                return await self._resolve_company_reference(value, user_context)
            elif 'project' in column_name.lower() or foreign_table == 'projects':
                return await self._resolve_project_reference(value, user_context)
            else:
                return await self._generic_foreign_key_resolution(foreign_table, value)
                
        except Exception as e:
            logger.error(f"Error resolving foreign key {column_name} in {table_name}: {e}")
            return str(value)

    async def _resolve_user_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve user reference"""
        try:
            # Use current user if context provided
            if user_context and user_context.get('user_id'):
                return str(user_context['user_id'])
            
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    user = await conn.fetchrow("SELECT user_id FROM users WHERE user_id = $1", str(value))
                    return str(value) if user else None
            
            # Try to find user by email or username
            if '@' in str(value):
                async with self.pool.acquire() as conn:
                    user = await conn.fetchrow("SELECT user_id FROM users WHERE email = $1", str(value))
                    return str(user['user_id']) if user else None
            else:
                async with self.pool.acquire() as conn:
                    user = await conn.fetchrow("SELECT user_id FROM users WHERE username = $1", str(value))
                    return str(user['user_id']) if user else None
                    
        except Exception as e:
            logger.error(f"Error resolving user reference {value}: {e}")
        
        return None

    async def _resolve_admin_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve admin reference"""
        try:
            # If user_context is provided and user is admin
            if user_context and user_context.get('role') in ['admin', 'super_admin']:
                # Check if user exists in admins table
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT admin_id FROM admins WHERE email = $1", user_context.get('email'))
                    if admin:
                        return str(admin['admin_id'])
                    
                    # Create admin entry if doesn't exist
                    admin_id = await self._create_fallback_admin(user_context)
                    return admin_id
            
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT admin_id FROM admins WHERE admin_id = $1", str(value))
                    return str(value) if admin else None
            
            # Try to find admin by email
            if '@' in str(value):
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT admin_id FROM admins WHERE email = $1", str(value))
                    return str(admin['admin_id']) if admin else None
            
            # Create a default admin if none exists
            return await self._ensure_default_admin()
                
        except Exception as e:
            logger.error(f"Error resolving admin reference {value}: {e}")
            return await self._ensure_default_admin()

    async def _resolve_company_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve company reference"""
        try:
            # Use user's company if available
            if user_context and user_context.get('company_id'):
                return str(user_context['company_id'])
            
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    company = await conn.fetchrow("SELECT company_id FROM companies WHERE company_id = $1", str(value))
                    return str(value) if company else None
            
            # Try to find company by name
            async with self.pool.acquire() as conn:
                company = await conn.fetchrow("SELECT company_id FROM companies WHERE company_name = $1", str(value))
                return str(company['company_id']) if company else None
                
        except Exception as e:
            logger.error(f"Error resolving company reference {value}: {e}")
        
        return None

    async def _resolve_project_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve project reference"""
        try:
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    project = await conn.fetchrow("SELECT project_id FROM projects WHERE project_id = $1", str(value))
                    return str(value) if project else None
            
            # Try to find project by name
            async with self.pool.acquire() as conn:
                query = "SELECT project_id FROM projects WHERE name = $1"
                params = [str(value)]
                
                # Filter by user's accessible projects if user context available
                if user_context:
                    query += " AND (owner_id = $2 OR project_id IN (SELECT project_id FROM project_members WHERE user_id = $2))"
                    params.append(str(user_context.get('user_id')))
                
                project = await conn.fetchrow(query, *params)
                return str(project['project_id']) if project else None
                
        except Exception as e:
            logger.error(f"Error resolving project reference {value}: {e}")
        
        return None

    async def _generic_foreign_key_resolution(self, table: str, value: Any) -> Optional[str]:
        """Generic foreign key resolution for other tables"""
        try:
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    # Get the primary key column name for the table
                    schema = await self.get_table_schema(table)
                    if schema:
                        pk_columns = [col['column_name'] for col in schema['columns'] if col['is_primary_key']]
                        if pk_columns:
                            pk_col = pk_columns[0]
                            result = await conn.fetchrow(f"SELECT {pk_col} FROM {table} WHERE {pk_col} = $1", str(value))
                            return str(value) if result else None
            
            return str(value)
                
        except Exception as e:
            logger.error(f"Error in generic foreign key resolution for {table}: {e}")
            return str(value)

    async def _create_fallback_admin(self, user_context: Dict) -> str:
        """Create a fallback admin entry from user context"""
        try:
            admin_id = str(uuid.uuid4())
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO admins (admin_id, first_name, last_name, email, password, role, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    ON CONFLICT (email) DO NOTHING
                """, 
                admin_id,
                user_context.get('first_name', user_context.get('name', '').split()[0] if user_context.get('name') else 'Admin'),
                user_context.get('last_name', user_context.get('name', '').split()[-1] if len(user_context.get('name', '').split()) > 1 else 'User'),
                user_context.get('email'),
                'temp_password',  # Should be properly hashed in production
                'admin'
                )
            
            return admin_id
        except Exception as e:
            logger.error(f"Error creating fallback admin: {e}")
            return await self._ensure_default_admin()

    async def _ensure_default_admin(self) -> str:
        """Ensure a default admin exists"""
        try:
            async with self.pool.acquire() as conn:
                # Check if any admin exists
                admin = await conn.fetchrow("SELECT admin_id FROM admins LIMIT 1")
                if admin:
                    return str(admin['admin_id'])
                
                # Create default admin
                admin_id = str(uuid.uuid4())
                await conn.execute("""
                    INSERT INTO admins (admin_id, first_name, last_name, email, password, role, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                """, 
                admin_id, 'System', 'Admin', 'admin@system.local', 'temp_password', 'super_admin'
                )
                
                return admin_id
        except Exception as e:
            logger.error(f"Error ensuring default admin: {e}")
            # Return a fallback UUID if all else fails
            return str(uuid.uuid4())

    def _is_valid_uuid(self, value: str) -> bool:
        """Check if a string is a valid UUID"""
        try:
            uuid.UUID(str(value))
            return True
        except (ValueError, TypeError):
            return False

    async def smart_insert(self, table_name: str, data: Dict[str, Any], user_context: Dict = None) -> Dict:
        """Smart insert that handles foreign key resolution automatically"""
        try:
            schema = await self.get_table_schema(table_name)
            if not schema:
                raise ValueError(f"Table {table_name} not found")

            # Column mapping for common ID fields
            column_mappings = {
                'users': {'id': 'user_id'},
                'projects': {'id': 'project_id'}, 
                'tasks': {'id': 'task_id'},
                'teams': {'id': 'team_id'},
                'companies': {'id': 'company_id'},
                'admins': {'id': 'admin_id'},
                'notifications': {'id': 'notification_id'}
            }

            # Apply column mapping
            mapped_data = {}
            for key, value in data.items():
                if table_name in column_mappings and key in column_mappings[table_name]:
                    mapped_key = column_mappings[table_name][key]
                    mapped_data[mapped_key] = value
                else:
                    mapped_data[key] = value

            # Prepare the data with foreign key resolution
            processed_data = {}
            for column_name, value in mapped_data.items():
                if value is not None:
                    # Check if this is a foreign key column
                    if column_name in self._table_relationships.get(table_name, {}):
                        resolved_value = await self.resolve_foreign_key_value(table_name, column_name, value, user_context)
                        if resolved_value:
                            processed_data[column_name] = resolved_value
                    else:
                        # Handle special data types
                        if isinstance(value, (dict, list)):
                            processed_data[column_name] = json.dumps(value)
                        elif isinstance(value, datetime):
                            processed_data[column_name] = value
                        elif isinstance(value, date):
                            processed_data[column_name] = value
                        else:
                            processed_data[column_name] = value

            # Generate UUID for primary key if needed
            pk_columns = [col['column_name'] for col in schema['columns'] if col['is_primary_key']]
            for pk_col in pk_columns:
                if pk_col not in processed_data and any(col['data_type'] == 'uuid' for col in schema['columns'] if col['column_name'] == pk_col):
                    processed_data[pk_col] = str(uuid.uuid4())

            # Build the insert query
            columns = list(processed_data.keys())
            if not columns:
                raise ValueError("No valid data to insert")

            placeholders = ', '.join([f'${i+1}' for i in range(len(columns))])
            column_names = ', '.join(columns)

            query = f"""
                INSERT INTO {table_name} ({column_names})
                VALUES ({placeholders})
                RETURNING *
            """

            async with self.pool.acquire() as conn:
                result = await conn.fetchrow(query, *processed_data.values())
                return dict(result) if result else {}

        except Exception as e:
            logger.error(f"Error in smart insert for table {table_name}: {e}")
            logger.error(f"Data: {data}")
            logger.error(f"Processed data: {processed_data if 'processed_data' in locals() else 'N/A'}")
            raise

    async def smart_update(self, table_name: str, record_id: str, data: Dict[str, Any], user_context: Dict = None) -> Dict:
        """Smart update with foreign key resolution"""
        try:
            schema = await self.get_table_schema(table_name)
            if not schema:
                raise ValueError(f"Table {table_name} not found")

            # Column mapping for common ID fields
            column_mappings = {
                'users': {'id': 'user_id'},
                'projects': {'id': 'project_id'}, 
                'tasks': {'id': 'task_id'},
                'teams': {'id': 'team_id'},
                'companies': {'id': 'company_id'},
                'admins': {'id': 'admin_id'},
                'notifications': {'id': 'notification_id'}
            }

            # Apply column mapping
            mapped_data = {}
            for key, value in data.items():
                if table_name in column_mappings and key in column_mappings[table_name]:
                    mapped_key = column_mappings[table_name][key]
                    mapped_data[mapped_key] = value
                else:
                    mapped_data[key] = value

            # Process the data similar to smart_insert
            processed_data = {}
            for column_name, value in mapped_data.items():
                if value is not None:
                    if column_name in self._table_relationships.get(table_name, {}):
                        resolved_value = await self.resolve_foreign_key_value(table_name, column_name, value, user_context)
                        if resolved_value:
                            processed_data[column_name] = resolved_value
                    else:
                        if isinstance(value, (dict, list)):
                            processed_data[column_name] = json.dumps(value)
                        else:
                            processed_data[column_name] = value

            if not processed_data:
                raise ValueError("No valid data to update")

            # Build the update query
            set_clause = ', '.join([f"{col} = ${i+1}" for i, col in enumerate(processed_data.keys())])
            pk_column = next((col['column_name'] for col in schema['columns'] if col['is_primary_key']), 'id')

            query = f"""
                UPDATE {table_name}
                SET {set_clause}, updated_at = NOW()
                WHERE {pk_column} = ${len(processed_data)+1}
                RETURNING *
            """

            async with self.pool.acquire() as conn:
                result = await conn.fetchrow(query, *processed_data.values(), record_id)
                return dict(result) if result else {}

        except Exception as e:
            logger.error(f"Error in smart update for table {table_name}: {e}")
            raise

    async def search_users(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for users by name, email, or username"""
        try:
            async with self.pool.acquire() as conn:
                results = await conn.fetch("""
                    SELECT user_id, username, email, first_name, last_name
                    FROM users
                    WHERE 
                        username ILIKE $1 OR 
                        email ILIKE $1 OR 
                        first_name ILIKE $1 OR 
                        last_name ILIKE $1 OR
                        CONCAT(first_name, ' ', last_name) ILIKE $1
                    LIMIT $2
                """, f"%{query}%", limit)
                
                return [dict(user) for user in results]
        except Exception as e:
            logger.error(f"Error searching users: {e}")
            return []

    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        try:
            async with self.pool.acquire() as conn:
                user = await conn.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None

    async def get_user_accessible_projects(self, user_id: str) -> List[Dict]:
        """Get projects accessible to a user"""
        try:
            async with self.pool.acquire() as conn:
                projects = await conn.fetch("""
                    SELECT DISTINCT p.*, 
                           CASE WHEN p.owner_id = $1 THEN 'owner'
                                WHEN pm.role IS NOT NULL THEN pm.role
                                ELSE 'member' END as user_role
                    FROM projects p
                    LEFT JOIN project_members pm ON p.project_id = pm.project_id AND pm.user_id = $1
                    WHERE p.owner_id = $1 OR pm.user_id = $1
                    ORDER BY p.created_at DESC
                """, user_id)
                
                return [dict(project) for project in projects]
        except Exception as e:
            logger.error(f"Error getting user accessible projects: {e}")
            return []

    async def create_project(self, project_data: Dict[str, Any], user_context: Dict) -> Dict:
        """Create a new project in the database"""
        try:
            # Ensure required fields
            if 'name' not in project_data:
                raise ValueError("Project name is required")
            
            # Use smart_insert for automatic foreign key resolution
            result = await self.smart_insert('projects', project_data, user_context)
            return result
            
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise

    async def create_task(self, task_data: Dict[str, Any], user_context: Dict) -> Dict:
        """Create a new task in the database"""
        try:
            # Ensure required fields
            if 'title' not in task_data:
                raise ValueError("Task title is required")
            
            # Use smart_insert for automatic foreign key resolution
            result = await self.smart_insert('tasks', task_data, user_context)
            return result
            
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            raise

    async def add_project_member(self, project_id: str, user_id: str, role: str = 'member') -> Dict:
        """Add a member to a project"""
        try:
            member_data = {
                'project_id': project_id,
                'user_id': user_id,
                'role': role,
                'joined_at': datetime.now()
            }
            
            result = await self.smart_insert('project_members', member_data)
            return result
            
        except Exception as e:
            logger.error(f"Error adding project member: {e}")
            raise

    async def create_notification(self, notification_data: Dict[str, Any], user_context: Dict = None) -> Dict:
        """Create a new notification"""
        try:
            result = await self.smart_insert('notifications', notification_data, user_context)
            return result
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise

    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute a custom query and return results"""
        try:
            async with self.pool.acquire() as conn:
                results = await conn.fetch(query, *params)
                return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise

    async def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get data from a table with pagination"""
        try:
            async with self.pool.acquire() as conn:
                # Get primary key column for ordering
                schema = await self.get_table_schema(table_name)
                if not schema:
                    raise ValueError(f"Table {table_name} not found")
                
                pk_columns = [col['column_name'] for col in schema['columns'] if col['is_primary_key']]
                order_by = pk_columns[0] if pk_columns else 'created_at'
                
                query = f"""
                    SELECT * FROM {table_name}
                    ORDER BY {order_by} DESC
                    LIMIT $1 OFFSET $2
                """
                
                results = await conn.fetch(query, limit, offset)
                return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error getting table data: {e}")
            raise
