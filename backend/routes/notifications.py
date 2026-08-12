from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Notification, NotificationSettings
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


DEFAULT_CHANNEL_MATRIX = {
    "trades": {"in_app": True, "email": True, "telegram": False, "sms": False, "push": True},
    "risk": {"in_app": True, "email": True, "telegram": True, "sms": True, "push": True},
    "broker": {"in_app": True, "email": True, "telegram": False, "sms": False, "push": True},
    "orders": {"in_app": True, "email": False, "telegram": False, "sms": False, "push": True},
    "system": {"in_app": True, "email": False, "telegram": False, "sms": False, "push": False},
    "webhooks": {"in_app": True, "email": False, "telegram": False, "sms": False, "push": False},
}

DEFAULT_ALERT_RULES = {
    "daily_loss_threshold_pct": 2.5,
    "margin_util_threshold_pct": 70.0,
    "broker_disconnect_notify": True,
    "order_rejection_notify": True,
}


class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    trade_alerts: Optional[bool] = None
    risk_alerts: Optional[bool] = None
    broker_alerts: Optional[bool] = None
    system_alerts: Optional[bool] = None
    channel_matrix: Optional[Dict[str, Dict[str, bool]]] = None
    alert_rules: Optional[Dict[str, Any]] = None


def _parse_json_field(raw: str, default: dict) -> dict:
    if not raw or raw == "{}":
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _settings_to_response(settings: NotificationSettings) -> Dict[str, Any]:
    return {
        "email_enabled": settings.email_enabled,
        "push_enabled": settings.push_enabled,
        "trade_alerts": settings.trade_alerts,
        "risk_alerts": settings.risk_alerts,
        "broker_alerts": settings.broker_alerts,
        "system_alerts": settings.system_alerts,
        "channel_matrix": _parse_json_field(settings.channel_matrix_json, DEFAULT_CHANNEL_MATRIX),
        "alert_rules": _parse_json_field(settings.alert_rules_json, DEFAULT_ALERT_RULES),
    }


@router.get("")
def list_notifications(
    category: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """
    List notifications with optional filters
    
    Query params:
        category: "trade" | "risk" | "broker" | "system"
        unread_only: bool
        limit: int
    """
    query = select(Notification).order_by(Notification.time.desc()).limit(limit)
    
    if category:
        query = query.where(Notification.category == category)
    if unread_only:
        query = query.where(Notification.read == False)
    
    notifications = session.exec(query).all()
    
    if not notifications:
        seed_notifications = [
            Notification(
                category="trade",
                level="info",
                title="Target hit — Intraday Momentum",
                body="Booked ₹18,420 on NIFTY 25AUG 24500 CE (4 lots).",
                read=False
            ),
            Notification(
                category="risk",
                level="warning",
                title="Daily loss at 68% of limit",
                body="Aggregate loss ₹40,800 of ₹60,000 configured cap.",
                read=False
            ),
            Notification(
                category="broker",
                level="error",
                title="Broker session expired",
                body="API session dropped. Please re-authenticate.",
                read=True
            ),
            Notification(
                category="system",
                level="info",
                title="Strategy deployed",
                body="Gamma Scalping strategy is now running in paper mode.",
                read=True
            ),
            Notification(
                category="trade",
                level="info",
                title="Order executed",
                body="BUY 250 RELIANCE @ ₹2,978.40 via Paper Trading (MIS).",
                read=True
            ),
        ]
        for n in seed_notifications:
            session.add(n)
        session.commit()
        notifications = session.exec(query).all()
    
    return [
        {
            "id": str(n.id),
            "time": n.time.isoformat() + "Z",
            "category": n.category,
            "level": n.level,
            "title": n.title,
            "body": n.body,
            "read": n.read
        }
        for n in notifications
    ]


@router.put("/{id}/read")
def mark_notification_read(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, bool]:
    """Mark a notification as read"""
    notification = session.get(Notification, id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    session.add(notification)
    session.commit()
    
    return {"ok": True}


@router.post("/mark-all-read")
def mark_all_read(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Mark all notifications as read"""
    notifications = session.exec(
        select(Notification).where(Notification.read == False)
    ).all()
    
    for n in notifications:
        n.read = True
        session.add(n)
    
    session.commit()
    return {"ok": True, "count": len(notifications)}


@router.get("/settings")
def get_notification_settings(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get notification channel preferences"""
    settings = session.exec(select(NotificationSettings)).first()
    
    if not settings:
        settings = NotificationSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    
    return _settings_to_response(settings)


@router.put("/settings")
def update_notification_settings(
    update: NotificationSettingsUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update notification channel preferences"""
    settings = session.exec(select(NotificationSettings)).first()
    
    if not settings:
        settings = NotificationSettings()
    
    update_data = update.model_dump(exclude_unset=True)
    if "channel_matrix" in update_data:
        settings.channel_matrix_json = json.dumps(update_data.pop("channel_matrix"))
    if "alert_rules" in update_data:
        settings.alert_rules_json = json.dumps(update_data.pop("alert_rules"))
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    return _settings_to_response(settings)


@router.get("/unread-count")
def get_unread_count(session: Session = Depends(get_session)) -> Dict[str, int]:
    """Get count of unread notifications"""
    from sqlmodel import func
    count = session.exec(
        select(func.count(Notification.id)).where(Notification.read == False)
    ).one() or 0
    
    return {"count": count}
