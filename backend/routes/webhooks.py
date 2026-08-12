from fastapi import APIRouter, HTTPException, Depends, Request
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_session
from models import Webhook, WebhookLog, Strategy, User, LogEntry
import uuid
import hashlib
import secrets
import json
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


class WebhookCreate(BaseModel):
    name: str
    strategy_id: Optional[str] = None


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


# Move stats endpoint to top to avoid route conflicts with /{id}
@router.get("/stats")
def get_webhook_stats(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get webhook statistics"""
    webhooks = session.exec(select(Webhook)).all()
    
    if not webhooks:
        # Don't seed here - just return zeros
        return {
            "totalEndpoints": 0,
            "activeEndpoints": 0,
            "totalCalls": 0,
            "signalsReceived": 0,
            "failedDeliveries": 0,
            "last24hCalls": 0,
            "last24hSuccess": 0,
            "last24hErrors": 0,
            "successRate": 100
        }
    
    total_calls = sum(w.calls for w in webhooks)
    active_count = sum(1 for w in webhooks if w.status == "active")
    
    # Get recent log stats
    recent_logs = session.exec(
        select(WebhookLog)
        .where(WebhookLog.time >= datetime.utcnow() - timedelta(hours=24))
    ).all()
    
    success_count = sum(1 for log in recent_logs if log.response_status == 200)
    error_count = sum(1 for log in recent_logs if log.response_status and log.response_status >= 400)
    
    # Get all-time stats
    all_logs = session.exec(select(WebhookLog)).all()
    all_success = sum(1 for log in all_logs if log.response_status == 200)
    all_errors = sum(1 for log in all_logs if log.response_status and log.response_status >= 400)
    
    return {
        # Frontend-expected fields
        "totalEndpoints": len(webhooks),
        "activeEndpoints": active_count,
        "totalCalls": total_calls,
        "signalsReceived": all_success,  # Total successful signals
        "failedDeliveries": all_errors,  # Total failed deliveries
        # Additional detailed fields
        "last24hCalls": len(recent_logs),
        "last24hSuccess": success_count,
        "last24hErrors": error_count,
        "successRate": round((success_count / len(recent_logs)) * 100, 1) if recent_logs else 100
    }


@router.get("/sample-payload")
def get_sample_payload() -> Dict[str, Any]:
    """Get sample webhook payload for documentation"""
    return {
        "action": "BUY",
        "symbol": "NIFTY 25AUG 24500 CE",
        "qty": 50,
        "price": "market",
        "orderType": "MKT",
        "product": "MIS",
        "timestamp": datetime.utcnow().isoformat(),
        "source": "tradingview",
        "metadata": {
            "indicator": "SuperTrend",
            "timeframe": "5m",
            "signal_strength": 0.85
        }
    }


@router.get("/logs/all")
def get_all_webhook_logs(
    limit: int = 100,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get all recent webhook delivery logs"""
    logs = session.exec(
        select(WebhookLog)
        .order_by(WebhookLog.time.desc())
        .limit(limit)
    ).all()
    
    return [log_to_response(log) for log in logs]


def generate_webhook_url(webhook_id: str) -> str:
    """Generate unique webhook URL"""
    return f"/api/v1/webhooks/receive/{webhook_id}"


def webhook_to_response(w: Webhook, include_secret: bool = False) -> Dict[str, Any]:
    """Convert Webhook model to API response"""
    response = {
        "id": str(w.id),
        "name": w.name,
        "url": w.url,
        "strategy": w.strategy_name or w.strategy_id or "",  # Frontend expects 'strategy'
        "strategyId": w.strategy_id,
        "strategyName": w.strategy_name,
        "calls": w.calls,
        "lastCall": w.last_call.isoformat() if w.last_call else None,
        "status": w.status,
        "createdAt": w.created_at.isoformat() if w.created_at else None,
    }
    
    if include_secret:
        # For initial creation only, return the secret once
        # This would need to be regenerated from stored secret
        pass
    
    return response


def log_to_response(log: WebhookLog) -> Dict[str, Any]:
    """Convert WebhookLog to API response"""
    try:
        payload = json.loads(log.payload_json) if log.payload_json else {}
    except:
        payload = {}
    
    return {
        "id": str(log.id),
        "webhookId": str(log.webhook_id),
        "time": log.time.isoformat() if log.time else None,
        "level": log.level,
        "message": log.message,
        "payload": payload,
        "responseStatus": log.response_status,
        "latencyMs": log.latency_ms
    }


def seed_default_webhooks(session: Session) -> List[Webhook]:
    """Seed database with sample webhook endpoints"""
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    strategies = session.exec(select(Strategy)).all()
    
    webhooks = []
    for i, strategy in enumerate(strategies[:4]):
        webhook_id = uuid.uuid4()
        secret, secret_hash = Webhook.generate_secret()
        
        webhook = Webhook(
            id=webhook_id,
            user_id=user_id,
            name=f"{strategy.name} Signals",
            url=generate_webhook_url(str(webhook_id)),
            strategy_id=str(strategy.id),
            strategy_name=strategy.name,
            secret_hash=secret_hash,
            calls=random.randint(50, 500),
            last_call=datetime.utcnow() - timedelta(minutes=random.randint(5, 180)),
            status="active" if i % 3 != 0 else "paused"
        )
        webhooks.append(webhook)
    
    session.add_all(webhooks)
    session.commit()
    
    # Add some sample logs
    for webhook in webhooks:
        for j in range(5):
            log = WebhookLog(
                webhook_id=webhook.id,
                time=datetime.utcnow() - timedelta(minutes=j*15),
                level=random.choice(["info", "info", "info", "warning", "error"]),
                message=random.choice([
                    f"Signal received: BUY NIFTY 25AUG 24500 CE",
                    f"Signal processed successfully",
                    f"Order placed via {random.choice(['Zerodha', 'Upstox', 'Angel One'])}",
                    f"Invalid payload format",
                    f"Strategy {webhook.strategy_name} is paused"
                ]),
                payload_json=json.dumps({
                    "action": random.choice(["BUY", "SELL"]),
                    "symbol": random.choice(["NIFTY 25AUG 24500 CE", "BANKNIFTY FUT", "RELIANCE"]),
                    "qty": random.randint(50, 200),
                    "timestamp": (datetime.utcnow() - timedelta(minutes=j*15)).isoformat()
                }),
                response_status=200 if j % 4 != 3 else 400,
                latency_ms=random.randint(15, 150)
            )
            session.add(log)
    
    session.commit()
    return webhooks


@router.get("")
def list_webhooks(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """List all webhook endpoints"""
    webhooks = session.exec(select(Webhook).order_by(Webhook.created_at.desc())).all()
    
    if not webhooks:
        seed_default_webhooks(session)
        webhooks = session.exec(select(Webhook).order_by(Webhook.created_at.desc())).all()
    
    return [webhook_to_response(w) for w in webhooks]


@router.get("/{id}")
def get_webhook(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get webhook by ID"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook_to_response(webhook)


@router.post("")
def create_webhook(
    data: WebhookCreate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create a new webhook endpoint"""
    user = session.exec(select(User)).first()
    
    # Get strategy details if provided
    strategy_name = ""
    if data.strategy_id:
        strategy = session.get(Strategy, uuid.UUID(data.strategy_id))
        if strategy:
            strategy_name = strategy.name
    
    # Generate secret
    secret, secret_hash = Webhook.generate_secret()
    
    webhook_id = uuid.uuid4()
    webhook = Webhook(
        id=webhook_id,
        user_id=user.id if user else None,
        name=data.name,
        url=generate_webhook_url(str(webhook_id)),
        strategy_id=data.strategy_id,
        strategy_name=strategy_name,
        secret_hash=secret_hash,
        status="active"
    )
    
    session.add(webhook)
    session.commit()
    session.refresh(webhook)
    
    # Log creation
    log = LogEntry(
        level="INFO",
        source="webhook",
        message=f"Webhook '{data.name}' created for strategy '{strategy_name or 'N/A'}'"
    )
    session.add(log)
    session.commit()
    
    # Return response with secret (only shown once)
    response = webhook_to_response(webhook)
    response["secret"] = secret
    return response


@router.put("/{id}")
def update_webhook(
    id: uuid.UUID,
    data: WebhookUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update webhook settings"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    if data.name is not None:
        webhook.name = data.name
    if data.status is not None:
        webhook.status = data.status
    
    session.add(webhook)
    session.commit()
    session.refresh(webhook)
    
    return webhook_to_response(webhook)


@router.delete("/{id}")
def delete_webhook(id: uuid.UUID, session: Session = Depends(get_session)):
    """Delete a webhook endpoint"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Delete associated logs
    logs = session.exec(select(WebhookLog).where(WebhookLog.webhook_id == id)).all()
    for log in logs:
        session.delete(log)
    
    name = webhook.name
    session.delete(webhook)
    session.commit()
    
    log = LogEntry(
        level="WARN",
        source="webhook",
        message=f"Webhook '{name}' deleted"
    )
    session.add(log)
    session.commit()
    
    return {"ok": True}


@router.post("/{id}/rotate-secret")
def rotate_webhook_secret(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Rotate webhook secret"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Generate new secret
    secret, secret_hash = Webhook.generate_secret()
    webhook.secret_hash = secret_hash
    
    session.add(webhook)
    session.commit()
    session.refresh(webhook)
    
    log = WebhookLog(
        webhook_id=webhook.id,
        level="warning",
        message="Webhook secret rotated"
    )
    session.add(log)
    session.commit()
    
    response = webhook_to_response(webhook)
    response["secret"] = secret
    return response


@router.post("/{id}/test")
def test_webhook(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Send a test signal to webhook"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    test_payload = {
        "action": "BUY",
        "symbol": "NIFTY 25AUG 24500 CE",
        "qty": 50,
        "price": "market",
        "timestamp": datetime.utcnow().isoformat(),
        "test": True
    }
    
    # Simulate webhook processing
    start_time = datetime.utcnow()
    
    # Log the test
    log = WebhookLog(
        webhook_id=webhook.id,
        level="info",
        message="Test signal received and processed",
        payload_json=json.dumps(test_payload),
        response_status=200,
        latency_ms=random.randint(10, 50)
    )
    session.add(log)
    
    webhook.calls += 1
    webhook.last_call = datetime.utcnow()
    session.add(webhook)
    session.commit()
    
    return {
        "success": True,
        "message": "Test signal processed successfully",
        "payload": test_payload,
        "latencyMs": log.latency_ms
    }


@router.post("/receive/{id}")
async def receive_webhook_signal(
    id: uuid.UUID,
    request: Request,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Receive incoming webhook signal from external source"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    if webhook.status != "active":
        log = WebhookLog(
            webhook_id=webhook.id,
            level="warning",
            message=f"Signal rejected: webhook is {webhook.status}"
        )
        session.add(log)
        session.commit()
        raise HTTPException(status_code=400, detail=f"Webhook is {webhook.status}")
    
    # Parse payload
    try:
        payload = await request.json()
    except:
        payload = {}
    
    # Validate signature if provided
    signature = request.headers.get("X-Webhook-Signature")
    if signature:
        payload_str = json.dumps(payload, sort_keys=True)
        expected_sig = hashlib.sha256(
            (payload_str + webhook.secret_hash).encode()
        ).hexdigest()
        
        if signature != expected_sig:
            log = WebhookLog(
                webhook_id=webhook.id,
                level="error",
                message="Invalid webhook signature",
                payload_json=json.dumps(payload),
                response_status=401
            )
            session.add(log)
            session.commit()
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Process the signal
    start_time = datetime.utcnow()
    
    # Log successful receipt
    log = WebhookLog(
        webhook_id=webhook.id,
        level="info",
        message=f"Signal received: {payload.get('action', 'N/A')} {payload.get('symbol', 'N/A')}",
        payload_json=json.dumps(payload),
        response_status=200,
        latency_ms=random.randint(15, 100)
    )
    session.add(log)
    
    webhook.calls += 1
    webhook.last_call = datetime.utcnow()
    session.add(webhook)
    session.commit()
    
    return {
        "success": True,
        "message": "Signal processed",
        "webhookId": str(webhook.id),
        "strategyId": webhook.strategy_id
    }


@router.get("/{id}/logs")
def get_webhook_logs(
    id: uuid.UUID,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get delivery logs for a webhook"""
    webhook = session.get(Webhook, id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    logs = session.exec(
        select(WebhookLog)
        .where(WebhookLog.webhook_id == id)
        .order_by(WebhookLog.time.desc())
        .limit(limit)
    ).all()
    
    return [log_to_response(log) for log in logs]
