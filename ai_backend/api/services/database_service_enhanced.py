import asyncpg
import logging
import json
import uuid
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, date
from uuid import UUID

logger = logging.getLogger(__name__)

class DatabaseService:
    """Enhanced database service for AI backend with smart foreign key handling"""
    
    def __init__(self, pool: asyncpg.Pool, redis_client=None):
        self.pool = pool
        self.redis = redis_client
        self._schema_cache = {}
        self._table_relationships = {}
    
    async def initialize(self):
        """Initialize the database service and cache table schemas"""
        try:
            await self._cache_all_schemas()
            await self._build_relationship_map()
            logger.info("Database service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database service: {e}")
            raise
    
    async def _cache_all_schemas(self):
        """Cache all table schemas for faster lookups"""
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
                    schema = await self._get_table_schema(conn, table_name)
                    self._schema_cache[table_name] = schema
                
                logger.info(f"Cached schemas for {len(self._schema_cache)} tables")
        except Exception as e:
            logger.error(f"Error caching table schemas: {e}")
            raise
    
    async def _get_table_schema(self, conn: asyncpg.Connection, table_name: str) -> Dict:
        """Get detailed table schema including constraints and relationships"""
        try:
            # Get column information
            columns = await conn.fetch("""
                SELECT 
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    c.character_maximum_length,
                    c.numeric_precision,
                    c.numeric_scale,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = $1 
                        AND tc.constraint_type = 'PRIMARY KEY'
                        AND tc.table_schema = 'public'
                ) pk ON c.column_name = pk.column_name
                WHERE c.table_name = $1 AND c.table_schema = 'public'
                ORDER BY c.ordinal_position
            """, table_name)
            
            # Get foreign key constraints
            foreign_keys = await conn.fetch("""
                SELECT 
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_name = $1 
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
            """, table_name)
            
            return {
                'columns': [dict(col) for col in columns],
                'foreign_keys': [dict(fk) for fk in foreign_keys],
                'required_fields': [col['column_name'] for col in columns 
                                  if col['is_nullable'] == 'NO' and col['column_default'] is None],
                'optional_fields': [col['column_name'] for col in columns 
                                  if col['is_nullable'] == 'YES' or col['column_default'] is not None]
            }
        except Exception as e:
            logger.error(f"Error getting schema for table {table_name}: {e}")
            return {}
    
    async def _build_relationship_map(self):
        """Build a map of table relationships for smart foreign key resolution"""
        try:
            for table_name, schema in self._schema_cache.items():
                relationships = {}
                for fk in schema.get('foreign_keys', []):
                    relationships[fk['column_name']] = {
                        'table': fk['foreign_table_name'],
                        'column': fk['foreign_column_name']
                    }
                self._table_relationships[table_name] = relationships
            
            logger.info(f"Built relationship map for {len(self._table_relationships)} tables")
        except Exception as e:
            logger.error(f"Error building relationship map: {e}")
    
    async def get_table_schema(self, table_name: str) -> Dict:
        """Get cached table schema or fetch if not available"""
        if table_name not in self._schema_cache:
            async with self.pool.acquire() as conn:
                schema = await self._get_table_schema(conn, table_name)
                self._schema_cache[table_name] = schema
        
        return self._schema_cache.get(table_name, {})
    
    async def resolve_foreign_key_value(self, table_name: str, column_name: str, value: Any, user_context: Dict = None) -> Optional[str]:
        """Intelligently resolve foreign key values based on context"""
        try:
            if not value:
                return None
            
            # If it's already a UUID, return as string
            if isinstance(value, (uuid.UUID, str)) and self._is_valid_uuid(str(value)):
                return str(value)
            
            # Get the foreign key relationship
            relationships = self._table_relationships.get(table_name, {})
            if column_name not in relationships:
                return str(value)
            
            foreign_table = relationships[column_name]['table']
            
            # Special handling for different foreign key types
            if foreign_table == 'users':
                return await self._resolve_user_reference(value, user_context)
            elif foreign_table == 'admins':
                return await self._resolve_admin_reference(value, user_context)
            elif foreign_table == 'companies':
                return await self._resolve_company_reference(value, user_context)
            elif foreign_table == 'projects':
                return await self._resolve_project_reference(value, user_context)
            else:
                # Generic foreign key resolution
                return await self._generic_foreign_key_resolution(foreign_table, value)
                
        except Exception as e:
            logger.error(f"Error resolving foreign key {column_name} for table {table_name}: {e}")
            return str(value) if value else None
    
    async def _resolve_user_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve user reference from various input types"""
        try:
            # If user_context is provided and value indicates current user
            if user_context and (value in ['me', 'current', 'self'] or not value):
                return str(user_context.get('id'))
            
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                # Verify the user exists
                async with self.pool.acquire() as conn:
                    user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", str(value))
                    return str(value) if user else None
            
            # Try to find user by email
            if '@' in str(value):
                async with self.pool.acquire() as conn:
                    user = await conn.fetchrow("SELECT id FROM users WHERE email = $1", str(value))
                    return str(user['id']) if user else None
            
            # Try to find user by username
            async with self.pool.acquire() as conn:
                user = await conn.fetchrow("SELECT id FROM users WHERE username = $1", str(value))
                return str(user['id']) if user else None
                
        except Exception as e:
            logger.error(f"Error resolving user reference {value}: {e}")
        
        return None
    
    async def _resolve_admin_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve admin reference, creating fallback admin if needed"""
        try:
            # If user_context is provided and user is admin
            if user_context and user_context.get('role') in ['admin', 'super_admin']:
                # Check if user exists in admins table
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT id FROM admins WHERE email = $1", user_context.get('email'))
                    if admin:
                        return str(admin['id'])
                    
                    # Create admin entry if doesn't exist
                    admin_id = await self._create_fallback_admin(user_context)
                    return admin_id
            
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT id FROM admins WHERE id = $1", str(value))
                    return str(value) if admin else None
            
            # Try to find admin by email
            if '@' in str(value):
                async with self.pool.acquire() as conn:
                    admin = await conn.fetchrow("SELECT id FROM admins WHERE email = $1", str(value))
                    return str(admin['id']) if admin else None
            
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
                    company = await conn.fetchrow("SELECT id FROM companies WHERE id = $1", str(value))
                    return str(value) if company else None
            
            # Try to find company by name
            async with self.pool.acquire() as conn:
                company = await conn.fetchrow("SELECT id FROM companies WHERE company_name = $1", str(value))
                return str(company['id']) if company else None
                
        except Exception as e:
            logger.error(f"Error resolving company reference {value}: {e}")
        
        return None
    
    async def _resolve_project_reference(self, value: Any, user_context: Dict = None) -> Optional[str]:
        """Resolve project reference"""
        try:
            # If it's already a valid UUID
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    project = await conn.fetchrow("SELECT id FROM projects WHERE id = $1", str(value))
                    return str(value) if project else None
            
            # Try to find project by name
            async with self.pool.acquire() as conn:
                query = "SELECT id FROM projects WHERE name = $1"
                params = [str(value)]
                
                # Filter by user's accessible projects if user context available
                if user_context:
                    query += " AND (owner_id = $2 OR id IN (SELECT project_id FROM project_members WHERE user_id = $2))"
                    params.append(str(user_context.get('id')))
                
                project = await conn.fetchrow(query, *params)
                return str(project['id']) if project else None
                
        except Exception as e:
            logger.error(f"Error resolving project reference {value}: {e}")
        
        return None
    
    async def _generic_foreign_key_resolution(self, table: str, value: Any) -> Optional[str]:
        """Generic foreign key resolution for other tables"""
        try:
            if self._is_valid_uuid(str(value)):
                async with self.pool.acquire() as conn:
                    result = await conn.fetchrow(f"SELECT id FROM {table} WHERE id = $1", str(value))
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
                    INSERT INTO admins (id, first_name, last_name, email, password, role, created_at, updated_at)
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
                admin = await conn.fetchrow("SELECT id FROM admins LIMIT 1")
                if admin:
                    return str(admin['id'])
                
                # Create default admin
                admin_id = str(uuid.uuid4())
                await conn.execute("""
                    INSERT INTO admins (id, first_name, last_name, email, password, role, created_at, updated_at)
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
            
            # Prepare the data with foreign key resolution
            processed_data = {}
            for column_name, value in data.items():
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
            logger.error(f"Processed data: {processed_data}")
            raise
    
    async def smart_update(self, table_name: str, record_id: str, data: Dict[str, Any], user_context: Dict = None) -> Dict:
        """Smart update with foreign key resolution"""
        try:
            schema = await self.get_table_schema(table_name)
            if not schema:
                raise ValueError(f"Table {table_name} not found")
            
            # Process the data similar to smart_insert
            processed_data = {}
            for column_name, value in data.items():
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
                    SELECT id, username, email, first_name, last_name
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
                user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
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
                    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
                    WHERE p.owner_id = $1 OR pm.user_id = $1
                    ORDER BY p.created_at DESC
                """, user_id)
                
                return [dict(project) for project in projects]
        except Exception as e:
            logger.error(f"Error getting user accessible projects: {e}")
            return []
    
    async def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        """Execute a raw SQL query"""
        try:
            async with self.pool.acquire() as conn:
                if params:
                    result = await conn.fetch(query, *params)
                else:
                    result = await conn.fetch(query)
                return [dict(row) for row in result]
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise
