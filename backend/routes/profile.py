from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserSession
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/profile", tags=["Profile"])


class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    subscription_tier: Optional[str] = None


@router.get("")
def get_profile(session: Session = Depends(get_session)):
    """Get user profile"""
    user = session.exec(select(User)).first()

    if not user:
        user = User(email="trader@indiatrading.com", subscription_tier="INSTITUTIONAL")
        session.add(user)
        session.commit()
        session.refresh(user)

    return {
        "id": str(user.id),
        "email": user.email,
        "subscription_tier": user.subscription_tier,
        "created_at": user.created_at.isoformat() + "Z"
    }


@router.put("")
def update_profile(
    update: ProfileUpdate,
    session: Session = Depends(get_session)
):
    """Update user profile"""
    user = session.exec(select(User)).first()

    if not user:
        user = User(email="trader@indiatrading.com", subscription_tier="INSTITUTIONAL")
        session.add(user)

    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    session.add(user)
    session.commit()
    session.refresh(user)

    return {"ok": True}


@router.get("/sessions")
def list_sessions(session: Session = Depends(get_session)):
    """List active sessions"""
    user = session.exec(select(User)).first()

    sessions = session.exec(
        select(UserSession).order_by(UserSession.last_active.desc())
    ).all()

    if not sessions and user:
        sample_sessions = [
            UserSession(
                user_id=user.id,
                device="MacBook Pro · Chrome 127",
                location="Mumbai, IN",
                ip_address="103.21.44.12",
                last_active=datetime.utcnow(),
                is_current=True
            ),
            UserSession(
                user_id=user.id,
                device="iPhone 15 Pro · Safari",
                location="Bengaluru, IN",
                ip_address="103.21.44.88",
                last_active=datetime.utcnow() - timedelta(hours=3),
                is_current=False
            )
        ]
        for s in sample_sessions:
            session.add(s)
        session.commit()
        sessions = session.exec(
            select(UserSession).order_by(UserSession.last_active.desc())
        ).all()

    def format_rel_time(dt: datetime) -> str:
        diff_sec = (datetime.utcnow() - dt).total_seconds()
        if diff_sec < 60:
            return "Active now"
        if diff_sec < 3600:
            return f"{int(diff_sec // 60)}m ago"
        if diff_sec < 86400:
            return f"{int(diff_sec // 3600)}h ago"
        return f"{int(diff_sec // 86400)}d ago"

    return [
        {
            "id": str(s.id),
            "device": s.device,
            "location": s.location,
            "ip": s.ip_address,
            "last_active": format_rel_time(s.last_active),
            "is_current": s.is_current
        }
        for s in sessions
    ]
