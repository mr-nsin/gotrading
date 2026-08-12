from fastapi import APIRouter, HTTPException, Depends, Header
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_session
from models import ApiKey, User, LogEntry
import uuid
import hashlib
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/v1/api-keys", tags=["API Keys"])


AVAILABLE_SCOPES = [
    "read:strategies",
    "write:strategies",
    "read:positions",
    "write:orders",
    "read:portfolio",
    "read:reports",
    "read:webhooks",
    "write:webhooks",
    "read:*",
    "write:*",
    "*"
]


class ApiKeyCreate(BaseModel):
    label: str
    scopes: List[str] = ["read:*"]


class ApiKeyUpdate(BaseModel):
    label: Optional[str] = None
    scopes: Optional[List[str]] = None


def api_key_to_response(key: ApiKey, include_key: bool = False) -> Dict[str, Any]:
    """Convert ApiKey model to API response"""
    return {
        "id": str(key.id),
        "label": key.label,
        "keyMasked": key.key_masked,
        "scopes": key.scopes.split(",") if key.scopes else [],
        "createdAt": key.created_at.isoformat() if key.created_at else None,
        "lastUsed": key.last_used.isoformat() if key.last_used else None,
        # Only include full key on creation
        **({"key": key.key_masked} if include_key else {})
    }


def seed_default_api_keys(session: Session) -> List[ApiKey]:
    """Seed database with sample API keys"""
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    keys_data = [
        {"label": "Production Server", "scopes": ["read:*", "write:orders"]},
        {"label": "Monitoring Dashboard", "scopes": ["read:strategies", "read:positions", "read:portfolio"]},
        {"label": "TradingView Integration", "scopes": ["write:webhooks", "write:orders"]},
        {"label": "Mobile App", "scopes": ["read:*"]},
    ]
    
    keys = []
    for data in keys_data:
        key, key_hash, key_masked = ApiKey.generate_key()
        
        api_key = ApiKey(
            user_id=user_id,
            label=data["label"],
            key_hash=key_hash,
            key_masked=key_masked,
            scopes=",".join(data["scopes"]),
            last_used=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        )
        keys.append(api_key)
    
    session.add_all(keys)
    session.commit()
    return keys


@router.get("")
def list_api_keys(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """List all API keys"""
    keys = session.exec(select(ApiKey).order_by(ApiKey.created_at.desc())).all()
    
    if not keys:
        seed_default_api_keys(session)
        keys = session.exec(select(ApiKey).order_by(ApiKey.created_at.desc())).all()
    
    return [api_key_to_response(k) for k in keys]


@router.get("/scopes")
def get_available_scopes() -> List[str]:
    """Get list of available API key scopes"""
    return AVAILABLE_SCOPES


@router.get("/{id}")
def get_api_key(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get API key by ID"""
    key = session.get(ApiKey, id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return api_key_to_response(key)


@router.post("")
def create_api_key(
    data: ApiKeyCreate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create a new API key"""
    user = session.exec(select(User)).first()
    
    # Validate scopes
    for scope in data.scopes:
        if scope not in AVAILABLE_SCOPES:
            raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")
    
    # Generate key
    key, key_hash, key_masked = ApiKey.generate_key()
    
    api_key = ApiKey(
        user_id=user.id if user else None,
        label=data.label,
        key_hash=key_hash,
        key_masked=key_masked,
        scopes=",".join(data.scopes)
    )
    
    session.add(api_key)
    session.commit()
    session.refresh(api_key)
    
    # Log creation
    log = LogEntry(
        level="INFO",
        source="system",
        message=f"API key '{data.label}' created with scopes: {', '.join(data.scopes)}"
    )
    session.add(log)
    session.commit()
    
    # Return response with full key (only shown once)
    response = api_key_to_response(api_key)
    response["key"] = key
    response["message"] = "Store this key securely. It will not be shown again."
    return response


@router.put("/{id}")
def update_api_key(
    id: uuid.UUID,
    data: ApiKeyUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update API key label or scopes"""
    key = session.get(ApiKey, id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if data.label is not None:
        key.label = data.label
    
    if data.scopes is not None:
        # Validate scopes
        for scope in data.scopes:
            if scope not in AVAILABLE_SCOPES:
                raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")
        key.scopes = ",".join(data.scopes)
    
    session.add(key)
    session.commit()
    session.refresh(key)
    
    return api_key_to_response(key)


@router.delete("/{id}")
def revoke_api_key(id: uuid.UUID, session: Session = Depends(get_session)):
    """Revoke/delete an API key"""
    key = session.get(ApiKey, id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    label = key.label
    session.delete(key)
    session.commit()
    
    log = LogEntry(
        level="WARN",
        source="system",
        message=f"API key '{label}' revoked"
    )
    session.add(log)
    session.commit()
    
    return {"ok": True}


@router.post("/{id}/rotate")
def rotate_api_key(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Rotate an API key (generate new key, invalidate old)"""
    key = session.get(ApiKey, id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Generate new key
    new_key, key_hash, key_masked = ApiKey.generate_key()
    
    key.key_hash = key_hash
    key.key_masked = key_masked
    
    session.add(key)
    session.commit()
    session.refresh(key)
    
    log = LogEntry(
        level="WARN",
        source="system",
        message=f"API key '{key.label}' rotated"
    )
    session.add(log)
    session.commit()
    
    response = api_key_to_response(key)
    response["key"] = new_key
    response["message"] = "Key rotated. Store the new key securely. Old key is now invalid."
    return response


@router.post("/validate")
def validate_api_key(
    api_key: str = Header(alias="X-API-Key"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Validate an API key and return its details"""
    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Find matching key
    key = session.exec(
        select(ApiKey).where(ApiKey.key_hash == key_hash)
    ).first()
    
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Update last used
    key.last_used = datetime.utcnow()
    session.add(key)
    session.commit()
    session.refresh(key)
    
    return {
        "valid": True,
        "label": key.label,
        "scopes": key.scopes.split(",") if key.scopes else []
    }


def verify_api_key(
    required_scope: str,
    api_key: str = Header(alias="X-API-Key", default=None),
    session: Session = Depends(get_session)
) -> ApiKey:
    """Dependency to verify API key and scope for protected routes"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Find matching key
    key = session.exec(
        select(ApiKey).where(ApiKey.key_hash == key_hash)
    ).first()
    
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check scope
    scopes = key.scopes.split(",") if key.scopes else []
    
    # Check for wildcard or exact match
    has_permission = (
        "*" in scopes or
        required_scope in scopes or
        required_scope.split(":")[0] + ":*" in scopes
    )
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail=f"API key missing required scope: {required_scope}"
        )
    
    # Update last used
    key.last_used = datetime.utcnow()
    session.add(key)
    session.commit()
    
    return key


@router.get("/stats")
def get_api_key_stats(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get API key usage statistics"""
    keys = session.exec(select(ApiKey)).all()
    
    if not keys:
        seed_default_api_keys(session)
        keys = session.exec(select(ApiKey)).all()
    
    recently_used = sum(
        1 for k in keys 
        if k.last_used and k.last_used >= datetime.utcnow() - timedelta(hours=24)
    )
    
    never_used = sum(1 for k in keys if k.last_used is None)
    
    # Calculate active keys (keys used in last 7 days)
    active_keys = sum(
        1 for k in keys
        if k.last_used and k.last_used >= datetime.utcnow() - timedelta(days=7)
    )
    
    # Simulate total API calls (in production, this would be tracked)
    total_calls = sum(random.randint(100, 5000) for _ in keys) if keys else 0
    
    return {
        # Frontend-expected fields
        "totalKeys": len(keys),
        "activeKeys": active_keys,
        "totalCalls": total_calls,
        # Additional detailed fields
        "usedLast24h": recently_used,
        "neverUsed": never_used,
        "keys": [
            {
                "label": k.label,
                "lastUsed": k.last_used.isoformat() if k.last_used else None,
                "scopeCount": len(k.scopes.split(",")) if k.scopes else 0
            }
            for k in keys
        ]
    }
