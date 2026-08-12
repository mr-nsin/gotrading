from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from database import get_session
from models import VirtualTrade, Order, VirtualPortfolio, User, Strategy
import uuid
import random
from datetime import datetime

router = APIRouter(prefix="/api/v1/positions", tags=["Positions"])


def position_to_response(pos: VirtualTrade, session: Session) -> Dict[str, Any]:
    """Convert VirtualTrade to frontend-expected format"""
    ltp = pos.ltp if (pos.ltp and pos.ltp > 0) else round(pos.entry_price * 1.02, 2)
    
    if pos.side == "BUY":
        unrealized = (ltp - pos.entry_price) * pos.quantity
        pnl_pct = ((ltp - pos.entry_price) / pos.entry_price * 100) if pos.entry_price > 0 else 0.0
    else:
        unrealized = (pos.entry_price - ltp) * pos.quantity
        pnl_pct = ((pos.entry_price - ltp) / pos.entry_price * 100) if pos.entry_price > 0 else 0.0
    
    # Get strategy ID if we have strategy name
    strategy_id = pos.strategy_id
    if not strategy_id and pos.strategy_name:
        strat = session.exec(
            select(Strategy).where(Strategy.name == pos.strategy_name)
        ).first()
        if strat:
            strategy_id = str(strat.id)
    
    return {
        "id": str(pos.id),
        "symbol": pos.symbol,
        "segment": pos.segment or "EQ",
        "strategyId": strategy_id or pos.strategy_name,
        "strategy_name": pos.strategy_name,
        "brokerId": pos.broker_id,
        "qty": pos.quantity,
        "quantity": pos.quantity,
        "avgPrice": round(pos.entry_price, 2),
        "entry_price": round(pos.entry_price, 2),
        "ltp": round(ltp, 2),
        "unrealized": round(unrealized, 2),
        "realized": 0 if pos.status == "OPEN" else round(pos.pnl, 2),
        "dayChange": round(pos.day_change, 2) if pos.day_change else round(pnl_pct, 2),
        "type": pos.trade_type or "Intraday",
        "side": pos.side,
        "status": pos.status.lower(),
        "pnl": round(unrealized if pos.status == "OPEN" else pos.pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "created_at": pos.created_at.isoformat() if pos.created_at else None,
        "closed_at": pos.closed_at.isoformat() if pos.closed_at else None
    }


@router.get("", response_model=List[Dict[str, Any]])
def list_positions(
    status: str = "open",
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """List all positions with enhanced format"""
    if status == "open":
        query = select(VirtualTrade).where(VirtualTrade.status == "OPEN")
    elif status == "closed":
        query = select(VirtualTrade).where(VirtualTrade.status == "CLOSED")
    else:
        query = select(VirtualTrade)
    
    positions = session.exec(query.order_by(VirtualTrade.created_at.desc())).all()
    return [position_to_response(pos, session) for pos in positions]


@router.get("/{id}")
def get_position(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get a single position by ID"""
    trade = session.get(VirtualTrade, id)
    if not trade:
        raise HTTPException(status_code=404, detail="Position not found")
    return position_to_response(trade, session)


@router.post("/{id}/squareoff", response_model=Dict[str, Any])
def squareoff_position(id: uuid.UUID, session: Session = Depends(get_session)):
    """Square off / close a position"""
    trade = session.get(VirtualTrade, id)
    if not trade:
        raise HTTPException(status_code=404, detail="Position not found")
    if trade.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Position already closed")
    
    trade.status = "CLOSED"
    trade.closed_at = datetime.utcnow()
    
    exit_p = trade.ltp if (trade.ltp and trade.ltp > 0) else (
        trade.entry_price * 1.01 if trade.side == "BUY" else trade.entry_price * 0.99
    )
    trade.exit_price = round(exit_p, 2)
    
    price_diff = trade.exit_price - trade.entry_price
    multiplier = 1 if trade.side == "BUY" else -1
    trade.pnl = round(price_diff * trade.quantity * multiplier, 2)
    trade.pnl_pct = round(
        ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * multiplier, 2
    ) if trade.entry_price > 0 else 0.0
    
    user = session.exec(select(User)).first()
    if user:
        sell_order = Order(
            user_id=user.id,
            broker_order_id=f"ANG-{random.randint(100000, 999999)}",
            symbol=trade.symbol,
            side="SELL" if trade.side == "BUY" else "BUY",
            quantity=trade.quantity,
            average_price=round(trade.exit_price, 2),
            order_type="MARKET",
            product="MIS",
            exchange="NFO",
            status="FILLED",
            is_algo_trade=False,
            strategy_id=trade.strategy_name,
            segment=trade.segment or "EQ",
            broker_id=trade.broker_id,
            timestamp=datetime.utcnow()
        )
        session.add(sell_order)
    
    portfolio = session.get(VirtualPortfolio, 1)
    if portfolio:
        portfolio.available_margin += (trade.exit_price * trade.quantity)
        portfolio.realized_pnl += trade.pnl
        session.add(portfolio)
    
    session.add(trade)
    session.commit()
    session.refresh(trade)
    
    return position_to_response(trade, session)


@router.post("/squareoff-all")
def squareoff_all_positions(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Square off all open positions"""
    positions = session.exec(
        select(VirtualTrade).where(VirtualTrade.status == "OPEN")
    ).all()
    
    closed_count = 0
    total_pnl = 0.0
    
    for trade in positions:
        trade.status = "CLOSED"
        trade.closed_at = datetime.utcnow()
        
        exit_p = trade.ltp if (trade.ltp and trade.ltp > 0) else trade.entry_price * 1.01
        trade.exit_price = round(exit_p, 2)
        
        price_diff = trade.exit_price - trade.entry_price
        multiplier = 1 if trade.side == "BUY" else -1
        trade.pnl = round(price_diff * trade.quantity * multiplier, 2)
        
        session.add(trade)
        closed_count += 1
        total_pnl += trade.pnl
    
    session.commit()
    
    return {
        "ok": True,
        "closedCount": closed_count,
        "totalPnl": round(total_pnl, 2)
    }
