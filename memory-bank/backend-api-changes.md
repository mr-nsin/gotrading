# Backend API Changes for UI Migration

**Purpose:** Detailed specification of all backend changes required to support the algo-desk-central UI

---

## Summary of Changes

| Category | New Endpoints | Modified Endpoints | New Tables | Modified Tables |
|----------|---------------|-------------------|------------|-----------------|
| Dashboard | 3 | 0 | 0 | 0 |
| Strategies | 0 | 4 | 0 | 1 |
| Brokers | 1 | 2 | 0 | 1 |
| Positions | 0 | 1 | 0 | 1 |
| Orders | 0 | 1 | 0 | 1 |
| Logs | 0 | 1 | 0 | 1 |
| Notifications | 4 | 0 | 2 | 0 |
| Profile | 3 | 0 | 1 | 1 |
| Stream | 0 | 1 | 0 | 0 |
| **Total** | **11** | **10** | **3** | **6** |

---

## 1. NEW: Dashboard Routes

### File: `backend/routes/dashboard.py`

```python
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from database import get_session
from models import (
    Strategy, BrokerCredential, VirtualPortfolio, 
    VirtualTrade, Order, RiskSettings
)
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

# ============================================================
# GET /api/v1/dashboard/totals
# ============================================================
@router.get("/totals")
def get_dashboard_totals(session: Session = Depends(get_session)):
    """
    Aggregated metrics for dashboard KPI cards
    
    Response:
    {
        "portfolioValue": float,
        "deployed": float,
        "todayPnl": float,
        "todayPnlPct": float,
        "overallPnl": float,
        "overallPnlPct": float,
        "activeStrategies": int,
        "totalStrategies": int,
        "openPositions": int,
        "winRate": float,
        "maxDrawdown": float,
        "marginAvailable": float,
        "marginUsed": float,
        "funds": float
    }
    """
    # Get all strategies
    strategies = session.exec(select(Strategy)).all()
    
    # Get portfolio
    portfolio = session.exec(select(VirtualPortfolio)).first()
    
    # Get all brokers
    brokers = session.exec(select(BrokerCredential)).all()
    
    # Get open positions
    open_positions = session.exec(
        select(func.count(VirtualTrade.id))
        .where(VirtualTrade.status == "OPEN")
    ).one()
    
    # Calculate totals
    funds = sum(b.funds for b in brokers) if brokers else (portfolio.total_capital if portfolio else 0)
    margin_used = sum(b.margin_used for b in brokers) if brokers else 0
    margin_available = sum(b.margin_available for b in brokers) if brokers else (portfolio.available_margin if portfolio else 0)
    
    today_pnl = sum(s.todays_pnl for s in strategies)
    overall_pnl = sum(s.total_pnl for s in strategies)
    deployed = sum(s.capital_deployed for s in strategies if s.status == "RUNNING")
    
    active_strategies = len([s for s in strategies if s.status == "RUNNING"])
    
    # Calculate win rate from completed trades
    total_trades = sum(s.total_trades for s in strategies)
    wins = sum(int(s.total_trades * s.win_rate) for s in strategies)
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    
    # Get max drawdown
    risk = session.exec(select(RiskSettings)).first()
    max_drawdown = risk.circuit_breaker_threshold if risk else 5.0
    
    return {
        "portfolioValue": funds + overall_pnl,
        "deployed": deployed,
        "todayPnl": today_pnl,
        "todayPnlPct": (today_pnl / funds * 100) if funds > 0 else 0,
        "overallPnl": overall_pnl,
        "overallPnlPct": (overall_pnl / funds * 100) if funds > 0 else 0,
        "activeStrategies": active_strategies,
        "totalStrategies": len(strategies),
        "openPositions": open_positions,
        "winRate": round(win_rate, 1),
        "maxDrawdown": max_drawdown,
        "marginAvailable": margin_available,
        "marginUsed": margin_used,
        "funds": funds
    }

# ============================================================
# GET /api/v1/dashboard/equity-curve
# ============================================================
@router.get("/equity-curve")
def get_equity_curve(
    range: str = "3M",
    session: Session = Depends(get_session)
):
    """
    Equity curve data points for charting
    
    Query params:
        range: "1D" | "1W" | "1M" | "3M" | "1Y" | "All"
    
    Response:
    [
        {"date": "2026-08-01", "equity": 4200000, "pnl": 50000},
        ...
    ]
    """
    # Get portfolio base
    portfolio = session.exec(select(VirtualPortfolio)).first()
    base_capital = portfolio.total_capital if portfolio else 1000000
    
    # Calculate date range
    range_days = {
        "1D": 1, "1W": 7, "1M": 30, 
        "3M": 90, "1Y": 365, "All": 730
    }
    days = range_days.get(range, 90)
    
    # Get historical trades for P&L calculation
    cutoff = datetime.utcnow() - timedelta(days=days)
    trades = session.exec(
        select(VirtualTrade)
        .where(VirtualTrade.closed_at >= cutoff)
        .order_by(VirtualTrade.closed_at)
    ).all()
    
    # Build equity curve from trades
    # (In production, store daily snapshots in a separate table)
    curve = []
    equity = base_capital
    current_date = cutoff.date()
    end_date = datetime.utcnow().date()
    
    trade_map = {}
    for t in trades:
        if t.closed_at:
            d = t.closed_at.date()
            trade_map.setdefault(d, []).append(t)
    
    while current_date <= end_date:
        daily_pnl = sum(t.pnl for t in trade_map.get(current_date, []))
        equity += daily_pnl
        curve.append({
            "date": current_date.isoformat(),
            "equity": round(equity, 0),
            "pnl": round(equity - base_capital, 0)
        })
        current_date += timedelta(days=1)
    
    return curve

# ============================================================
# GET /api/v1/dashboard/intraday-curve
# ============================================================
@router.get("/intraday-curve")
def get_intraday_curve(session: Session = Depends(get_session)):
    """
    Today's intraday P&L curve (5-minute intervals)
    
    Response:
    [
        {"time": "09:15", "equity": 4200000, "pnl": 0},
        {"time": "09:20", "equity": 4203500, "pnl": 3500},
        ...
    ]
    """
    portfolio = session.exec(select(VirtualPortfolio)).first()
    base = portfolio.total_capital if portfolio else 1000000
    
    # Get today's trades
    today = datetime.utcnow().date()
    trades = session.exec(
        select(VirtualTrade)
        .where(VirtualTrade.created_at >= datetime.combine(today, datetime.min.time()))
    ).all()
    
    # Build intraday curve
    # (In production, aggregate from tick-level P&L snapshots)
    curve = []
    equity = base
    
    # Generate 5-minute intervals from market open (09:15) to close (15:30)
    for minutes in range(0, 375, 5):  # 375 minutes = 6.25 hours
        hour = 9 + (minutes + 15) // 60
        minute = (minutes + 15) % 60
        
        if hour > 15 or (hour == 15 and minute > 30):
            break
            
        time_str = f"{hour:02d}:{minute:02d}"
        
        # Sum P&L for trades up to this time
        # (Simplified - real implementation would use tick data)
        pnl = sum(t.pnl for t in trades if t.created_at and t.created_at.hour <= hour)
        
        curve.append({
            "time": time_str,
            "equity": round(base + pnl, 0),
            "pnl": round(pnl, 0)
        })
    
    return curve
```

---

## 2. NEW: Notifications Routes

### File: `backend/routes/notifications.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Notification, NotificationSettings
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    trade_alerts: Optional[bool] = None
    risk_alerts: Optional[bool] = None
    broker_alerts: Optional[bool] = None
    system_alerts: Optional[bool] = None

# ============================================================
# GET /api/v1/notifications
# ============================================================
@router.get("")
def list_notifications(
    category: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """
    List notifications with optional filters
    
    Query params:
        category: "trade" | "risk" | "broker" | "system"
        unread_only: bool
        limit: int
    
    Response:
    [
        {
            "id": "uuid",
            "time": "2026-08-10T14:30:00Z",
            "category": "trade",
            "level": "info",
            "title": "Target hit — Nifty ORB Breakout",
            "body": "Booked ₹18,420 on NIFTY 25AUG 24500 CE",
            "read": false
        }
    ]
    """
    query = select(Notification).order_by(Notification.time.desc()).limit(limit)
    
    if category:
        query = query.where(Notification.category == category)
    if unread_only:
        query = query.where(Notification.read == False)
    
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

# ============================================================
# PUT /api/v1/notifications/{id}/read
# ============================================================
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

# ============================================================
# POST /api/v1/notifications/mark-all-read
# ============================================================
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

# ============================================================
# GET /api/v1/notifications/settings
# ============================================================
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

# ============================================================
# PUT /api/v1/notifications/settings
# ============================================================
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
```

---

## 3. NEW: Profile Routes

### File: `backend/routes/profile.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserSession, NotificationSettings
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/v1/profile", tags=["Profile"])

class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    subscription_tier: Optional[str] = None

# ============================================================
# GET /api/v1/profile
# ============================================================
@router.get("")
def get_profile(session: Session = Depends(get_session)):
    """
    Get user profile
    
    Response:
    {
        "id": "uuid",
        "email": "user@example.com",
        "subscription_tier": "PRO",
        "created_at": "2026-01-15T10:00:00Z"
    }
    """
    user = session.exec(select(User)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "subscription_tier": user.subscription_tier,
        "created_at": user.created_at.isoformat() + "Z"
    }

# ============================================================
# PUT /api/v1/profile
# ============================================================
@router.put("")
def update_profile(
    update: ProfileUpdate,
    session: Session = Depends(get_session)
):
    """Update user profile"""
    user = session.exec(select(User)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No user profile found")
    
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {"ok": True}

# ============================================================
# GET /api/v1/profile/sessions
# ============================================================
@router.get("/sessions")
def list_sessions(session: Session = Depends(get_session)):
    """
    List active sessions
    
    Response:
    [
        {
            "id": "uuid",
            "device": "MacBook Pro · Chrome",
            "location": "Mumbai, IN",
            "ip": "103.21.44.12",
            "last_active": "Active now",
            "is_current": true
        }
    ]
    """
    sessions = session.exec(
        select(UserSession).order_by(UserSession.last_active.desc())
    ).all()
    
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

# ============================================================
# DELETE /api/v1/profile/sessions/{id}
# ============================================================
@router.delete("/sessions/{id}")
def revoke_session(id: uuid.UUID, session: Session = Depends(get_session)):
    """Revoke a session"""
    user_session = session.get(UserSession, id)
    if not user_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.delete(user_session)
    session.commit()
    
    return {"ok": True}

def format_relative_time(dt):
    """Format datetime as relative time string"""
    from datetime import datetime, timedelta
    
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
```

---

## 4. MODIFY: Strategies Routes

### File: `backend/routes/strategies.py`

Add to response model:

```python
# Enhanced Strategy Response
class StrategyResponse(BaseModel):
    id: str
    name: str
    type: str
    instrument: str
    status: str
    
    # NEW fields for UI
    segment: str = "Options"
    description: Optional[str] = None
    brokers: List[str] = []
    todayPnl: float = 0.0
    overallPnl: float = 0.0
    openPositions: int = 0
    capital: float = 0.0
    winRate: float = 0.0
    sharpe: float = 0.0
    maxDd: float = 0.0
    trades: int = 0
    lastSignal: Optional[str] = None
    mode: str = "Paper"
    instruments: List[str] = []
    entryRules: List[dict] = []
    exitRules: List[dict] = []
    risk: dict = {}
    sizing: dict = {}
    schedule: dict = {}
    webhook: bool = False
    spark: List[float] = []

# Modify list_strategies to include new fields
@router.get("", response_model=List[StrategyResponse])
def list_strategies(session: Session = Depends(get_session)):
    strategies = session.exec(select(Strategy)).all()
    
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "type": s.type,
            "instrument": s.instrument,
            "status": s.status.lower(),  # UI expects lowercase
            "segment": s.segment,
            "description": s.description,
            "brokers": json.loads(s.brokers_json) if s.brokers_json else [],
            "todayPnl": s.todays_pnl,
            "overallPnl": s.total_pnl,
            "openPositions": s.open_positions,
            "capital": s.capital_allocated,
            "winRate": s.win_rate * 100,  # Convert to percentage
            "sharpe": s.sharpe_ratio,
            "maxDd": s.max_drawdown,
            "trades": s.total_trades,
            "lastSignal": s.last_signal.isoformat() if s.last_signal else None,
            "mode": s.mode,
            "instruments": json.loads(s.instruments_json) if s.instruments_json else [],
            "entryRules": json.loads(s.entry_rules_json) if s.entry_rules_json else [],
            "exitRules": json.loads(s.exit_rules_json) if s.exit_rules_json else [],
            "risk": json.loads(s.risk_json) if s.risk_json else {},
            "sizing": json.loads(s.sizing_json) if s.sizing_json else {},
            "schedule": json.loads(s.schedule_json) if s.schedule_json else {},
            "webhook": s.webhook_enabled,
            "spark": json.loads(s.spark_data_json) if s.spark_data_json else []
        }
        for s in strategies
    ]
```

---

## 5. MODIFY: Brokers Routes

### File: `backend/routes/brokers.py`

Enhanced response:

```python
@router.get("")
def list_brokers(session: Session = Depends(get_session)):
    brokers = session.exec(select(BrokerCredential)).all()
    
    return [
        {
            "id": str(b.id),
            "name": get_broker_name(b),
            "code": b.code or get_broker_code(b),
            "status": b.connection_status or "disconnected",
            "apiKeyMasked": mask_key(get_api_key(b)),
            "tokenExpiry": format_expiry(b.token_expiry),
            "funds": b.funds,
            "marginUsed": b.margin_used,
            "marginAvailable": b.margin_available,
            "strategies": count_broker_strategies(session, str(b.id)),
            "clientId": b.client_id or "",
            "autoSquareOff": b.auto_square_off,
            "maxDailyLoss": b.max_daily_loss,
            "maxMarginUtil": b.max_margin_util,
            "maxPositions": b.max_positions,
            "leverageCap": b.leverage_cap
        }
        for b in brokers
        if has_credentials(b)
    ]

def get_broker_code(b):
    if b.zerodha_api_key: return "KITE"
    if b.fyers_app_id: return "FYERS-V3"
    if b.angelone_api_key: return "SMARTAPI"
    if b.dhan_client_id: return "DHANHQ"
    return "UNKNOWN"

def mask_key(key):
    if not key or len(key) < 8:
        return "••••••••"
    return f"{key[:4]}••••••{key[-4:]}"

def format_expiry(dt):
    if not dt:
        return "Unknown"
    from datetime import datetime
    if dt < datetime.utcnow():
        return "Expired"
    return dt.strftime("%d %b %Y, %H:%M")

def count_broker_strategies(session, broker_id):
    # Count strategies using this broker
    strategies = session.exec(select(Strategy)).all()
    count = 0
    for s in strategies:
        brokers = json.loads(s.brokers_json) if s.brokers_json else []
        if broker_id in brokers:
            count += 1
    return count
```

Add new endpoint:

```python
# ============================================================
# GET /api/v1/brokers/{id}
# ============================================================
@router.get("/{id}")
def get_broker_detail(id: uuid.UUID, session: Session = Depends(get_session)):
    """Get detailed broker information including per-broker risk settings"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    # Get associated strategies
    strategies = session.exec(select(Strategy)).all()
    broker_strategies = []
    for s in strategies:
        brokers = json.loads(s.brokers_json) if s.brokers_json else []
        if str(id) in brokers:
            broker_strategies.append({
                "id": str(s.id),
                "name": s.name,
                "status": s.status,
                "todayPnl": s.todays_pnl
            })
    
    return {
        "id": str(broker.id),
        "name": get_broker_name(broker),
        "code": broker.code or get_broker_code(broker),
        "status": broker.connection_status or "disconnected",
        "apiKeyMasked": mask_key(get_api_key(broker)),
        "tokenExpiry": format_expiry(broker.token_expiry),
        "funds": broker.funds,
        "marginUsed": broker.margin_used,
        "marginAvailable": broker.margin_available,
        "clientId": broker.client_id or "",
        "autoSquareOff": broker.auto_square_off,
        "maxDailyLoss": broker.max_daily_loss,
        "maxMarginUtil": broker.max_margin_util,
        "maxPositions": broker.max_positions,
        "leverageCap": broker.leverage_cap,
        "strategies": broker_strategies,
        "lastConnected": broker.last_connected.isoformat() if broker.last_connected else None
    }
```

---

## 6. MODIFY: main.py

Register new routers:

```python
# backend/main.py

from routes import (
    auth, strategies, orders, positions, brokers, 
    risk, logs, backtest, settings, stream,
    dashboard,      # NEW
    notifications,  # NEW
    profile         # NEW
)

# ... existing setup ...

app.include_router(auth.router)
app.include_router(strategies.router)
app.include_router(orders.router)
app.include_router(positions.router)
app.include_router(brokers.router)
app.include_router(risk.router)
app.include_router(logs.router)
app.include_router(backtest.router)
app.include_router(settings.router)
app.include_router(stream.router)

# NEW routers
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(profile.router)
```

---

## 7. Database Model Changes

### File: `backend/models.py`

```python
# ADD new fields to Strategy
class Strategy(SQLModel, table=True):
    # ... existing fields ...
    
    # NEW fields
    segment: str = Field(default="Options")
    description: Optional[str] = None
    brokers_json: str = Field(default='[]')
    open_positions: int = Field(default=0)
    last_signal: Optional[datetime] = None
    mode: str = Field(default="Paper")
    instruments_json: str = Field(default='[]')
    entry_rules_json: str = Field(default='[]')
    exit_rules_json: str = Field(default='[]')
    risk_json: str = Field(default='{}')
    sizing_json: str = Field(default='{}')
    webhook_enabled: bool = Field(default=False)
    spark_data_json: str = Field(default='[]')

# ADD new fields to BrokerCredential
class BrokerCredential(BrokerCredentialBase, table=True):
    # ... existing fields ...
    
    # NEW fields
    code: Optional[str] = None
    token_expiry: Optional[datetime] = None
    funds: float = Field(default=0.0)
    margin_used: float = Field(default=0.0)
    margin_available: float = Field(default=0.0)
    client_id: Optional[str] = None
    auto_square_off: str = Field(default="15:20")
    max_daily_loss: float = Field(default=50000.0)
    max_margin_util: float = Field(default=70.0)
    max_positions: int = Field(default=10)
    leverage_cap: float = Field(default=5.0)
    last_connected: Optional[datetime] = None
    connection_status: str = Field(default="disconnected")

# ADD new fields to Order
class Order(OrderBase, table=True):
    # ... existing fields ...
    
    # NEW fields
    segment: Optional[str] = None
    broker_id: Optional[str] = None
    avg_fill: Optional[float] = None
    rejection_reason: Optional[str] = None
    lifecycle_json: str = Field(default='[]')

# ADD new fields to LogEntry
class LogEntry(SQLModel, table=True):
    # ... existing fields ...
    
    # NEW field
    source: str = Field(default="system")

# ADD new fields to VirtualTrade
class VirtualTrade(SQLModel, table=True):
    # ... existing fields ...
    
    # NEW fields
    segment: Optional[str] = None
    broker_id: Optional[str] = None
    avg_price: Optional[float] = None
    day_change: float = Field(default=0.0)
    trade_type: str = Field(default="Intraday")

# NEW tables
class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(foreign_key="user.id")
    time: datetime = Field(default_factory=datetime.utcnow)
    category: str  # "trade" | "risk" | "broker" | "system"
    level: str     # "info" | "warning" | "error" | "critical"
    title: str
    body: str
    read: bool = Field(default=False)

class UserSession(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    device: str
    location: str
    ip_address: str
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_current: bool = Field(default=False)

class NotificationSettings(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(foreign_key="user.id")
    email_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    trade_alerts: bool = Field(default=True)
    risk_alerts: bool = Field(default=True)
    broker_alerts: bool = Field(default=True)
    system_alerts: bool = Field(default=True)

class Instrument(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    symbol: str = Field(unique=True, index=True)
    segment: str
    ltp: float = Field(default=0.0)
    change_pct: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 8. Required Dependencies

Add to `requirements.txt`:

```
# No new dependencies required - using existing FastAPI/SQLModel stack
```

---

## 9. Migration Checklist

### Phase 1: Database Changes
- [ ] Add new columns to existing tables
- [ ] Create new tables (Notification, UserSession, NotificationSettings, Instrument)
- [ ] Create Alembic migration script
- [ ] Run migration on development database
- [ ] Verify schema changes

### Phase 2: New Routes
- [ ] Create `routes/dashboard.py`
- [ ] Create `routes/notifications.py`
- [ ] Create `routes/profile.py`
- [ ] Register routers in `main.py`
- [ ] Test new endpoints

### Phase 3: Enhanced Routes
- [ ] Update `routes/strategies.py` response format
- [ ] Update `routes/brokers.py` response format
- [ ] Update `routes/positions.py` response format
- [ ] Update `routes/orders.py` response format
- [ ] Update `routes/logs.py` with source filter
- [ ] Test enhanced endpoints

### Phase 4: WebSocket Updates
- [ ] Add broker_status to dashboard WebSocket
- [ ] Add notifications to dashboard WebSocket
- [ ] Test real-time updates

### Phase 5: Integration Testing
- [ ] Test all endpoints with frontend
- [ ] Verify data format compatibility
- [ ] Performance testing for dashboard aggregates
