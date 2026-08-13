from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Notification, NotificationSettings
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    trade_alerts: Optional[bool] = None
    risk_alerts: Optional[bool] = None
    broker_alerts: Optional[bool] = None
    system_alerts: Optional[bool] = None


@router.get("")
def list_notifications(
    category: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """List notifications with optional filters"""
    query = select(Notification).order_by(Notification.time.desc()).limit(limit)

    if category:
        query = query.where(Notification.category == category)
    if unread_only:
        query = query.where(Notification.read == False)

    notifications = session.exec(query).all()

    # Seed sample notifications if table is empty
    if not notifications and not category and not unread_only:
        sample_notifications = [
            Notification(
                time=datetime.utcnow(),
                category="trade",
                level="info",
                title="Target hit — Nifty ORB Breakout",
                body="Booked ₹18,420 on NIFTY 25AUG 24500 CE",
                read=False
            ),
            Notification(
                time=datetime.utcnow(),
                category="risk",
                level="warning",
                title="Margin Utilization High — Fyers",
                body="Broker Fyers is utilizing 78% of allocated margin limit",
                read=False
            ),
            Notification(
                time=datetime.utcnow(),
                category="broker",
                level="info",
                title="Zerodha Connected Successfully",
                body="Kite Connect session active with 42ms ping",
                read=True
            ),
            Notification(
                time=datetime.utcnow(),
                category="system",
                level="info",
                title="System Backup Completed",
                body="Automated database snapshot saved successfully",
                read=True
            )
        ]
        for n in sample_notifications:
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
def mark_notification_read(id: uuid.UUID, session: Session = Depends(get_session)):
    """Mark a notification as read"""
    notification = session.get(Notification, id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.read = True
    session.add(notification)
    session.commit()

    return {"ok": True}


@router.post("/mark-all-read")
def mark_all_read(session: Session = Depends(get_session)):
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
def get_notification_settings(session: Session = Depends(get_session)):
    """Get notification channel preferences"""
    settings = session.exec(select(NotificationSettings)).first()

    if not settings:
        settings = NotificationSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)

    return {
        "email_enabled": settings.email_enabled,
        "push_enabled": settings.push_enabled,
        "trade_alerts": settings.trade_alerts,
        "risk_alerts": settings.risk_alerts,
        "broker_alerts": settings.broker_alerts,
        "system_alerts": settings.system_alerts
    }


@router.put("/settings")
def update_notification_settings(
    update: NotificationSettingsUpdate,
    session: Session = Depends(get_session)
):
    """Update notification channel preferences"""
    settings = session.exec(select(NotificationSettings)).first()

    if not settings:
        settings = NotificationSettings()

    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    session.add(settings)
    session.commit()
    session.refresh(settings)

    return {"ok": True}
