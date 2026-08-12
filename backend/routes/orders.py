from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from database import get_session
from models import Order
from datetime import datetime
import json

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


def order_to_response(order: Order) -> Dict[str, Any]:
    """Convert Order model to frontend-expected format"""
    ts = order.timestamp.isoformat() if order.timestamp else datetime.utcnow().isoformat()
    if not ts.endswith("Z"):
        ts += "Z"
    
    # Parse lifecycle JSON
    try:
        lifecycle = json.loads(order.lifecycle_json) if order.lifecycle_json else []
    except:
        lifecycle = []
    
    # Map status to frontend format
    status_map = {
        "FILLED": "executed",
        "PENDING": "pending",
        "REJECTED": "rejected",
        "CANCELLED": "cancelled",
        "OPEN": "pending"
    }
    
    return {
        "id": str(order.id),
        "time": ts,
        "timestamp": ts,
        "symbol": order.symbol,
        "segment": order.segment or "EQ",
        "strategyId": order.strategy_id,
        "strategy_id": order.strategy_id,
        "brokerId": order.broker_id,
        "side": order.side,
        "type": order.order_type or "MARKET",
        "order_type": order.order_type,
        "qty": order.quantity,
        "quantity": order.quantity,
        "price": order.average_price or 0,
        "avgFill": order.avg_fill if order.avg_fill else (order.average_price or 0),
        "average_price": order.average_price,
        "status": status_map.get(order.status, order.status.lower()),
        "reason": order.rejection_reason or order.error_message,
        "error_message": order.error_message,
        "product": order.product or "MIS",
        "exchange": order.exchange,
        "is_algo_trade": order.is_algo_trade,
        "broker_order_id": order.broker_order_id,
        "lifecycle": lifecycle
    }


@router.get("")
def list_orders(
    status: Optional[str] = None,
    broker_id: Optional[str] = None,
    strategy_id: Optional[str] = None,
    symbol: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """List orders with enhanced response format"""
    query = select(Order)
    
    if status:
        status_map = {
            "executed": "FILLED",
            "pending": "PENDING",
            "rejected": "REJECTED",
            "cancelled": "CANCELLED"
        }
        db_status = status_map.get(status.lower(), status.upper())
        query = query.where(Order.status == db_status)
    
    if symbol:
        query = query.where(Order.symbol == symbol)
    if strategy_id:
        query = query.where(Order.strategy_id == strategy_id)
    if broker_id:
        query = query.where(Order.broker_id == broker_id)
    
    query = query.order_by(Order.timestamp.desc())
    
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    orders = session.exec(query).all()
    return [order_to_response(o) for o in orders]


@router.get("/{id}")
def get_order(id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get a single order by ID"""
    import uuid
    try:
        order_id = uuid.UUID(id)
    except ValueError:
        # Try to find by broker_order_id
        order = session.exec(
            select(Order).where(Order.broker_order_id == id)
        ).first()
        if not order:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Order not found")
        return order_to_response(order)
    
    order = session.get(Order, order_id)
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order_to_response(order)


@router.get("/recent/{limit}")
def get_recent_orders(
    limit: int = 10,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get most recent orders"""
    orders = session.exec(
        select(Order)
        .order_by(Order.timestamp.desc())
        .limit(limit)
    ).all()
    
    return [order_to_response(o) for o in orders]


@router.get("/stats")
def get_order_stats(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get order statistics"""
    from sqlmodel import func
    
    total = session.exec(select(func.count(Order.id))).one() or 0
    executed = session.exec(
        select(func.count(Order.id)).where(Order.status == "FILLED")
    ).one() or 0
    pending = session.exec(
        select(func.count(Order.id)).where(Order.status == "PENDING")
    ).one() or 0
    rejected = session.exec(
        select(func.count(Order.id)).where(Order.status == "REJECTED")
    ).one() or 0
    cancelled = session.exec(
        select(func.count(Order.id)).where(Order.status == "CANCELLED")
    ).one() or 0
    
    return {
        "total": total,
        "executed": executed,
        "pending": pending,
        "rejected": rejected,
        "cancelled": cancelled,
        "successRate": round((executed / total) * 100, 1) if total > 0 else 0
    }
