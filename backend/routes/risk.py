from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from database import get_session
from models import RiskSettings, Strategy, VirtualTrade
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/v1/risk", tags=["Risk"])

class RiskSettingsUpdate(BaseModel):
    daily_loss_limit: Optional[float] = None
    daily_loss_limit_pct: Optional[float] = None
    max_open_positions: Optional[int] = None
    max_capital_per_strategy_pct: Optional[float] = None
    max_order_value: Optional[float] = None
    max_per_trade_loss: Optional[float] = None
    auto_kill_switch: Optional[bool] = None
    circuit_breaker_enabled: Optional[bool] = None
    circuit_breaker_threshold: Optional[float] = None
    circuit_breaker_action: Optional[str] = None
    vix_threshold: Optional[float] = None
    block_entries_after: Optional[str] = None

@router.get("/settings", response_model=RiskSettings)
def get_risk_settings(session: Session = Depends(get_session)):
    settings = session.get(RiskSettings, 1)
    if not settings:
        settings = RiskSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@router.put("/settings", response_model=RiskSettings)
def update_risk_settings(update_data: RiskSettingsUpdate, session: Session = Depends(get_session)):
    settings = session.get(RiskSettings, 1)
    if not settings:
        settings = RiskSettings(id=1)
        session.add(settings)
        session.commit()
    
    data = update_data.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
        
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings

@router.post("/emergency-stop")
def emergency_stop(session: Session = Depends(get_session)):
    # Set all strategies to STOPPED
    strategies = session.exec(select(Strategy).where(Strategy.status != "STOPPED")).all()
    strategies_stopped = 0
    for s in strategies:
        s.status = "STOPPED"
        session.add(s)
        strategies_stopped += 1
        
    # Close all open VirtualTrades
    open_trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
    positions_closed = 0
    for t in open_trades:
        t.status = "CLOSED"
        t.closed_at = datetime.utcnow()
        t.exit_price = t.entry_price  # Mock exit at entry price for emergency
        session.add(t)
        positions_closed += 1
        
    session.commit()
    return {
        "ok": True,
        "message": "Emergency stop executed",
        "strategies_stopped": strategies_stopped,
        "positions_closed": positions_closed
    }
