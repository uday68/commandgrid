import os
import asyncpg
import aiohttp
import json
import re
import uuid
from datetime import datetime, timedelta, date, time
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from fastapi import (
    FastAPI, HTTPException, status, UploadFile, File, Form, 
    Request, Header, WebSocket, WebSocketDisconnect, Depends, Query
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, validator, Field
from io import BytesIO
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import matplotlib.pyplot as plt
import numpy as np
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from jose import JWTError, jwt
import zipfile
import hashlib
from enum import Enum
from typing import Literal
import base64
import asyncio
import logging

# ==================== CONFIGURATION ====================
class Config:
    DB_CONFIG = {
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "newpassword"),
        "database": os.getenv("DB_NAME", "pmt"),
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5433))
    }
    LLM_ENDPOINT = "https://api-inference.huggingface.co/models/google/flan-t5-xxl"
    HF_API_KEY = os.getenv("HF_API_KEY", "your-hf-key")
    FILE_STORAGE = "./uploads"
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_FILE_TYPES = [
        "text/plain", "application/pdf", 
        "image/png", "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel"
    ]
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRE_MINUTES = 30

# ==================== ENUMS & CONSTANTS ====================
class Role(str, Enum):
    ADMIN = "Admin"
    PROJECT_MANAGER = "Project Manager"
    DEVELOPER = "Developer"
    MEMBER = "Member"
    GUEST = "Guest"

class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class SecuritySeverity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"

# ==================== MODELS ====================
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: Role = Role.MEMBER
    company_id: Optional[int] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError("passwords do not match")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: str
    created_at: datetime
    last_active: datetime
    is_active: bool

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: str
    budget: float = Field(..., gt=0)
    start_date: datetime
    end_date: datetime
    tags: List[str] = []

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str
    due_date: datetime
    assigned_to: str
    project_id: str
    priority: Priority = Priority.MEDIUM
    estimated_hours: float = Field(None, ge=0)

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None

class SecurityScanRequest(BaseModel):
    project_id: str
    scan_type: Literal["quick", "full", "custom"]
    options: Dict[str, Any] = {}

class IntegrationConfig(BaseModel):
    service_name: str
    credentials: Dict[str, str]
    enabled: bool = True

class AIQueryRequest(BaseModel):
    query: str
    context: Dict[str, Any] = {}
    conversation_id: Optional[str] = None
    ui_preferences: Dict = Field(default_factory=lambda: {
        "theme": "light",
        "layout": "default",
        "animations_enabled": True,
        "accessibility_mode": False
    })
    user_context: Dict = Field(default_factory=lambda: {
        "role": "user",
        "preferences": {},
        "recent_actions": [],
        "session_data": {}
    })

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Analyze project timeline and suggest optimizations",
                "context": {
                    "project_id": "123",
                    "timeframe": "next_quarter"
                },
                "conversation_id": "conv_456",
                "ui_preferences": {
                    "theme": "dark",
                    "layout": "compact",
                    "animations_enabled": True,
                    "accessibility_mode": False
                },
                "user_context": {
                    "role": "project_manager",
                    "preferences": {
                        "language": "en",
                        "timezone": "UTC"
                    },
                    "recent_actions": [
                        "viewed_dashboard",
                        "created_task"
                    ],
                    "session_data": {
                        "last_active": "2024-03-20T10:00:00Z",
                        "active_project": "Project A"
                    }
                }
            }
        }

class AIQueryResponse(BaseModel):
    response: str
    data: Optional[Dict] = None
    visualizations: List[Dict] = []
    actions: List[Dict] = []
    follow_up_questions: List[str] = []
    security_alerts: List[Dict] = []
    metadata: Dict = Field(default_factory=lambda: {
        "timestamp": datetime.now().isoformat(),
        "confidence_score": 0.0,
        "processing_time": 0.0,
        "source": "ai_service"
    })
    ui_suggestions: Dict = Field(default_factory=lambda: {
        "layout": "default",
        "theme": "light",
        "components": [],
        "animations": []
    })

    class Config:
        json_schema_extra = {
            "example": {
                "response": "Task analysis completed successfully",
                "data": {
                    "complexity": "medium",
                    "estimated_hours": 8,
                    "required_skills": ["python", "fastapi"]
                },
                "visualizations": [{
                    "type": "progress_chart",
                    "data": "base64_encoded_image",
                    "format": "png",
                    "dimensions": {"width": 800, "height": 400},
                    "theme": "light"
                }],
                "actions": [{
                    "type": "create_subtask",
                    "label": "Create Subtask",
                    "icon": "add_circle",
                    "priority": "high"
                }],
                "follow_up_questions": [
                    "Would you like to assign this task to a team member?",
                    "Should I schedule a review meeting?"
                ],
                "security_alerts": [{
                    "level": "warning",
                    "message": "Potential security concern detected",
                    "code": "SEC-001"
                }],
                "metadata": {
                    "timestamp": "2024-03-20T10:30:00Z",
                    "confidence_score": 0.95,
                    "processing_time": 0.5,
                    "source": "ai_service"
                },
                "ui_suggestions": {
                    "layout": "dashboard",
                    "theme": "dark",
                    "components": [
                        {
                            "type": "card",
                            "title": "Task Overview",
                            "content": "task_details",
                            "position": "top"
                        },
                        {
                            "type": "chart",
                            "title": "Progress Tracking",
                            "content": "progress_data",
                            "position": "right"
                        }
                    ],
                    "animations": [
                        {
                            "type": "fade_in",
                            "duration": 0.3,
                            "delay": 0.1
                        }
                    ]
                }
            }
        }

class Token(BaseModel):
    access_token: str
    token_type: str

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    meeting_date: date
    meeting_time: time
    agenda: str
    participants: List[str] = []
    files: List[UploadFile] = []

class NotificationCreate(BaseModel):
    message: str
    user_id: str
    is_read: bool = False

class CalendarEventCreate(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    location: str = None
    is_all_day: bool = False

class FileCreate(BaseModel):
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str

class MessageCreate(BaseModel):
    room: str
    message: str
    file_id: Optional[str] = None

class ReportCreate(BaseModel):
    title: str
    content: str
    project_id: str
    recipient_id: int

class SecurityFinding(BaseModel):
    threat_name: str
    description: str
    severity: SecuritySeverity

class VisualizationConfig(BaseModel):
    type: str
    data: Dict
    format: str = "png"
    dimensions: Dict = Field(default_factory=lambda: {"width": 800, "height": 400})
    theme: str = "light"
    interactivity: Dict = Field(default_factory=lambda: {
        "zoom": True,
        "pan": True,
        "tooltips": True
    })
    accessibility: Dict = Field(default_factory=lambda: {
        "alt_text": "",
        "aria_label": "",
        "keyboard_navigation": True
    })

class UIAction(BaseModel):
    type: str
    label: str
    icon: Optional[str] = None
    priority: str = "medium"
    confirmation_required: bool = False
    confirmation_message: Optional[str] = None
    success_message: Optional[str] = None
    error_message: Optional[str] = None
    callback_url: Optional[str] = None
    parameters: Dict = Field(default_factory=dict)

class SecurityAlert(BaseModel):
    level: str
    message: str
    code: str
    severity: str = "medium"
    affected_components: List[str] = []
    recommended_actions: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class Metadata(BaseModel):
    timestamp: datetime
    confidence_score: float
    processing_time: float
    source: str
    version: str = "1.0"
    model_version: Optional[str] = None
    cache_status: Optional[str] = None
    performance_metrics: Dict = Field(default_factory=dict)

class UISuggestions(BaseModel):
    layout: str
    theme: str
    components: List[Dict]
    animations: List[Dict]
    responsive_breakpoints: Dict = Field(default_factory=lambda: {
        "mobile": 320,
        "tablet": 768,
        "desktop": 1024
    })
    accessibility_features: Dict = Field(default_factory=lambda: {
        "high_contrast": False,
        "large_text": False,
        "screen_reader": False
    })

# ==================== SERVICES ====================
class DatabaseManager:
    def __init__(self):
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(**Config.DB_CONFIG)
        await self._initialize_db()

    async def _initialize_db(self):
        """Initialize database with provided schema"""
        async with self.pool.acquire() as conn:
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
                await conn.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"")
            except Exception:
                pass

    @staticmethod
    def format_id(id_str: str) -> str:
        if not id_str:
            return None
        try:
            UUID(id_str)
            return id_str
        except ValueError:
            return f"00000000-0000-0000-0000-{str(id_str).zfill(12)}"

    @staticmethod
    def _hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    async def authenticate_user(self, email: str, password: str):
        async with self.pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1", email
            )
            if not user:
                return None
            if not self._verify_password(password, user['password_hash']):
                return None
            return user

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self._hash_password(plain_password) == hashed_password

    async def create_user(self, user: UserCreate):
        hashed_password = self._hash_password(user.password)
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
            """INSERT INTO users 
                (name, email, role, company_id, password_hash)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *""",
                user.name, user.email, user.role, 
                user.company_id, hashed_password
            )

    async def get_user(self, user_id: str):
        formatted_id = self.format_id(user_id)
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """SELECT u.*, array_agg(us.skill_name) AS skills
                FROM users u
                LEFT JOIN user_skills us ON u.user_id = us.user_id
                WHERE u.user_id = $1
                GROUP BY u.user_id""",
                formatted_id
            )

    async def create_project(self, project: ProjectCreate, owner_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO projects 
                (name, description, owner_id, budget, start_date, end_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *""",
                project.name, project.description, owner_id,
                project.budget, project.start_date, project.end_date
            )

    async def create_task(self, task: TaskCreate):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO tasks 
                (title, description, due_date, assigned_to, project_id, priority)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *""",
                task.title, task.description, task.due_date,
                self.format_id(task.assigned_to), 
                self.format_id(task.project_id),
                task.priority.value
            )

    async def update_task(self, task_id: str, task_data: TaskUpdate):
        async with self.pool.acquire() as conn:
            fields = []
            values = []
            for field, value in task_data.dict(exclude_unset=True).items():
                fields.append(field)
                values.append(value)
            
            if not fields:
                raise ValueError("No fields to update")
            
            set_clause = ", ".join([f"{field} = ${i+1}" for i, field in enumerate(fields)])
            query = f"""
                UPDATE tasks
                SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                WHERE task_id = ${len(fields)+1}
                RETURNING *
            """
            return await conn.fetchrow(query, *values, self.format_id(task_id))

    async def log_activity(self, user_id: str, action: str, project_id: str = None):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO activity_logs 
                (user_id, project_id, action)
                VALUES ($1, $2, $3)""",
                self.format_id(user_id), 
                self.format_id(project_id),
                action
            )

    async def get_projects_for_user(self, user_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """SELECT p.* FROM projects p
                JOIN project_members pm ON p.project_id = pm.project_id
                WHERE pm.user_id = $1""",
                self.format_id(user_id)
            )

    async def create_meeting(self, meeting: MeetingCreate, creator_id: str):
        async with self.pool.acquire() as conn:
            meeting_id = uuid.uuid4()
            await conn.execute(
                """INSERT INTO meetings 
                (meeting_id, title, meeting_date, meeting_time, agenda, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)""",
                meeting_id, meeting.title, meeting.meeting_date,
                meeting.meeting_time, meeting.agenda, self.format_id(creator_id)
            )
            
            # Add participants
            for participant in meeting.participants:
                await conn.execute(
                    """INSERT INTO meeting_participants 
                    (meeting_id, user_id) VALUES ($1, $2)""",
                    meeting_id, self.format_id(participant)
                )
            
            return meeting_id

    async def get_meeting(self, meeting_id: str):
        async with self.pool.acquire() as conn:
            meeting = await conn.fetchrow(
                """SELECT m.*, array_agg(mp.user_id) as participants
                FROM meetings m
                LEFT JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
                WHERE m.meeting_id = $1
                GROUP BY m.meeting_id""",
                self.format_id(meeting_id)
            )
            return meeting

    async def create_calendar_event(self, event: CalendarEventCreate, user_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO calendar_events 
                (title, description, event_date, end_date, location, all_day, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *""",
                event.title, event.description, event.start_date,
                event.end_date, event.location, event.is_all_day,
                self.format_id(user_id)
            )

    async def create_notification(self, notification: NotificationCreate):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO notifications 
                (user_id, message, is_read)
                VALUES ($1, $2, $3)
                RETURNING *""",
                self.format_id(notification.user_id),
                notification.message,
                notification.is_read
            )

    async def get_user_notifications(self, user_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
                self.format_id(user_id)
            )

    async def create_file_record(self, file: FileCreate, user_id: str, file_url: str):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
            """INSERT INTO files 
                (task_id, project_id, uploaded_by, file_url, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *""",
                self.format_id(file.task_id),
                self.format_id(file.project_id),
                self.format_id(user_id),
                file_url,
                file.description
            )

    async def create_message(self, message: MessageCreate, sender_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO messages 
                (room, sender_id, message, file_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *""",
                message.room,
                self.format_id(sender_id),
                message.message,
                self.format_id(message.file_id)
            )

    async def create_report(self, report: ReportCreate, author_id: str):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """INSERT INTO reports 
                (title, content, author_id, project_id, recipient_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *""",
                report.title,
                report.content,
                self.format_id(author_id),
                self.format_id(report.project_id),
                report.recipient_id
            )

    async def log_security_event(self, event_type: str, description: str, user_id: str = None):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO security_audits 
                (event_type, description, user_id)
                VALUES ($1, $2, $3)""",
                event_type,
                description,
                self.format_id(user_id) if user_id else None
            )

class SecurityService:
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self.threat_signatures = {
            "sql_injection": {"pattern": r"([';]+\s*(select|insert|update|delete|drop))", "severity": SecuritySeverity.HIGH},
            "xss": {"pattern": r"<script>.*?</script>", "severity": SecuritySeverity.HIGH}
        }

    async def scan_project(self, request: SecurityScanRequest):
        findings = []
        async with self.db_pool.acquire() as conn:
            # Scan project files
            files = await conn.fetch(
                "SELECT * FROM files WHERE project_id = $1",
                DatabaseManager.format_id(request.project_id)
            )
            
            for file in files:
                file_analysis = await self._analyze_file(file['file_url'])
                if file_analysis['threats']:
                    findings.append({
                        "file_id": str(file['file_id']),
                        "threats": file_analysis['threats'],
                        "severity": max(t['severity'] for t in file_analysis['threats'])
                    })
            
            # Check project dependencies
            dependencies = await conn.fetch(
                "SELECT * FROM project_dependencies WHERE project_id = $1",
                DatabaseManager.format_id(request.project_id)
            )
            
            for dep in dependencies:
                vulns = await self._check_vulnerabilities(dep['name'], dep['version'])
                if vulns:
                    findings.append({
                        "dependency": dep['name'],
                        "version": dep['version'],
                        "vulnerabilities": vulns,
                        "severity": max(v['severity'] for v in vulns)
                    })
        
        return {
            "scan_id": str(uuid.uuid4()),
            "project_id": request.project_id,
            "timestamp": datetime.utcnow(),
            "findings": findings,
            "overall_severity": max(f['severity'] for f in findings) if findings else SecuritySeverity.LOW
        }

    async def _analyze_file(self, file_path: str):
        threats = []
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                for threat_type, signature in self.threat_signatures.items():
                    if re.search(signature['pattern'], content, re.IGNORECASE):
                        threats.append({
                            "type": threat_type,
                            "severity": signature['severity'],
                            "matches": re.findall(signature['pattern'], content, re.IGNORECASE)
                        })
        except Exception:
            pass
        return {"threats": threats}

    async def _check_vulnerabilities(self, name: str, version: str):
        # Simulated vulnerability check
        return [{
            "cve": "CVE-2023-1234",
            "description": "Sample vulnerability",
            "severity": SecuritySeverity.HIGH
        }] if "outdated" in version else []

class IntegrationManager:
    def __init__(self):
        self.integrations = {}
        self.supported_services = ["slack", "jira", "trello", "github"]

    async def connect_service(self, config: IntegrationConfig):
        if config.service_name.lower() not in self.supported_services:
            raise ValueError(f"Unsupported service: {config.service_name}")
        
        if config.service_name.lower() == "slack":
            self.integrations["slack"] = SlackIntegration(config.credentials)
        elif config.service_name.lower() == "jira":
            self.integrations["jira"] = JiraIntegration(config.credentials)
        
        return {"status": "connected", "service": config.service_name}

    async def post_to_slack(self, channel: str, message: str):
        if "slack" not in self.integrations:
            raise ValueError("Slack integration not configured")
        return await self.integrations["slack"].post_message(channel, message)

class SlackIntegration:
    def __init__(self, credentials):
        self.webhook_url = credentials.get("webhook_url")
        self.token = credentials.get("token")

    async def post_message(self, channel, message):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.webhook_url,
                json={"text": message, "channel": channel}
            ) as resp:
                return await resp.json()

class JiraIntegration:
    def __init__(self, credentials):
        self.base_url = credentials.get("base_url")
        self.username = credentials.get("username")
        self.api_key = credentials.get("api_key")

    async def create_issue(self, project_key: str, summary: str, description: str):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/rest/api/2/issue",
                json={
                    "fields": {
                        "project": {"key": project_key},
                        "summary": summary,
                        "description": description,
                        "issuetype": {"name": "Task"}
                    }
                },
                auth=aiohttp.BasicAuth(self.username, self.api_key)
            ) as resp:
                return await resp.json()

class ReportService:
    @staticmethod
    def generate_pdf_report(data: dict):
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, "Project Management Report")
        p.setFont("Helvetica", 12)
        y = 700
        for section in data['sections']:
            p.drawString(100, y, f"{section['title']}:")
            y -= 20
            for item in section['items']:
                p.drawString(120, y, f"- {item}")
                y -= 15
            y -= 10
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_security_report(scan_results: dict):
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, "Security Scan Report")
        p.setFont("Helvetica", 12)
        y = 700
        p.drawString(100, y, f"Project ID: {scan_results['project_id']}")
        y -= 20
        p.drawString(100, y, f"Overall Severity: {scan_results['overall_severity']}")
        y -= 30
        for finding in scan_results['findings']:
            p.drawString(100, y, f"Finding: {finding.get('file_id', finding.get('dependency'))}")
            y -= 15
            p.drawString(120, y, f"Severity: {finding['severity']}")
            y -= 15
            if 'threats' in finding:
                for threat in finding['threats']:
                    p.drawString(120, y, f"- {threat['type']} ({threat['severity']})")
                    y -= 15
            y -= 10
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_project_status_report(project: dict, tasks: list):
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Header
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, f"Project Status Report: {project['name']}")
        
        # Project Info
        p.setFont("Helvetica", 12)
        y = 700
        p.drawString(100, y, f"Description: {project['description']}")
        y -= 20
        p.drawString(100, y, f"Status: {project['status']}")
        y -= 20
        p.drawString(100, y, f"Progress: {project['per_complete']}%")
        y -= 20
        p.drawString(100, y, f"Start Date: {project['start_date'].strftime('%Y-%m-%d')}")
        y -= 20
        p.drawString(100, y, f"End Date: {project['end_date'].strftime('%Y-%m-%d')}")
        y -= 30
        
        # Tasks Summary
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, y, "Tasks Summary:")
        y -= 20
        
        status_counts = {}
        for task in tasks:
            status_counts[task['status']] = status_counts.get(task['status'], 0) + 1
        
        for status, count in status_counts.items():
            p.drawString(120, y, f"{status}: {count}")
            y -= 15
        
        y -= 20
        
        # Recent Tasks
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, y, "Recent Tasks:")
        y -= 20
        
        for task in tasks[:5]:
            p.drawString(120, y, f"{task['title']} - {task['status']}")
            y -= 15
        
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer

class AIProjectAssistant:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.llm_headers = {
            "Authorization": f"Bearer {Config.HF_API_KEY}",
            "Content-Type": "application/json"
        }
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour
        self.batch_size = 10
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    async def _get_cached_response(self, cache_key: str) -> Optional[Dict]:
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return data
        return None

    async def _set_cached_response(self, cache_key: str, data: Dict):
        self.cache[cache_key] = (data, time.time())

    async def _make_llm_request(self, prompt: str, retries: int = 0) -> Dict:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    Config.LLM_ENDPOINT,
                    headers=self.llm_headers,
                    json={"inputs": prompt},
                    timeout=30
                ) as resp:
                    if resp.status != 200:
                        raise Exception(f"LLM API error: {resp.status}")
                    return await resp.json()
        except Exception as e:
            if retries < self.max_retries:
                await asyncio.sleep(self.retry_delay * (retries + 1))
                return await self._make_llm_request(prompt, retries + 1)
            raise

    async def _batch_process_tasks(self, tasks: List[Dict]) -> List[Dict]:
        results = []
        for i in range(0, len(tasks), self.batch_size):
            batch = tasks[i:i + self.batch_size]
            prompts = [self._generate_task_prompt(task) for task in batch]
            responses = await asyncio.gather(*[
                self._make_llm_request(prompt) for prompt in prompts
            ])
            results.extend(responses)
        return results

    def _generate_task_prompt(self, task: Dict) -> str:
        return f"""
        Analyze this task and provide detailed insights:
        Title: {task['title']}
        Description: {task['description']}
        Status: {task['status']}
        Priority: {task['priority']}
        
        Please provide:
        1. Complexity assessment
        2. Required skills
        3. Potential risks
        4. Dependencies
        5. Recommended approach
        """

    async def handle_request(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        try:
            query_type = self._classify_query(request.query)
            cache_key = f"{query_type}:{request.query}:{user['user_id']}"
            
            # Check cache first
            cached_response = await self._get_cached_response(cache_key)
            if cached_response:
                return AIQueryResponse(**cached_response)
            
            handler = getattr(self, f"handle_{query_type}", self.handle_general_query)
            response = await handler(request, user)
            
            # Cache the response
            await self._set_cached_response(cache_key, response.dict())
            
            return response
        except Exception as e:
            logger.error(f"Error handling request: {str(e)}")
            return AIQueryResponse(
                response="An error occurred while processing your request",
                error=str(e)
            )

    def _classify_query(self, query: str) -> str:
        query = query.lower()
        if any(word in query for word in ["create", "add", "new"]):
            return "creation"
        elif any(word in query for word in ["security", "scan", "vulnerability"]):
            return "security"
        elif any(word in query for word in ["report", "summary", "status"]):
            return "report"
        elif any(word in query for word in ["estimate", "time", "schedule"]):
            return "estimation"
        elif any(word in query for word in ["team", "member", "assign"]):
            return "team"
        elif any(word in query for word in ["guide", "help", "how to"]):
            return "guidance"
        elif any(word in query for word in ["summarize", "summarization"]):
            return "summarization"
        elif any(word in query for word in ["visualize", "chart", "graph"]):
            return "visualization"
        return "general"

    async def handle_general_query(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                Config.LLM_ENDPOINT,
                headers=self.llm_headers,
                json={"inputs": request.query}
            ) as resp:
                response = await resp.json()
                return AIQueryResponse(
                    response=response[0]['generated_text'],
                    follow_up_questions=[
                        "Would you like me to create a task for this?",
                        "Should I schedule a meeting about this?"
                    ]
                )

    async def handle_creation(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        if "task" in request.query.lower():
            parsed_data = self._parse_task_creation(request.query)
            task = TaskCreate(**parsed_data)
            created_task = await self.db_pool.fetchrow(
                """INSERT INTO tasks 
                (title, description, due_date, project_id, assigned_to, priority)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *""",
                task.title, task.description, task.due_date,
                task.project_id, task.assigned_to, task.priority
            )
            return AIQueryResponse(
                response=f"Task '{created_task['title']}' created successfully",
                actions=[{"type": "task_created", "data": dict(created_task)}]
            )
        return AIQueryResponse(response="Creation request handled")

    async def handle_estimation(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        task_id = request.context.get('task_id')
        if not task_id:
            return AIQueryResponse(response="Please specify a task ID")

        try:
            async with self.db_pool.acquire() as conn:
                task = await conn.fetchrow(
                    "SELECT * FROM tasks WHERE task_id = $1",
                    DatabaseManager.format_id(task_id)
                )
                if not task:
                    return AIQueryResponse(response="Task not found")

                # Get historical data for similar tasks
                similar_tasks = await conn.fetch(
                    """SELECT * FROM tasks 
                    WHERE title ILIKE $1 
                    AND status = 'Completed'
                    ORDER BY created_at DESC LIMIT 5""",
                    f"%{task['title']}%"
                )

                # Generate time estimate using LLM with retries
                prompt = f"""
                Estimate completion time for this task:
                Title: {task['title']}
                Description: {task['description']}
                Historical data: {json.dumps([dict(t) for t in similar_tasks])}
                
                Provide optimistic, realistic, and pessimistic estimates in hours.
                """
                
                estimates = await self._make_llm_request(prompt)
                
                # Store estimates with error handling
                try:
                    await conn.execute(
                        """INSERT INTO time_estimates 
                        (task_id, optimistic_hours, realistic_hours, pessimistic_hours)
                        VALUES ($1, $2, $3, $4)""",
                        task_id,
                        estimates[0].get('optimistic', 0),
                        estimates[0].get('realistic', 0),
                        estimates[0].get('pessimistic', 0)
                    )
                except Exception as e:
                    logger.error(f"Error storing estimates: {str(e)}")

                return AIQueryResponse(
                    response="Time estimates generated successfully",
                    data={"estimates": estimates[0]}
                )
        except Exception as e:
            logger.error(f"Error in handle_estimation: {str(e)}")
            return AIQueryResponse(
                response="Failed to generate time estimates",
                error=str(e)
            )

    async def handle_team(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        project_id = request.context.get('project_id')
        if not project_id:
            return AIQueryResponse(response="Please specify a project ID")

        try:
            async with self.db_pool.acquire() as conn:
                # Get project details with error handling
                project = await conn.fetchrow(
                    "SELECT * FROM projects WHERE project_id = $1",
                    DatabaseManager.format_id(project_id)
                )
                if not project:
                    return AIQueryResponse(response="Project not found")

                # Get all tasks and users in parallel
                tasks, users = await asyncio.gather(
                    conn.fetch(
                        "SELECT * FROM tasks WHERE project_id = $1",
                        DatabaseManager.format_id(project_id)
                    ),
                    conn.fetch(
                        """SELECT u.*, array_agg(us.skill_name) AS skills
                        FROM users u
                        LEFT JOIN user_skills us ON u.user_id = us.user_id
                        GROUP BY u.user_id"""
                    )
                )

                # Generate team recommendations using LLM
                prompt = f"""
                Suggest optimal team composition for project:
                Name: {project['name']}
                Description: {project['description']}
                Tasks: {json.dumps([dict(t) for t in tasks])}
                Available Users: {json.dumps([dict(u) for u in users])}
                
                Consider:
                1. Required skills for each task
                2. User expertise and experience
                3. Workload balance
                4. Team dynamics
                """
                
                recommendations = await self._make_llm_request(prompt)
                
                # Store recommendations with error handling
                try:
                    await conn.execute(
                        """INSERT INTO team_suggestions 
                        (project_id, content)
                        VALUES ($1, $2)""",
                        project_id,
                        json.dumps(recommendations[0])
                    )
                except Exception as e:
                    logger.error(f"Error storing recommendations: {str(e)}")

                return AIQueryResponse(
                    response="Team recommendations generated successfully",
                    data={"recommendations": recommendations[0]}
                )
        except Exception as e:
            logger.error(f"Error in handle_team: {str(e)}")
            return AIQueryResponse(
                response="Failed to generate team recommendations",
                error=str(e)
            )

    async def handle_guidance(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        task_id = request.context.get('task_id')
        if not task_id:
            return AIQueryResponse(response="Please specify a task ID")

        try:
            async with self.db_pool.acquire() as conn:
                # Get task and user skills in parallel
                task, user_skills = await asyncio.gather(
                    conn.fetchrow(
                        "SELECT * FROM tasks WHERE task_id = $1",
                        DatabaseManager.format_id(task_id)
                    ),
                    conn.fetchrow(
                        "SELECT array_agg(skill_name) FROM user_skills WHERE user_id = $1",
                        user['user_id']
                    )
                )
                
                if not task:
                    return AIQueryResponse(response="Task not found")

                # Generate implementation guide using LLM
                prompt = f"""
                Generate a detailed implementation guide for this task:
                Title: {task['title']}
                Description: {task['description']}
                Assigned to: {user['name']} with skills {user_skills['array_agg']}
                
                Please provide:
                1. Step-by-step breakdown
                2. Required resources and tools
                3. Estimated time for each step
                4. Potential challenges and solutions
                5. Best practices and tips
                """
                
                guide = await self._make_llm_request(prompt)
                
                # Store guide with error handling
                try:
                    await conn.execute(
                        """INSERT INTO task_guides 
                        (task_id, content)
                        VALUES ($1, $2)""",
                        task_id,
                        guide[0]['generated_text']
                    )
                except Exception as e:
                    logger.error(f"Error storing guide: {str(e)}")

                return AIQueryResponse(
                    response="Implementation guide generated successfully",
                    data={"guide": guide[0]['generated_text']}
                )
        except Exception as e:
            logger.error(f"Error in handle_guidance: {str(e)}")
            return AIQueryResponse(
                response="Failed to generate implementation guide",
                error=str(e)
            )

    async def handle_summarization(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        content = request.context.get('content')
        if not content:
            return AIQueryResponse(response="Please provide content to summarize")

        try:
            prompt = f"""
            Summarize this content, highlighting key points and insights:
            {content}
            
            Please provide:
            1. Main points
            2. Key insights
            3. Action items
            4. Recommendations
            """
            
            summary = await self._make_llm_request(prompt)
            return AIQueryResponse(
                response="Content summarized successfully",
                data={"summary": summary[0]['generated_text']}
            )
        except Exception as e:
            logger.error(f"Error in handle_summarization: {str(e)}")
            return AIQueryResponse(
                response="Failed to generate summary",
                error=str(e)
            )

    async def handle_visualization(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        project_id = request.context.get('project_id')
        if not project_id:
            return AIQueryResponse(response="Please specify a project ID")

        try:
            async with self.db_pool.acquire() as conn:
                # Get project metrics with error handling
                metrics = await conn.fetch(
                    """SELECT metric_type, value, recorded_at 
                    FROM project_metrics 
                    WHERE project_id = $1 
                    ORDER BY recorded_at DESC""",
                    DatabaseManager.format_id(project_id)
                )

                # Generate visualizations using matplotlib with error handling
                try:
                    plt.figure(figsize=(10, 6))
                    
                    # Create line chart for metrics over time
                    metric_types = {}
                    for metric in metrics:
                        if metric['metric_type'] not in metric_types:
                            metric_types[metric['metric_type']] = []
                        metric_types[metric['metric_type']].append(metric['value'])

                    for metric_type, values in metric_types.items():
                        plt.plot(values, label=metric_type)

                    plt.title('Project Metrics Over Time')
                    plt.xlabel('Time')
                    plt.ylabel('Value')
                    plt.legend()
                    
                    # Save plot to buffer
                    buffer = BytesIO()
                    plt.savefig(buffer, format='png')
                    buffer.seek(0)
                    plt.close()

                    return AIQueryResponse(
                        response="Visualization generated successfully",
                        visualizations=[{
                            "type": "line_chart",
                            "data": base64.b64encode(buffer.getvalue()).decode(),
                            "format": "png"
                        }]
                    )
                except Exception as e:
                    logger.error(f"Error generating visualization: {str(e)}")
                    return AIQueryResponse(
                        response="Failed to generate visualization",
                        error=str(e)
                    )
        except Exception as e:
            logger.error(f"Error in handle_visualization: {str(e)}")
            return AIQueryResponse(
                response="Failed to process visualization request",
                error=str(e)
            )

    async def handle_security_query(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        scan_results = await self.db_pool.fetch(
            """SELECT * FROM security_audits 
            WHERE project_id = $1 ORDER BY timestamp DESC LIMIT 1""",
            DatabaseManager.format_id(request.context.get('project_id'))
        )
        
        if scan_results:
            return AIQueryResponse(
                response="Latest security scan results",
                data=dict(scan_results[0]),
                security_alerts=[{"type": "vulnerability", "details": "Sample vulnerability"}]
            )
        return AIQueryResponse(response="No security issues found")

    async def handle_report(self, request: AIQueryRequest, user: Dict[str, Any]) -> AIQueryResponse:
        project_id = request.context.get('project_id')
        if not project_id:
            return AIQueryResponse(response="Please specify a project ID")
        
        async with self.db_pool.acquire() as conn:
            project = await conn.fetchrow(
                "SELECT * FROM projects WHERE project_id = $1",
                DatabaseManager.format_id(project_id)
            )
            tasks = await conn.fetch(
                "SELECT * FROM tasks WHERE project_id = $1",
                DatabaseManager.format_id(project_id)
            )
            
            if not project:
                return AIQueryResponse(response="Project not found")
            
            report = ReportService.generate_project_status_report(project, tasks)
            report_filename = f"project_{project_id}_report.pdf"
            report_path = os.path.join(Config.FILE_STORAGE, report_filename)
            
            with open(report_path, 'wb') as f:
                f.write(report.read())
            
            return AIQueryResponse(
                response=f"Report generated for project {project['name']}",
                actions=[{
                    "type": "report_generated",
                    "data": {
                        "project_id": project_id,
                        "report_path": report_path
                    }
                }]
            )

    def _parse_task_creation(self, query: str) -> Dict:
        return {
            "title": re.search(r'create task (?:called|named) "(.*?)"', query).group(1),
            "description": re.search(r'description: "(.*?)"', query).group(1),
            "due_date": datetime.now() + timedelta(days=3),
            "project_id": str(uuid.uuid4()),
            "assigned_to": str(uuid.uuid4()),
            "priority": Priority.MEDIUM
        }

    def _parse_meeting_creation(self, query: str) -> Dict:
        return {
            "title": "Team Sync",
            "meeting_date": datetime.now().date() + timedelta(days=1),
            "meeting_time": datetime.now().time(),
            "agenda": "Weekly team synchronization",
            "participants": []
        }

    def _parse_notification(self, query: str) -> Dict:
        return {
            "user_id": str(uuid.uuid4()),
            "message": re.search(r'notify (.*)', query).group(1)
        }

    def _handle_generate_report(self, query: str) -> File:
        return File("report.pdf")

    def _handle_update_project_status(self, query: str):
        pass

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        formatted_id = DatabaseManager.format_id(user_id)
        if formatted_id:
            self.active_connections[formatted_id] = websocket

    def disconnect(self, user_id: str):
        formatted_id = DatabaseManager.format_id(user_id)
        if formatted_id in self.active_connections:
            del self.active_connections[formatted_id]

    async def send_message(self, message: Dict, user_id: str):
        formatted_id = DatabaseManager.format_id(user_id)
        if formatted_id in self.active_connections:
            await self.active_connections[formatted_id].send_json(message)

    async def broadcast(self, message: Dict, exclude: List[str] = []):
        for user_id, connection in self.active_connections.items():
            if user_id not in exclude:
                await connection.send_json(message)

    async def handle_message(self, data: Dict, user_id: str):
        message_type = data.get('type')
        if message_type == 'chat':
            await self._handle_chat_message(data, user_id)
        elif message_type == 'notification':
            await self._handle_notification(data, user_id)
        elif message_type == 'meeting_update':
            await self._handle_meeting_update(data, user_id)

    async def _handle_chat_message(self, data: Dict, user_id: str):
        pass

    async def _handle_notification(self, data: Dict, user_id: str):
        notification = await app.state.db.create_notification(
            NotificationCreate(message=data['message'], user_id=data['recipient'])
        )
        await self.send_message({
            "type": "notification",
            "message": notification['message'],
            "timestamp": datetime.now().isoformat()
        }, data['recipient'])

    async def _handle_meeting_update(self, data: Dict, user_id: str):
        meeting = await app.state.db.get_meeting(data['meeting_id'])
        for participant in meeting['participants']:
            await self.send_message({
                "type": "meeting_update",
                "meeting_id": data['meeting_id'],
                "changes": data['changes']
            }, participant)

class AuthService:
    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str):
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            return payload
        except JWTError:
            return None

# ==================== FASTAPI SETUP ====================
app = FastAPI(
    title="Enterprise Project Management System",
    description="A comprehensive project management platform with AI integration",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    app.state.db = DatabaseManager()
    await app.state.db.connect()
    app.state.ai = AIProjectAssistant(app.state.db.pool)
    app.state.security = SecurityService(app.state.db.pool)
    app.state.integrations = IntegrationManager()
    app.state.ws_manager = WebSocketManager()
    scheduler.start()
    await schedule_periodic_tasks()

async def schedule_periodic_tasks():
    scheduler.add_job(
        nightly_reports,
        "cron",
        hour=3,
        name="nightly_reports"
    )
    scheduler.add_job(
        security_scans,
        "cron",
        hour=2,
        name="security_scans"
    )

# ==================== HELPER FUNCTIONS ====================
async def get_current_user(token: str = Header(...)):
    credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = AuthService.verify_token(token)
    if not payload:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = await app.state.db.get_user(user_id)
    if user is None:
        raise credentials_exception
    return user

def role_required(required_role: Role):
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if Role(user["role"]) not in [required_role, Role.ADMIN]:
            raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires {required_role.value} role"
                )
        return user
    return role_checker

# ==================== AUTH ENDPOINTS ====================
@app.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    existing_user = await app.state.db.pool.fetchrow(
        "SELECT * FROM users WHERE email = $1", user.email
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return await app.state.db.create_user(user)

@app.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: UserLogin):
    user = await app.state.db.authenticate_user(form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = AuthService.create_access_token(
        data={"sub": str(user["user_id"])},
        expires_delta=timedelta(minutes=Config.JWT_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ==================== USER ENDPOINTS ====================
@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: Dict = Depends(get_current_user)):
    return current_user

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: Dict = Depends(role_required(Role.ADMIN))):
    user = await app.state.db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ==================== PROJECT ENDPOINTS ====================
@app.post("/projects", response_model=Dict)
async def create_project(
    project: ProjectCreate,
    current_user: Dict = Depends(get_current_user)
):
    created_project = await app.state.db.create_project(project, current_user["user_id"])
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Created project {project.name}",
        created_project["project_id"]
    )
    return created_project

@app.get("/projects", response_model=List[Dict])
async def get_projects(current_user: Dict = Depends(get_current_user)):
    return await app.state.db.get_projects_for_user(current_user["user_id"])

@app.get("/projects/{project_id}", response_model=Dict)
async def get_project(project_id: str, current_user: Dict = Depends(get_current_user)):
    async with app.state.db.pool.acquire() as conn:
        project = await conn.fetchrow(
            "SELECT * FROM projects WHERE project_id = $1",
            DatabaseManager.format_id(project_id)
        )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if user has access to this project
        is_member = await conn.fetchval(
            """SELECT 1 FROM project_members 
            WHERE project_id = $1 AND user_id = $2""",
            DatabaseManager.format_id(project_id),
            DatabaseManager.format_id(current_user["user_id"])
        )
        
        if not is_member and project["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this project"
            )
        
    return project

# ==================== TASK ENDPOINTS ====================
@app.post("/tasks", response_model=Dict)
async def create_task(
    task: TaskCreate,
    current_user: Dict = Depends(get_current_user)
):
    created_task = await app.state.db.create_task(task)
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Created task {task.title}",
        task.project_id
    )
    return created_task

@app.get("/tasks/{task_id}", response_model=Dict)
async def get_task(task_id: str, current_user: Dict = Depends(get_current_user)):
    async with app.state.db.pool.acquire() as conn:
        task = await conn.fetchrow(
            "SELECT * FROM tasks WHERE task_id = $1",
            DatabaseManager.format_id(task_id)
        )
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if user has access to this task's project
        is_member = await conn.fetchval(
            """SELECT 1 FROM project_members pm
            JOIN tasks t ON pm.project_id = t.project_id
            WHERE t.task_id = $1 AND pm.user_id = $2""",
            DatabaseManager.format_id(task_id),
            DatabaseManager.format_id(current_user["user_id"])
        )
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this task"
            )
        
        return task

@app.put("/tasks/{task_id}", response_model=Dict)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: Dict = Depends(get_current_user)
):
    updated_task = await app.state.db.update_task(task_id, task_data)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Updated task {updated_task['title']}",
        updated_task["project_id"]
    )
    return updated_task

# ==================== SECURITY ENDPOINTS ====================
@app.post("/security/scan", response_model=Dict)
async def run_security_scan(
    request: SecurityScanRequest,
    current_user: Dict = Depends(role_required(Role.ADMIN))
):
    return await app.state.security.scan_project(request)

# ==================== INTEGRATION ENDPOINTS ====================
@app.post("/integrations/connect", response_model=Dict)
async def connect_integration(
    config: IntegrationConfig,
    current_user: Dict = Depends(role_required(Role.ADMIN))
):
    return await app.state.integrations.connect_service(config)

# ==================== AI ENDPOINTS ====================
@app.post("/ai/query", response_model=AIQueryResponse)
async def handle_ai_query(
    request: AIQueryRequest,
    current_user: Dict = Depends(get_current_user)
):
    return await app.state.ai.handle_request(request, current_user)

# ==================== WEBSOCKET ENDPOINTS ====================
@app.websocket("/ws/chat")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(...),
    user_id: str = Query(...)
):
    # Verify token
    payload = AuthService.verify_token(token)
    if not payload or str(payload.get("sub")) != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await app.state.ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            await app.state.ws_manager.handle_message(data, user_id)
    except WebSocketDisconnect:
        app.state.ws_manager.disconnect(user_id)

# ==================== REPORT ENDPOINTS ====================
@app.post("/reports/generate")
async def generate_report(
    report_type: str,
    filters: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    if report_type == "security":
        scan_results = await app.state.security.scan_project(
            SecurityScanRequest(
                project_id=filters.get("project_id"),
                scan_type=filters.get("scan_type", "quick")
            )
        )
        pdf = ReportService.generate_security_report(scan_results)
    else:
        pdf = ReportService.generate_pdf_report(filters)
    return StreamingResponse(
        pdf, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
    )

# ==================== FILE ENDPOINTS ====================
@app.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: str = Form(None),
    task_id: str = Form(None),
    current_user: Dict = Depends(get_current_user)
):
    if file.content_type not in Config.ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed"
        )
    
    if file.size > Config.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large"
        )
    
    # Create upload directory if it doesn't exist
    os.makedirs(Config.FILE_STORAGE, exist_ok=True)
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(Config.FILE_STORAGE, file_id)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Store file metadata in database
    async with app.state.db.pool.acquire() as conn:
        file_record = await conn.fetchrow(
            """INSERT INTO files 
            (file_id, task_id, project_id, uploaded_by, file_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *""",
            file_id,
            DatabaseManager.format_id(task_id),
            DatabaseManager.format_id(project_id),
            DatabaseManager.format_id(current_user["user_id"]),
            file_path
        )
    
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Uploaded file {file.filename}",
        project_id
    )
    
    return file_record

# ==================== MEETING ENDPOINTS ====================
@app.post("/meetings", response_model=Dict)
async def create_meeting(
    meeting: MeetingCreate,
    current_user: Dict = Depends(get_current_user)
):
    meeting_id = await app.state.db.create_meeting(meeting, current_user["user_id"])
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Created meeting: {meeting.title}",
        None
    )
    return {"meeting_id": str(meeting_id), "message": "Meeting created successfully"}

@app.get("/meetings/{meeting_id}", response_model=Dict)
async def get_meeting(
    meeting_id: str,
    current_user: Dict = Depends(get_current_user)
):
    meeting = await app.state.db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if str(current_user["user_id"]) not in meeting["participants"]:
        raise HTTPException(status_code=403, detail="Not a meeting participant")
    
    return meeting

# ==================== CALENDAR ENDPOINTS ====================
@app.post("/calendar/events", response_model=Dict)
async def create_calendar_event(
    event: CalendarEventCreate,
    current_user: Dict = Depends(get_current_user)
):
    created_event = await app.state.db.create_calendar_event(event, current_user["user_id"])
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Created calendar event: {event.title}",
        None
    )
    return created_event

# ==================== NOTIFICATION ENDPOINTS ====================
@app.get("/notifications", response_model=List[Dict])
async def get_notifications(current_user: Dict = Depends(get_current_user)):
    return await app.state.db.get_user_notifications(current_user["user_id"])

@app.post("/notifications", response_model=Dict)
async def create_notification(
    notification: NotificationCreate,
    current_user: Dict = Depends(role_required(Role.ADMIN))
):
    return await app.state.db.create_notification(notification)

# ==================== MESSAGE ENDPOINTS ====================
@app.post("/messages", response_model=Dict)
async def create_message(
    message: MessageCreate,
    current_user: Dict = Depends(get_current_user)
):
    created_message = await app.state.db.create_message(message, current_user["user_id"])
    await app.state.ws_manager.broadcast({
        "type": "message",
        "room": message.room,
        "sender": current_user["user_id"],
        "message": message.message,
        "timestamp": datetime.now().isoformat()
    })
    return created_message

# ==================== REPORT ENDPOINTS ====================
@app.post("/reports", response_model=Dict)
async def create_report(
    report: ReportCreate,
    current_user: Dict = Depends(get_current_user)
):
    created_report = await app.state.db.create_report(report, current_user["user_id"])
    await app.state.db.log_activity(
        current_user["user_id"],
        f"Created report: {report.title}",
        report.project_id
    )
    return created_report

# ==================== SECURITY ENDPOINTS ====================
@app.post("/security/findings", response_model=Dict)
async def log_security_finding(
    finding: SecurityFinding,
    current_user: Dict = Depends(role_required(Role.ADMIN))
):
    await app.state.db.log_security_event(
        "manual_finding",
        f"{finding.threat_name}: {finding.description}",
        current_user["user_id"]
    )
    return {"message": "Security finding logged successfully"}

# ==================== SCHEDULED TASKS ====================
async def nightly_reports():
    async with app.state.db.pool.acquire() as conn:
        projects = await conn.fetch("SELECT project_id FROM projects")
        for project in projects:
            await app.state.ai.handle_request(
                AIQueryRequest(
                    query="Generate nightly status report",
                    context={"project_id": str(project["project_id"])}
                ),
                {"user_id": "00000000-0000-0000-0000-000000000000", "role": "system"}
            )

async def security_scans():
    async with app.state.db.pool.acquire() as conn:
        projects = await conn.fetch("SELECT project_id FROM projects")
        for project in projects:
            scan_results = await app.state.security.scan_project(
                SecurityScanRequest(
                    project_id=str(project["project_id"]),
                    scan_type="quick"
                )
            )
            # Store results in security_audits
            await conn.execute(
                """INSERT INTO security_audits 
                (project_id, event_type, description, ai_score)
                VALUES ($1, $2, $3, $4)""",
                project["project_id"],
                "scheduled_scan",
                json.dumps(scan_results),
                scan_results.get('overall_severity', 0.0)
            )

# ==================== ERROR HANDLING ====================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )

# ==================== MAIN EXECUTION ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)