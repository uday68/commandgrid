from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
import asyncpg
import json
import os
import time

from ..main import get_current_user, app

router = APIRouter()

class NLtoSQLRequest(BaseModel):
    query: str
    parameters: Dict[str, Any] = {}
    context: Dict[str, Any] = {}
    execute: bool = False
    max_results: int = 100

class SQLResponse(BaseModel):
    sql: str
    data: List[Dict] = None
    column_names: List[str] = None
    row_count: int = 0
    execution_time: float = None
    similar_query: str = None
    similarity_score: float = None

@router.post("/nl2sql", response_model=SQLResponse)
async def natural_language_to_sql(
    request: NLtoSQLRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Convert natural language query to SQL and optionally execute it
    """
    try:
        # Check if AI service is available
        if not hasattr(app.state, 'ai') or not app.state.ai:
            raise HTTPException(
                status_code=503,
                detail="AI service is currently unavailable. Please try again later."
            )
        
        # Create the AI query request
        from ..models.ai_models import AIQueryRequest
        
        ai_request = AIQueryRequest(
            query=f"generate sql query to {request.query}",
            context=request.context
        )
        
        # Use the AI service to generate SQL
        response = await app.state.ai.query_ai(
            request=ai_request,
            user=current_user
        )
        
        if not response.data or 'sql' not in response.data:
            raise HTTPException(status_code=400, detail="Could not generate SQL for this query")
            
        sql = response.data['sql']
        result = SQLResponse(sql=sql)
        
        # Add similarity information if available
        if response.data and 'similarity_score' in response.data:
            result.similarity_score = response.data['similarity_score']
            result.similar_query = response.data.get('matched_query', '')
            
        # Execute the query if requested
        if request.execute:
            start_time = time.time()
            
            # Execute with parameters if provided
            async with app.state.db.pool.acquire() as conn:
                if request.parameters:
                    rows = await conn.fetch(sql, *request.parameters.values())
                else:
                    rows = await conn.fetch(sql)
                
            # Measure execution time
            result.execution_time = time.time() - start_time
            
            # Convert to list of dicts and get column names
            if rows:
                result.data = [dict(row) for row in rows[:request.max_results]]
                result.column_names = list(result.data[0].keys()) if result.data else []
                result.row_count = len(rows)
            else:
                result.data = []
                result.column_names = []
                result.row_count = 0
                
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing natural language query: {str(e)}"
        )

# Register this router with the main FastAPI app
def setup_routes():
    app.include_router(router, prefix="/api", tags=["SQL Generation"])
