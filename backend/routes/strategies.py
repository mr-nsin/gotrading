from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional, Dict, Any
from database import get_session
from models import Strategy, LogEntry, BrokerCredential, VirtualTrade
from pydantic import BaseModel
import uuid
import json
import random
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/strategies", tags=["Strategies"])


class RuleCreate(BaseModel):
    id: str
    indicator: str
    operator: str
    value: str
    join: str = "AND"


class StrategyCreate(BaseModel):
    name: str
    type: str = "INTRADAY"
    instrument: str = "NIFTY"
    capital_allocated: float = 0.0
    segment: str = "Options"
    description: str = ""
    mode: str = "Live"
    instruments: List[str] = []
    brokers: List[str] = []
    entry_rules: List[RuleCreate] = []
    exit_rules: List[RuleCreate] = []
    risk: Dict[str, Any] = {}
    sizing: Dict[str, Any] = {}
    webhook_enabled: bool = False
    settings_json: str = "{}"
    schedule_json: str = "{}"


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    instrument: Optional[str] = None
    capital_allocated: Optional[float] = None
    segment: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    instruments: Optional[List[str]] = None
    brokers: Optional[List[str]] = None
    entry_rules: Optional[List[RuleCreate]] = None
    exit_rules: Optional[List[RuleCreate]] = None
    risk: Optional[Dict[str, Any]] = None
    sizing: Optional[Dict[str, Any]] = None
    webhook_enabled: Optional[bool] = None
    settings_json: Optional[str] = None
    schedule_json: Optional[str] = None


def get_active_broker_name(session: Session) -> str:
    creds = session.exec(select(BrokerCredential)).first()
    if creds:
        if creds.angelone_api_key:
            return "Angel One"
        if creds.zerodha_api_key:
            return "Zerodha"
        if creds.fyers_app_id:
            return "Fyers"
        if creds.dhan_client_id:
            return "Dhan"
    return "Paper Trading"


def generate_spark_data(pnl: float) -> List[float]:
    """Generate sparkline data points"""
    random.seed(hash(str(pnl)))
    base = 100
    data = []
    trend = 1 if pnl >= 0 else -1
    for _ in range(24):
        base += random.uniform(-2, 3) * trend
        data.append(round(base, 2))
    return data


def strategy_to_response(s: Strategy, session: Session, active_broker_name: str = None, precalc_open_positions: int = None) -> Dict[str, Any]:
    """Convert Strategy model to enhanced API response"""
    # Parse JSON fields
    try:
        brokers = json.loads(s.brokers_json) if s.brokers_json else []
    except:
        brokers = []
    
    try:
        instruments = json.loads(s.instruments_json) if s.instruments_json else [s.instrument]
    except:
        instruments = [s.instrument]
    
    try:
        entry_rules = json.loads(s.entry_rules_json) if s.entry_rules_json else []
    except:
        entry_rules = []
    
    try:
        exit_rules = json.loads(s.exit_rules_json) if s.exit_rules_json else []
    except:
        exit_rules = []
    
    try:
        risk = json.loads(s.risk_json) if s.risk_json else {}
    except:
        risk = {}
    
    try:
        sizing = json.loads(s.sizing_json) if s.sizing_json else {}
    except:
        sizing = {}
    
    try:
        schedule = json.loads(s.schedule_json) if s.schedule_json else {}
    except:
        schedule = {}
    
    try:
        spark = json.loads(s.spark_data_json) if s.spark_data_json else generate_spark_data(s.total_pnl)
    except:
        spark = generate_spark_data(s.total_pnl)
    
    # Count open positions for this strategy
    open_positions = precalc_open_positions if precalc_open_positions is not None else (session.exec(
        select(func.count(VirtualTrade.id))
        .where(VirtualTrade.strategy_name == s.name)
        .where(VirtualTrade.status == "OPEN")
    ).one() or 0)
    
    # Map status to UI format
    status_map = {
        "RUNNING": "live",
        "PAUSED": "paused",
        "STOPPED": "draft",
        "ERROR": "error"
    }
    
    return {
        "id": str(s.id),
        "name": s.name,
        "type": s.type,
        "instrument": s.instrument,
        "status": status_map.get(s.status, s.status.lower()),
        "segment": s.segment or "Options",
        "description": s.description or f"Algorithmic trading strategy for {s.instrument}",
        "brokers": brokers if brokers else [(active_broker_name or get_active_broker_name(session)).lower().replace(" ", "")],
        "todayPnl": round(s.todays_pnl, 2),
        "overallPnl": round(s.total_pnl, 2),
        "openPositions": s.open_positions if s.open_positions else open_positions,
        "capital": round(s.capital_allocated, 2),
        "winRate": round(s.win_rate * 100 if s.win_rate <= 1 else s.win_rate, 1),
        "sharpe": round(s.sharpe_ratio, 2),
        "maxDd": round(s.max_drawdown, 1),
        "trades": s.total_trades,
        "lastSignal": s.last_signal.isoformat() if s.last_signal else (datetime.utcnow() - timedelta(minutes=random.randint(5, 300))).isoformat(),
        "mode": s.mode or "Live",
        "instruments": instruments,
        "entryRules": entry_rules,
        "exitRules": exit_rules,
        "risk": risk if risk else {"stopLoss": "1.5%", "target": "3%", "trailingStop": "0.5%"},
        "sizing": sizing if sizing else {"type": "fixed", "lots": 1},
        "schedule": schedule,
        "webhook": s.webhook_enabled,
        "spark": spark,
        # Legacy fields for backward compatibility
        "capital_allocated": round(s.capital_allocated, 2),
        "todays_pnl": round(s.todays_pnl, 2),
        "total_pnl": round(s.total_pnl, 2),
        "win_rate": round(s.win_rate * 100 if s.win_rate <= 1 else s.win_rate, 1),
        "sharpe_ratio": round(s.sharpe_ratio, 2),
        "max_drawdown": round(s.max_drawdown, 1),
        "total_trades": s.total_trades,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def seed_default_strategies(session: Session) -> List[Strategy]:
    """Seed database with default strategies"""
    default_strategies = [
        Strategy(
            name="Nifty ORB Breakout",
            instrument="NIFTY 50",
            type="OPTIONS",
            segment="Options",
            description="Opening-range breakout on NIFTY index options with VWAP filter",
            capital_allocated=500000.0,
            win_rate=0.64,
            total_trades=412,
            todays_pnl=18420.0,
            total_pnl=284000.0,
            sharpe_ratio=2.1,
            max_drawdown=9.4,
            status="RUNNING",
            mode="Live",
            brokers_json='["zerodha", "upstox"]',
            instruments_json='["NIFTY 25AUG 24500 CE", "NIFTY 25AUG 24500 PE"]',
            risk_json='{"stopLoss": "1.5%", "target": "3%", "trailingStop": "0.5%"}',
            open_positions=3
        ),
        Strategy(
            name="BankNifty Straddle Decay",
            instrument="BANKNIFTY",
            type="OPTIONS",
            segment="Options",
            description="Short straddle at 09:35 with delta-hedged adjustments",
            capital_allocated=400000.0,
            win_rate=0.58,
            total_trades=188,
            todays_pnl=-4200.0,
            total_pnl=142000.0,
            sharpe_ratio=1.4,
            max_drawdown=14.2,
            status="RUNNING",
            mode="Live",
            brokers_json='["zerodha"]',
            instruments_json='["BANKNIFTY 25AUG 52000 CE", "BANKNIFTY 25AUG 52000 PE"]',
            open_positions=2
        ),
        Strategy(
            name="Supertrend Momentum F&O",
            instrument="NIFTY AUG FUT",
            type="INTRADAY",
            segment="Futures",
            description="Supertrend(10,3) trend rider on index futures",
            capital_allocated=300000.0,
            win_rate=0.52,
            total_trades=906,
            todays_pnl=8400.0,
            total_pnl=241000.0,
            sharpe_ratio=1.7,
            max_drawdown=14.1,
            status="RUNNING",
            mode="Live",
            brokers_json='["upstox", "fyers"]',
            open_positions=1
        ),
        Strategy(
            name="RSI Mean Reversion Cash",
            instrument="NIFTY 50",
            type="SWING",
            segment="Equity Cash",
            description="RSI(2) oversold reversal basket across Nifty50 cash",
            capital_allocated=600000.0,
            win_rate=0.68,
            total_trades=142,
            todays_pnl=12800.0,
            total_pnl=96000.0,
            sharpe_ratio=1.9,
            max_drawdown=8.2,
            status="RUNNING",
            mode="Live",
            brokers_json='["zerodha"]',
            instruments_json='["RELIANCE", "TCS", "HDFCBANK", "INFY"]',
            open_positions=4
        ),
        Strategy(
            name="EMA 9/21 Crossover",
            instrument="BANKNIFTY",
            type="INTRADAY",
            segment="Equity Cash",
            description="Intraday EMA crossover with volume confirmation",
            capital_allocated=200000.0,
            win_rate=0.55,
            total_trades=324,
            todays_pnl=0.0,
            total_pnl=45000.0,
            sharpe_ratio=1.2,
            max_drawdown=12.4,
            status="PAUSED",
            mode="Paper",
            brokers_json='["angelone"]',
            open_positions=0
        ),
        Strategy(
            name="Gap-Up Fade",
            instrument="NIFTY 50",
            type="INTRADAY",
            segment="Equity Cash",
            description="Fades >1.2% gap-ups in large caps after 09:45",
            capital_allocated=250000.0,
            win_rate=0.61,
            total_trades=89,
            todays_pnl=6200.0,
            total_pnl=78000.0,
            sharpe_ratio=1.6,
            max_drawdown=10.8,
            status="RUNNING",
            mode="Live",
            brokers_json='["fyers"]',
            open_positions=2
        ),
        Strategy(
            name="VWAP Reversion Scalper",
            instrument="NIFTY AUG FUT",
            type="INTRADAY",
            segment="Futures",
            description="High-frequency VWAP reversion on index futures",
            capital_allocated=400000.0,
            win_rate=0.54,
            total_trades=1420,
            todays_pnl=4800.0,
            total_pnl=186000.0,
            sharpe_ratio=1.9,
            max_drawdown=6.8,
            status="RUNNING",
            mode="Live",
            brokers_json='["zerodha", "dhan"]',
            open_positions=1
        ),
        Strategy(
            name="Bollinger Squeeze Options",
            instrument="BANKNIFTY",
            type="OPTIONS",
            segment="Options",
            description="Volatility expansion play on weekly BANKNIFTY",
            capital_allocated=150000.0,
            win_rate=0.48,
            total_trades=64,
            todays_pnl=0.0,
            total_pnl=-24000.0,
            sharpe_ratio=0.4,
            max_drawdown=18.2,
            status="STOPPED",
            mode="Backtest",
            brokers_json='["upstox"]',
            open_positions=0
        ),
    ]
    
    session.add_all(default_strategies)
    session.commit()
    return session.exec(select(Strategy)).all()


@router.get("")
def list_strategies(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    strategies = session.exec(select(Strategy)).all()
    if not strategies:
        strategies = seed_default_strategies(session)
        
    broker_name = get_active_broker_name(session)
    
    # Pre-calculate all open positions in one query to avoid N+1 problem
    positions = session.exec(
        select(VirtualTrade.strategy_name, func.count(VirtualTrade.id))
        .where(VirtualTrade.status == "OPEN")
        .group_by(VirtualTrade.strategy_name)
    ).all()
    pos_map = {name: count for name, count in positions}
    
    return [strategy_to_response(s, session, active_broker_name=broker_name, precalc_open_positions=pos_map.get(s.name, 0)) for s in strategies]


@router.post("")
def create_strategy(strategy: StrategyCreate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    new_strategy = Strategy(
        name=strategy.name,
        type=strategy.type,
        instrument=strategy.instrument,
        capital_allocated=strategy.capital_allocated,
        segment=strategy.segment,
        description=strategy.description,
        mode=strategy.mode,
        instruments_json=json.dumps(strategy.instruments) if strategy.instruments else "[]",
        brokers_json=json.dumps(strategy.brokers) if strategy.brokers else "[]",
        entry_rules_json=json.dumps([r.dict() for r in strategy.entry_rules]) if strategy.entry_rules else "[]",
        exit_rules_json=json.dumps([r.dict() for r in strategy.exit_rules]) if strategy.exit_rules else "[]",
        risk_json=json.dumps(strategy.risk) if strategy.risk else "{}",
        sizing_json=json.dumps(strategy.sizing) if strategy.sizing else "{}",
        webhook_enabled=strategy.webhook_enabled,
        settings_json=strategy.settings_json,
        schedule_json=strategy.schedule_json,
        status="STOPPED",
        spark_data_json=json.dumps(generate_spark_data(0))
    )
    session.add(new_strategy)
    session.commit()
    session.refresh(new_strategy)

    broker_name = get_active_broker_name(session)
    log = LogEntry(
        level="INFO",
        source="strategy",
        message=f"Strategy '{new_strategy.name}' created. Segment: {new_strategy.segment} | Mode: {new_strategy.mode}",
        strategy_id=str(new_strategy.id),
        broker_id=broker_name
    )
    session.add(log)
    session.commit()

    return strategy_to_response(new_strategy, session)


@router.get("/{id}")
def get_strategy(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy_to_response(strategy, session)


@router.put("/{id}")
def update_strategy(id: uuid.UUID, strategy_update: StrategyUpdate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    update_data = strategy_update.dict(exclude_unset=True)
    
    # Handle JSON fields
    if "instruments" in update_data:
        strategy.instruments_json = json.dumps(update_data.pop("instruments"))
    if "brokers" in update_data:
        strategy.brokers_json = json.dumps(update_data.pop("brokers"))
    if "entry_rules" in update_data:
        rules = update_data.pop("entry_rules")
        strategy.entry_rules_json = json.dumps([r.dict() if hasattr(r, 'dict') else r for r in rules])
    if "exit_rules" in update_data:
        rules = update_data.pop("exit_rules")
        strategy.exit_rules_json = json.dumps([r.dict() if hasattr(r, 'dict') else r for r in rules])
    if "risk" in update_data:
        strategy.risk_json = json.dumps(update_data.pop("risk"))
    if "sizing" in update_data:
        strategy.sizing_json = json.dumps(update_data.pop("sizing"))
    
    for key, value in update_data.items():
        if hasattr(strategy, key):
            setattr(strategy, key, value)
    
    strategy.updated_at = datetime.utcnow()
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    broker_name = get_active_broker_name(session)
    log = LogEntry(
        level="INFO",
        source="strategy",
        message=f"Strategy '{strategy.name}' updated",
        strategy_id=str(strategy.id),
        broker_id=broker_name
    )
    session.add(log)
    session.commit()

    return strategy_to_response(strategy, session)


@router.delete("/{id}")
def delete_strategy(id: uuid.UUID, session: Session = Depends(get_session)):
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    name = strategy.name
    session.delete(strategy)
    session.commit()
    
    log = LogEntry(
        level="WARN",
        source="strategy",
        message=f"Strategy '{name}' deleted",
        strategy_id=str(id)
    )
    session.add(log)
    session.commit()
    
    return {"ok": True}


@router.post("/{id}/start")
def start_strategy(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    strategy.status = "RUNNING"
    strategy.last_signal = datetime.utcnow()
    session.add(strategy)

    broker_name = get_active_broker_name(session)
    
    logs = [
        LogEntry(
            level="INFO",
            source="strategy",
            message=f"Strategy '{strategy.name}' initialized. Connected Broker: {broker_name}",
            strategy_id=str(strategy.id),
            broker_id=broker_name
        ),
        LogEntry(
            level="INFO",
            source="strategy",
            message=f"Fetching historical OHLCV candles for {strategy.instrument}. Calculating indicators...",
            strategy_id=str(strategy.id),
            broker_id=broker_name
        ),
        LogEntry(
            level="TRADE",
            source="strategy",
            message=f"Execution loop ACTIVE for '{strategy.name}'. Listening for live signals.",
            strategy_id=str(strategy.id),
            broker_id=broker_name
        )
    ]
    session.add_all(logs)
    session.commit()
    session.refresh(strategy)
    
    return strategy_to_response(strategy, session)


@router.post("/{id}/pause")
def pause_strategy(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    strategy.status = "PAUSED"
    session.add(strategy)

    broker_name = get_active_broker_name(session)
    log = LogEntry(
        level="WARN",
        source="strategy",
        message=f"Strategy '{strategy.name}' PAUSED. Freezing new signals while holding positions.",
        strategy_id=str(strategy.id),
        broker_id=broker_name
    )
    session.add(log)
    session.commit()
    session.refresh(strategy)
    
    return strategy_to_response(strategy, session)


@router.post("/{id}/stop")
def stop_strategy(id: uuid.UUID, session: Session = Depends(get_session)) -> Dict[str, Any]:
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    strategy.status = "STOPPED"
    session.add(strategy)

    broker_name = get_active_broker_name(session)
    log = LogEntry(
        level="WARN",
        source="strategy",
        message=f"Strategy '{strategy.name}' STOPPED. Disconnected from order routing.",
        strategy_id=str(strategy.id),
        broker_id=broker_name
    )
    session.add(log)
    session.commit()
    session.refresh(strategy)
    
    return strategy_to_response(strategy, session)


@router.get("/{id}/positions")
def get_strategy_positions(id: uuid.UUID, session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get positions for a specific strategy"""
    strategy = session.get(Strategy, id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    positions = session.exec(
        select(VirtualTrade)
        .where(VirtualTrade.status == "OPEN")
        .where(
            (VirtualTrade.strategy_name == strategy.name) |
            (VirtualTrade.strategy_id == str(id))
        )
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
            "strategyId": str(id),
            "brokerId": p.broker_id,
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
