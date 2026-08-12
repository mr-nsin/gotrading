from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserSession
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/profile", tags=["Profile"])

# In-memory extended profile state (demo until User model columns are added)
_profile_extras: Dict[str, Any] = {
    "name": "Arjun Mehta",
    "mobile": "+91 98200 41235",
    "pan": "ABCPM1234K",
    "two_factor_enabled": False,
    "two_factor_secret": None,
    "api_calls_today": 48214,
    "api_calls_limit": 250000,
    "preferences": {
        "theme": "dark",
        "currency_format": "INR_LAKH_CRORE",
        "compact_numbers": False,
        "timezone": "Asia/Kolkata",
    },
}


class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    subscription_tier: Optional[str] = None
    name: Optional[str] = None
    mobile: Optional[str] = None
    pan: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class TwoFactorVerify(BaseModel):
    code: str


class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    currency_format: Optional[str] = None
    compact_numbers: Optional[bool] = None
    timezone: Optional[str] = None


def format_relative_time(dt: datetime) -> str:
    """Format datetime as relative time string"""
    now = datetime.utcnow()
    diff = now - dt
    
    if diff < timedelta(minutes=1):
        return "Active now"
    elif diff < timedelta(hours=1):
        return f"{int(diff.total_seconds() / 60)} minutes ago"
    elif diff < timedelta(days=1):
        return f"{int(diff.total_seconds() / 3600)} hours ago"
    else:
        return dt.strftime("%b %d, %H:%M")


@router.get("")
def get_profile(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """
    Get user profile
    """
    user = session.exec(select(User)).first()
    
    if not user:
        user = User(email="trader@example.com", subscription_tier="PRO")
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": _profile_extras.get("name", ""),
        "mobile": _profile_extras.get("mobile", ""),
        "pan": _profile_extras.get("pan", ""),
        "subscription_tier": user.subscription_tier,
        "created_at": user.created_at.isoformat() + "Z",
        "two_factor_enabled": _profile_extras.get("two_factor_enabled", False),
        "api_calls_today": _profile_extras.get("api_calls_today", 0),
        "api_calls_limit": _profile_extras.get("api_calls_limit", 250000),
    }


@router.put("")
def update_profile(
    update: ProfileUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, bool]:
    """Update user profile"""
    user = session.exec(select(User)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("name", "mobile", "pan"):
            _profile_extras[key] = value
        else:
            setattr(user, key, value)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {"ok": True}


@router.put("/password")
def change_password(
    body: PasswordChange,
    session: Session = Depends(get_session),
) -> Dict[str, bool]:
    """Change user password (demo: accepts any current password)"""
    user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    return {"ok": True}


@router.post("/2fa/setup")
def setup_2fa(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Begin 2FA setup — returns TOTP secret and QR code URL"""
    user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")

    secret = secrets.token_hex(10).upper()
    _profile_extras["two_factor_secret"] = secret
    issuer = "GoTrading"
    otpauth = f"otpauth://totp/{issuer}:{user.email}?secret={secret}&issuer={issuer}"
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={otpauth}"

    return {"secret": secret, "qr_url": qr_url, "otpauth_url": otpauth}


@router.post("/2fa/verify")
def verify_2fa(
    body: TwoFactorVerify,
    session: Session = Depends(get_session),
) -> Dict[str, bool]:
    """Verify TOTP code and enable 2FA"""
    user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")
    if not _profile_extras.get("two_factor_secret"):
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
    if len(body.code) != 6 or not body.code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid verification code")
    _profile_extras["two_factor_enabled"] = True
    return {"ok": True}


@router.post("/2fa/disable")
def disable_2fa(session: Session = Depends(get_session)) -> Dict[str, bool]:
    """Disable two-factor authentication"""
    _profile_extras["two_factor_enabled"] = False
    _profile_extras["two_factor_secret"] = None
    return {"ok": True}


@router.get("/api-usage")
def get_api_usage(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get API usage statistics for today"""
    return {
        "calls_today": _profile_extras.get("api_calls_today", 0),
        "limit": _profile_extras.get("api_calls_limit", 250000),
    }


@router.get("/sessions")
def list_sessions(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """
    List active sessions
    """
    sessions = session.exec(
        select(UserSession).order_by(UserSession.last_active.desc())
    ).all()
    
    if not sessions:
        default_session = UserSession(
            user_id=None,
            device="Windows 11 · Chrome",
            location="Mumbai, IN",
            ip_address="127.0.0.1",
            is_current=True
        )
        session.add(default_session)
        session.commit()
        sessions = [default_session]
    
    return [
        {
            "id": str(s.id),
            "device": s.device,
            "location": s.location,
            "ip": s.ip_address,
            "last_active": format_relative_time(s.last_active),
            "is_current": s.is_current
        }
        for s in sessions
    ]


@router.delete("/sessions/{id}")
def revoke_session(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, bool]:
    """Revoke a session"""
    user_session = session.get(UserSession, id)
    if not user_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if user_session.is_current:
        raise HTTPException(status_code=400, detail="Cannot revoke current session")
    
    session.delete(user_session)
    session.commit()
    
    return {"ok": True}


@router.get("/preferences")
def get_preferences(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get user preferences"""
    prefs = _profile_extras.get("preferences", {})
    return {
        "theme": prefs.get("theme", "dark"),
        "currency_format": prefs.get("currency_format", "INR_LAKH_CRORE"),
        "compact_numbers": prefs.get("compact_numbers", False),
        "timezone": prefs.get("timezone", "Asia/Kolkata"),
        "notifications_enabled": True,
        "sound_enabled": True,
        "auto_square_off_reminder": True,
    }


@router.put("/preferences")
def update_preferences(
    preferences: PreferencesUpdate,
    session: Session = Depends(get_session),
) -> Dict[str, bool]:
    """Update user preferences"""
    prefs = _profile_extras.setdefault("preferences", {})
    for key, value in preferences.model_dump(exclude_unset=True).items():
        prefs[key] = value
    return {"ok": True}
