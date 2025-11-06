from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any
import httpx
import json
from datetime import datetime
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import Integration, User
from ..auth import get_current_user

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Google Drive Integration
@router.post("/google-drive")
async def connect_google_drive(
    access_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Google Drive access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/drive/v3/about",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google Drive access token")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="google_drive",
            credentials=json.dumps({"access_token": access_token}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Google Drive"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Dropbox Integration
@router.post("/dropbox")
async def connect_dropbox(
    access_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Dropbox access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.dropboxapi.com/2/users/get_current_account",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Dropbox access token")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="dropbox",
            credentials=json.dumps({"access_token": access_token}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Dropbox"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GitHub Integration
@router.post("/github")
async def connect_github(
    access_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify GitHub access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {access_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid GitHub access token")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="github",
            credentials=json.dumps({"access_token": access_token}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to GitHub"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Slack Integration
@router.post("/slack")
async def connect_slack(
    access_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Slack access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if response.status_code != 200 or not response.json()["ok"]:
                raise HTTPException(status_code=400, detail="Invalid Slack access token")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="slack",
            credentials=json.dumps({"access_token": access_token}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Slack"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Jira Integration
@router.post("/jira")
async def connect_jira(
    api_token: str,
    domain: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Jira API token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{domain}/rest/api/3/myself",
                auth=(current_user.email, api_token)
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Jira credentials")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="jira",
            credentials=json.dumps({
                "api_token": api_token,
                "domain": domain
            }),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Jira"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Figma Integration
@router.post("/figma")
async def connect_figma(
    access_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Figma access token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.figma.com/v1/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Figma access token")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="figma",
            credentials=json.dumps({"access_token": access_token}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Figma"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# QuickBooks Integration
@router.post("/quickbooks")
async def connect_quickbooks(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify QuickBooks credentials
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth.platform.intuit.com/oauth2/tokens",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid QuickBooks credentials")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="quickbooks",
            credentials=json.dumps({
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token
            }),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to QuickBooks"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AutoCAD Integration
@router.post("/autocad")
async def connect_autocad(
    api_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify AutoCAD API key
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://developer.api.autodesk.com/userprofile/v1/users/@me",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid AutoCAD API key")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="autocad",
            credentials=json.dumps({"api_key": api_key}),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to AutoCAD"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Canvas LMS Integration
@router.post("/canvas")
async def connect_canvas(
    api_key: str,
    domain: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Canvas LMS credentials
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{domain}/api/v1/users/self",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Canvas LMS credentials")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="canvas",
            credentials=json.dumps({
                "api_key": api_key,
                "domain": domain
            }),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Canvas LMS"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Epic Systems Integration
@router.post("/epic")
async def connect_epic(
    client_id: str,
    client_secret: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify Epic Systems credentials
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Epic Systems credentials")

        # Store integration details
        integration = Integration(
            user_id=current_user.id,
            service="epic",
            credentials=json.dumps({
                "client_id": client_id,
                "client_secret": client_secret
            }),
            created_at=datetime.utcnow()
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"message": "Successfully connected to Epic Systems"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all integrations for current user
@router.get("/")
async def get_integrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    integrations = db.query(Integration).filter(Integration.user_id == current_user.id).all()
    return [{"id": i.service, "name": i.service.replace("_", " ").title()} for i in integrations]

# Get integration status
@router.get("/{integration_id}/status")
async def get_integration_status(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.service == integration_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"status": "connected"}

# Disconnect integration
@router.delete("/{integration_id}")
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.service == integration_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(integration)
    db.commit()
    return {"message": "Successfully disconnected integration"}

# Sync data with integration
@router.post("/{integration_id}/sync")
async def sync_data(
    integration_id: str,
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.service == integration_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    try:
        # Implement sync logic based on integration type
        if integration_id == "google_drive":
            # Sync with Google Drive
            credentials = json.loads(integration.credentials)
            async with httpx.AsyncClient() as client:
                # Implement Google Drive sync logic
                pass
        elif integration_id == "dropbox":
            # Sync with Dropbox
            credentials = json.loads(integration.credentials)
            async with httpx.AsyncClient() as client:
                # Implement Dropbox sync logic
                pass
        # Add more integration sync logic here

        return {"message": "Successfully synced data"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 