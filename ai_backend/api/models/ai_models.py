from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, timezone

class AIQueryRequest(BaseModel):
    query: str = Field(..., description="The user's query text")
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context for the query, including conversation_id and other metadata"
    )
    options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional parameters for the query processing"
    )
    feedback: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional feedback data for the query"
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model to use for the query"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional conversation ID for context"
    )

class AIQueryResponse(BaseModel):
    response: str = Field(..., description="The AI's response text")
    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Confidence score of the response (0-1)"
    )
    processing_time: float = Field(
        default=0.0,
        ge=0.0,
        description="Time taken to process the query in seconds"
    )
    model: str = Field(
        default="meta-llama/llama-3.1-8b-instruct:free",
        description="Model used for the response"
    )
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional response data"
    )
    actions: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Suggested actions"
    )
    follow_up: Optional[List[str]] = Field(
        default=None,
        description="Follow-up questions"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation identifier"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the response"
    )

class ErrorResponse(BaseModel):
    status_code: int = Field(..., description="HTTP status code")
    message: str = Field(..., description="Error message")    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the error"
    )

class ConversationContext(BaseModel):
    conversation_id: UUID = Field(..., description="Unique identifier for the conversation")
    messages: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of conversation messages"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional conversation metadata"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the conversation was created"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the conversation was last updated"
    ) 