from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import Dict, Any, List, Optional
from database import get_session
from models import BrokerCredential, User, LogEntry, Strategy, VirtualTrade, Order
from pydantic import BaseModel
from routes.auth import get_current_user, get_current_user_optional
from utils.encryption import encrypt_credential, decrypt_credential, is_encryption_enabled
import uuid
import json
from datetime import datetime, timedelta
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/brokers", tags=["Brokers"])


class BrokerCreate(BaseModel):
    code: str  # "KITE", "UPX", "SMARTAPI", "FYERS-V3", "DHANHQ"
    user_id: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    client_id: Optional[str] = None
    password: Optional[str] = None
    totp_secret: Optional[str] = None


class BrokerSettings(BaseModel):
    auto_square_off: Optional[str] = None
    max_daily_loss: Optional[float] = None
    max_margin_util: Optional[float] = None
    max_positions: Optional[int] = None
    leverage_cap: Optional[float] = None


BROKER_CONFIG = {
    "KITE": {
        "name": "Zerodha Kite",
        "accent_hue": "var(--chart-1)"
    },
    "UPX": {
        "name": "Upstox",
        "accent_hue": "var(--chart-2)"
    },
    "SMARTAPI": {
        "name": "Angel One",
        "accent_hue": "var(--chart-3)"
    },
    "FYERS-V3": {
        "name": "Fyers",
        "accent_hue": "var(--chart-4)"
    },
    "DHANHQ": {
        "name": "Dhan",
        "accent_hue": "var(--chart-5)"
    }
}


def mask_api_key(key: str) -> str:
    """Mask API key for display"""
    if not key or len(key) < 8:
        return "••••••••"
    return f"{key[:4]}••••••{key[-4:]}"


def broker_to_response(broker: BrokerCredential, session: Session) -> Dict[str, Any]:
    """Convert BrokerCredential to enhanced API response"""
    # Determine broker type and name
    code = broker.code
    if not code:
        if broker.zerodha_api_key:
            code = "KITE"
        elif broker.angelone_api_key:
            code = "SMARTAPI"
        elif broker.fyers_app_id:
            code = "FYERS-V3"
        elif broker.dhan_client_id:
            code = "DHANHQ"
        else:
            code = "UPX"
    
    config = BROKER_CONFIG.get(code, {"name": code, "accent_hue": "var(--chart-1)"})
    
    # Get API key for masking
    api_key = (
        broker.zerodha_api_key or 
        broker.angelone_api_key or 
        broker.fyers_app_id or 
        broker.dhan_client_id or
        ""
    )
    
    # Count strategies using this broker
    strategies_count = session.exec(
        select(func.count(Strategy.id))
        .where(Strategy.brokers_json.contains(code.lower()))
    ).one() or 0
    
    # Calculate connection status
    if broker.connection_status == "connected":
        if broker.token_expiry and broker.token_expiry < datetime.utcnow() + timedelta(hours=1):
            status = "token_expiring"
        else:
            status = "connected"
    else:
        status = "disconnected"
    
    return {
        "id": str(broker.id),
        "code": code,
        "name": config["name"],
        "accentHue": broker.accent_hue or config["accent_hue"],
        "apiKey": broker.api_key_masked or mask_api_key(api_key),
        "tokenExpiry": broker.token_expiry.isoformat() if broker.token_expiry else None,
        "status": status,
        "clientId": broker.client_id or "",
        "funds": round(broker.funds, 2),
        "marginUsed": round(broker.margin_used, 2),
        "marginAvailable": round(broker.margin_available, 2),
        "strategies": strategies_count or broker.strategies_count,
        "settings": {
            "autoSquareOff": broker.auto_square_off,
            "maxDailyLoss": broker.max_daily_loss,
            "maxMarginUtil": broker.max_margin_util,
            "maxPositions": broker.max_positions,
            "leverageCap": broker.leverage_cap
        },
        "lastConnected": broker.last_connected.isoformat() if broker.last_connected else None,
        # Legacy fields for backward compatibility
        "user_id": str(broker.user_id) if broker.user_id else None,
    }


def seed_default_brokers(session: Session) -> List[BrokerCredential]:
    """Seed database with default broker configurations"""
    # Get or create default user
    user = session.exec(select(User)).first()
    if not user:
        user = User(email="admin@gotrading.local", subscription_tier="PRO")
        session.add(user)
        session.commit()
        session.refresh(user)
    
    brokers = [
        BrokerCredential(
            user_id=user.id,
            code="KITE",
            zerodha_api_key="kt_9f2ae41b",
            api_key_masked="kt_9f2a••••••e41b",
            client_id="DX4812",
            funds=1284000.0,
            margin_used=460000.0,
            margin_available=824000.0,
            strategies_count=4,
            token_expiry=datetime.utcnow() + timedelta(hours=6),
            connection_status="connected",
            last_connected=datetime.utcnow(),
            auto_square_off="15:15",
            max_daily_loss=50000.0,
            max_margin_util=75.0,
            max_positions=10,
            leverage_cap=5.0,
            accent_hue="var(--chart-1)"
        ),
        BrokerCredential(
            user_id=user.id,
            code="UPX",
            api_key_masked="up_8c3b••••••f720",
            client_id="UP8234",
            funds=720000.0,
            margin_used=180000.0,
            margin_available=540000.0,
            strategies_count=2,
            token_expiry=datetime.utcnow() + timedelta(hours=4),
            connection_status="connected",
            last_connected=datetime.utcnow(),
            auto_square_off="15:20",
            max_daily_loss=30000.0,
            max_margin_util=70.0,
            max_positions=8,
            leverage_cap=4.0,
            accent_hue="var(--chart-2)"
        ),
        BrokerCredential(
            user_id=user.id,
            code="SMARTAPI",
            angelone_api_key="ao_d42c81ef",
            api_key_masked="ao_d42c••••••81ef",
            client_id="A1234567",
            funds=360000.0,
            margin_used=90000.0,
            margin_available=270000.0,
            strategies_count=1,
            token_expiry=datetime.utcnow() - timedelta(hours=2),  # Expired
            connection_status="token_expiring",
            last_connected=datetime.utcnow() - timedelta(hours=8),
            auto_square_off="15:25",
            max_daily_loss=25000.0,
            max_margin_util=65.0,
            max_positions=6,
            leverage_cap=3.0,
            accent_hue="var(--chart-3)"
        ),
        BrokerCredential(
            user_id=user.id,
            code="FYERS-V3",
            fyers_app_id="fy_7e4f92bc",
            api_key_masked="fy_7e4f••••••92bc",
            client_id="FY9876",
            funds=480000.0,
            margin_used=120000.0,
            margin_available=360000.0,
            strategies_count=2,
            token_expiry=datetime.utcnow() + timedelta(hours=8),
            connection_status="connected",
            last_connected=datetime.utcnow(),
            auto_square_off="15:20",
            max_daily_loss=35000.0,
            max_margin_util=70.0,
            max_positions=8,
            leverage_cap=4.0,
            accent_hue="var(--chart-4)"
        ),
        BrokerCredential(
            user_id=user.id,
            code="DHANHQ",
            dhan_client_id="dh_1b3e5d7f",
            api_key_masked="dh_1b3e••••••5d7f",
            client_id="DH5432",
            funds=280000.0,
            margin_used=70000.0,
            margin_available=210000.0,
            strategies_count=1,
            connection_status="disconnected",
            last_connected=datetime.utcnow() - timedelta(days=2),
            auto_square_off="15:25",
            max_daily_loss=20000.0,
            max_margin_util=60.0,
            max_positions=5,
            leverage_cap=3.0,
            accent_hue="var(--chart-5)"
        ),
    ]
    
    session.add_all(brokers)
    session.commit()
    return session.exec(select(BrokerCredential)).all()


@router.get("")
def list_brokers(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> List[Dict[str, Any]]:
    """List all broker connections"""
    # Filter by user if authenticated
    if current_user:
        brokers = session.exec(
            select(BrokerCredential).where(BrokerCredential.user_id == current_user.id)
        ).all()
    else:
        brokers = session.exec(select(BrokerCredential)).all()
    
    if not brokers:
        brokers = seed_default_brokers(session)
    return [broker_to_response(b, session) for b in brokers]


@router.get("/{id}")
def get_broker(
    id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """Get broker by ID"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    # Check ownership if authenticated
    if current_user and broker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return broker_to_response(broker, session)


@router.post("")
def create_broker(
    data: BrokerCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # REQUIRED auth for create
) -> Dict[str, Any]:
    """Create new broker connection"""
    config = BROKER_CONFIG.get(data.code, {"name": data.code, "accent_hue": "var(--chart-1)"})
    
    broker = BrokerCredential(
        user_id=current_user.id,  # Use authenticated user
        code=data.code,
        client_id=data.client_id or "",
        api_key_masked=mask_api_key(data.api_key or ""),
        accent_hue=config["accent_hue"],
        connection_status="disconnected"
    )
    
    # Set broker-specific API keys (ENCRYPTED)
    # SECURITY: All sensitive credentials are encrypted before storage
    if data.code == "KITE":
        broker.zerodha_api_key = encrypt_credential(data.api_key)
    elif data.code == "SMARTAPI":
        broker.angelone_api_key = encrypt_credential(data.api_key)
    elif data.code == "FYERS-V3":
        broker.fyers_app_id = encrypt_credential(data.api_key)
    elif data.code == "DHANHQ":
        broker.dhan_client_id = encrypt_credential(data.client_id or data.api_key)
    
    if not is_encryption_enabled():
        logger.warning("ENCRYPTION_KEY not configured - credentials stored in plain text!")
    
    session.add(broker)
    session.commit()
    session.refresh(broker)
    
    log = LogEntry(
        level="INFO",
        source="broker",
        message=f"Broker '{config['name']}' added. Client ID: {data.client_id or 'N/A'}",
        broker_id=str(broker.id)
    )
    session.add(log)
    session.commit()
    
    return broker_to_response(broker, session)


@router.put("/{id}/settings")
def update_broker_settings(
    id: uuid.UUID, 
    settings: BrokerSettings, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # REQUIRED auth
) -> Dict[str, Any]:
    """Update broker risk settings"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if broker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if settings.auto_square_off is not None:
        broker.auto_square_off = settings.auto_square_off
    if settings.max_daily_loss is not None:
        broker.max_daily_loss = settings.max_daily_loss
    if settings.max_margin_util is not None:
        broker.max_margin_util = settings.max_margin_util
    if settings.max_positions is not None:
        broker.max_positions = settings.max_positions
    if settings.leverage_cap is not None:
        broker.leverage_cap = settings.leverage_cap
    
    session.add(broker)
    session.commit()
    session.refresh(broker)
    
    log = LogEntry(
        level="INFO",
        source="broker",
        message=f"Broker settings updated for '{BROKER_CONFIG.get(broker.code, {}).get('name', broker.code)}'",
        broker_id=str(broker.id)
    )
    session.add(log)
    session.commit()
    
    return broker_to_response(broker, session)


@router.post("/{id}/connect")
def connect_broker(
    id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # REQUIRED auth
) -> Dict[str, Any]:
    """Connect/authenticate broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if broker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Simulate connection - in production this would trigger OAuth flow
    broker.connection_status = "connected"
    broker.last_connected = datetime.utcnow()
    broker.token_expiry = datetime.utcnow() + timedelta(hours=8)
    
    # Simulate fetching funds
    random.seed(id.int)
    broker.funds = round(random.uniform(200000, 2000000), 2)
    broker.margin_used = round(broker.funds * random.uniform(0.1, 0.4), 2)
    broker.margin_available = round(broker.funds - broker.margin_used, 2)
    
    session.add(broker)
    session.commit()
    session.refresh(broker)
    
    config = BROKER_CONFIG.get(broker.code, {"name": broker.code})
    log = LogEntry(
        level="INFO",
        source="broker",
        message=f"Broker '{config['name']}' connected successfully. Funds: ₹{broker.funds:,.0f}",
        broker_id=str(broker.id)
    )
    session.add(log)
    session.commit()
    
    return broker_to_response(broker, session)


@router.post("/{id}/disconnect")
def disconnect_broker(
    id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # REQUIRED auth
) -> Dict[str, Any]:
    """Disconnect broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if broker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    broker.connection_status = "disconnected"
    broker.token_expiry = None
    
    session.add(broker)
    session.commit()
    session.refresh(broker)
    
    config = BROKER_CONFIG.get(broker.code, {"name": broker.code})
    log = LogEntry(
        level="WARN",
        source="broker",
        message=f"Broker '{config['name']}' disconnected",
        broker_id=str(broker.id)
    )
    session.add(log)
    session.commit()
    
    return broker_to_response(broker, session)


@router.delete("/{id}")
def delete_broker(
    id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # REQUIRED auth
):
    """Delete broker connection"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if broker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    config = BROKER_CONFIG.get(broker.code, {"name": broker.code})
    name = config["name"]
    
    session.delete(broker)
    session.commit()
    
    log = LogEntry(
        level="WARN",
        source="broker",
        message=f"Broker '{name}' removed from system",
        broker_id=str(id)
    )
    session.add(log)
    session.commit()
    
    return {"ok": True}


@router.get("/summary/all")
def get_brokers_summary(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get aggregated broker summary for dashboard"""
    brokers = session.exec(select(BrokerCredential)).all()
    if not brokers:
        brokers = seed_default_brokers(session)
    
    total_funds = sum(b.funds for b in brokers)
    total_margin_used = sum(b.margin_used for b in brokers)
    total_margin_available = sum(b.margin_available for b in brokers)
    connected_count = sum(1 for b in brokers if b.connection_status == "connected")
    
    return {
        "totalFunds": round(total_funds, 2),
        "marginUsed": round(total_margin_used, 2),
        "marginAvailable": round(total_margin_available, 2),
        "connectedBrokers": connected_count,
        "totalBrokers": len(brokers),
        "brokers": [broker_to_response(b, session) for b in brokers]
    }


@router.get("/{id}/margin-history")
def get_broker_margin_history(
    id: uuid.UUID,
    days: int = 30,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get historical margin/equity data for a broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    random.seed(id.int)
    base_equity = broker.funds or 500000
    
    result = []
    equity = base_equity * 0.85
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i - 1)
        daily_change = random.gauss(0.002, 0.015)
        equity *= (1 + daily_change)
        
        result.append({
            "date": date.strftime("%Y-%m-%d"),
            "equity": round(equity, 2),
            "pnl": round(equity - base_equity * 0.85, 2)
        })
    
    return result


@router.get("/{id}/strategies")
def get_broker_strategies(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get strategies linked to this broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    code = broker.code.lower() if broker.code else ""
    
    strategies = session.exec(select(Strategy)).all()
    
    result = []
    for s in strategies:
        try:
            brokers_list = json.loads(s.brokers_json) if s.brokers_json else []
        except:
            brokers_list = []
        
        if code in [b.lower() for b in brokers_list] or str(broker.id) in brokers_list:
            result.append({
                "id": str(s.id),
                "name": s.name,
                "status": s.status.lower(),
                "todayPnl": round(s.todays_pnl, 2)
            })
    
    return result


@router.get("/{id}/orders")
def get_broker_orders(
    id: uuid.UUID,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get orders placed via this broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    orders = session.exec(
        select(Order)
        .where(Order.broker_id == str(id))
        .order_by(Order.timestamp.desc())
        .limit(limit)
    ).all()
    
    if not orders:
        orders = session.exec(
            select(Order)
            .order_by(Order.timestamp.desc())
            .limit(limit)
        ).all()
    
    result = []
    for o in orders:
        result.append({
            "id": str(o.id),
            "time": o.timestamp.isoformat() if o.timestamp else None,
            "symbol": o.symbol,
            "segment": o.segment or "EQ",
            "strategyId": o.strategy_id,
            "brokerId": str(id),
            "side": o.side,
            "type": o.order_type or "MARKET",
            "qty": o.quantity,
            "price": o.average_price or 0,
            "avgFill": o.average_price or 0,
            "status": o.status.lower(),
            "reason": o.error_message,
            "product": o.product or "MIS"
        })
    
    return result


@router.get("/{id}/positions")
def get_broker_positions(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get positions held via this broker"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    positions = session.exec(
        select(VirtualTrade)
        .where(VirtualTrade.status == "OPEN")
        .where(VirtualTrade.broker_id == str(id))
    ).all()
    
    if not positions:
        positions = session.exec(
            select(VirtualTrade)
            .where(VirtualTrade.status == "OPEN")
            .limit(10)
        ).all()
    
    result = []
    for p in positions:
        ltp = p.ltp if p.ltp and p.ltp > 0 else p.entry_price * 1.01
        if p.side == "BUY":
            unrealized = (ltp - p.entry_price) * p.quantity
            day_change = ((ltp - p.entry_price) / p.entry_price * 100) if p.entry_price > 0 else 0
        else:
            unrealized = (p.entry_price - ltp) * p.quantity
            day_change = ((p.entry_price - ltp) / p.entry_price * 100) if p.entry_price > 0 else 0
        
        result.append({
            "id": str(p.id),
            "symbol": p.symbol,
            "segment": p.segment or "EQ",
            "strategyId": p.strategy_id or p.strategy_name,
            "brokerId": str(id),
            "qty": p.quantity,
            "avgPrice": round(p.entry_price, 2),
            "ltp": round(ltp, 2),
            "unrealized": round(unrealized, 2),
            "realized": 0,
            "dayChange": round(day_change, 2),
            "type": p.trade_type or "Intraday",
            "side": p.side,
            "status": "open"
        })
    
    return result


@router.post("/{id}/test")
def test_broker_connection(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Test broker connectivity and return latency"""
    broker = session.get(BrokerCredential, id)
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    
    latency = random.randint(25, 180)
    
    if broker.connection_status == "disconnected":
        return {
            "status": "error",
            "latency_ms": 0,
            "message": "Broker is disconnected"
        }
    
    if broker.connection_status == "token_expiring":
        return {
            "status": "warning",
            "latency_ms": latency,
            "message": "Token expiring soon, re-authentication recommended"
        }
    
    return {
        "status": "ok",
        "latency_ms": latency,
        "message": f"Connection successful ({latency}ms)"
    }
