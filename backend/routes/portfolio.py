from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import Dict, Any, List, Optional
from database import get_session
from models import Holding, BrokerCredential, VirtualTrade, Strategy, DailyPnl, VirtualPortfolio, User
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta
import random
import json

router = APIRouter(prefix="/api/v1/portfolio", tags=["Portfolio"])


class HoldingCreate(BaseModel):
    symbol: str
    sector: str = "Others"
    qty: int
    avg_price: float
    broker_id: Optional[str] = None


class HoldingUpdate(BaseModel):
    qty: Optional[int] = None
    avg_price: Optional[float] = None


SECTORS = [
    "IT", "Banking", "Auto", "Pharma", "FMCG", "Metal", "Energy", "Infra", "Telecom", "Others"
]

SAMPLE_HOLDINGS = [
    {"symbol": "RELIANCE", "sector": "Energy", "qty": 50, "avgPrice": 2420.0, "ltp": 2485.60, "pnlPct": 2.7},
    {"symbol": "TCS", "sector": "IT", "qty": 30, "avgPrice": 3580.0, "ltp": 3712.45, "pnlPct": 3.7},
    {"symbol": "HDFCBANK", "sector": "Banking", "qty": 100, "avgPrice": 1640.0, "ltp": 1598.20, "pnlPct": -2.5},
    {"symbol": "INFY", "sector": "IT", "qty": 80, "avgPrice": 1420.0, "ltp": 1485.90, "pnlPct": 4.6},
    {"symbol": "ICICIBANK", "sector": "Banking", "qty": 120, "avgPrice": 920.0, "ltp": 968.50, "pnlPct": 5.3},
    {"symbol": "TATAMOTORS", "sector": "Auto", "qty": 200, "avgPrice": 680.0, "ltp": 742.30, "pnlPct": 9.2},
    {"symbol": "SUNPHARMA", "sector": "Pharma", "qty": 60, "avgPrice": 1180.0, "ltp": 1142.80, "pnlPct": -3.2},
    {"symbol": "ITC", "sector": "FMCG", "qty": 300, "avgPrice": 420.0, "ltp": 445.60, "pnlPct": 6.1},
    {"symbol": "BHARTIARTL", "sector": "Telecom", "qty": 80, "avgPrice": 1320.0, "ltp": 1385.40, "pnlPct": 5.0},
    {"symbol": "HINDUNILVR", "sector": "FMCG", "qty": 40, "avgPrice": 2580.0, "ltp": 2512.20, "pnlPct": -2.6},
    {"symbol": "TATASTEEL", "sector": "Metal", "qty": 250, "avgPrice": 142.0, "ltp": 156.80, "pnlPct": 10.4},
    {"symbol": "WIPRO", "sector": "IT", "qty": 150, "avgPrice": 420.0, "ltp": 438.60, "pnlPct": 4.4},
]


def holding_to_response(h: Holding) -> Dict[str, Any]:
    """Convert Holding model to API response"""
    # Calculate day change (simulated as a portion of pnl_pct for demo)
    day_change = round(h.pnl_pct * random.uniform(0.3, 0.6), 2) if h.pnl_pct else 0
    
    return {
        "id": str(h.id),
        "symbol": h.symbol,
        "sector": h.sector,
        "qty": h.qty,
        "avg": round(h.avg_price, 2),  # Frontend expects 'avg'
        "avgPrice": round(h.avg_price, 2),  # Keep for backward compatibility
        "ltp": round(h.ltp, 2),
        "value": round(h.value, 2),
        "pnl": round(h.pnl, 2),
        "pnlPct": round(h.pnl_pct, 2),
        "dayChange": day_change,  # Add day change
        "brokerId": h.broker_id,
        "updatedAt": h.updated_at.isoformat() if h.updated_at else None,
    }


def seed_default_holdings(session: Session) -> List[Holding]:
    """Seed database with sample holdings"""
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    holdings = []
    for h in SAMPLE_HOLDINGS:
        holding = Holding(
            user_id=user_id,
            symbol=h["symbol"],
            sector=h["sector"],
            qty=h["qty"],
            avg_price=h["avgPrice"],
            ltp=h["ltp"],
            value=h["qty"] * h["ltp"],
            pnl=(h["ltp"] - h["avgPrice"]) * h["qty"],
            pnl_pct=h["pnlPct"],
        )
        holdings.append(holding)
    
    session.add_all(holdings)
    session.commit()
    return session.exec(select(Holding)).all()


@router.get("/holdings")
def list_holdings(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """List all portfolio holdings"""
    holdings = session.exec(select(Holding)).all()
    if not holdings:
        holdings = seed_default_holdings(session)
    return [holding_to_response(h) for h in holdings]


@router.post("/holdings")
def create_holding(data: HoldingCreate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Add new holding to portfolio"""
    user = session.exec(select(User)).first()
    
    holding = Holding(
        user_id=user.id if user else None,
        symbol=data.symbol.upper(),
        sector=data.sector,
        qty=data.qty,
        avg_price=data.avg_price,
        ltp=data.avg_price,  # Initialize LTP to avg price
        value=data.qty * data.avg_price,
        pnl=0.0,
        pnl_pct=0.0,
        broker_id=data.broker_id
    )
    session.add(holding)
    session.commit()
    session.refresh(holding)
    
    return holding_to_response(holding)


@router.put("/holdings/{id}")
def update_holding(id: uuid.UUID, data: HoldingUpdate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Update holding quantity or avg price"""
    holding = session.get(Holding, id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    if data.qty is not None:
        holding.qty = data.qty
    if data.avg_price is not None:
        holding.avg_price = data.avg_price
    
    # Recalculate derived fields
    holding.value = holding.qty * holding.ltp
    holding.pnl = (holding.ltp - holding.avg_price) * holding.qty
    holding.pnl_pct = ((holding.ltp - holding.avg_price) / holding.avg_price) * 100 if holding.avg_price > 0 else 0
    holding.updated_at = datetime.utcnow()
    
    session.add(holding)
    session.commit()
    session.refresh(holding)
    
    return holding_to_response(holding)


@router.delete("/holdings/{id}")
def delete_holding(id: uuid.UUID, session: Session = Depends(get_session)):
    """Remove holding from portfolio"""
    holding = session.get(Holding, id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    session.delete(holding)
    session.commit()
    return {"ok": True}


SECTOR_COLORS = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", 
    "var(--chart-4)", "var(--chart-5)", "var(--chart-6)",
    "hsl(200, 70%, 50%)", "hsl(280, 70%, 50%)", "hsl(340, 70%, 50%)"
]


@router.get("/sectors")
def get_sector_allocation(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get portfolio allocation by sector"""
    holdings = session.exec(select(Holding)).all()
    if not holdings:
        holdings = seed_default_holdings(session)
    
    sector_values = {}
    for h in holdings:
        sector_values[h.sector] = sector_values.get(h.sector, 0) + h.value
    
    total_value = sum(sector_values.values())
    
    result = []
    for i, (sector, value) in enumerate(sorted(sector_values.items(), key=lambda x: -x[1])):
        result.append({
            "name": sector,  # Frontend expects 'name' not 'sector'
            "value": round(value, 2),
            "color": SECTOR_COLORS[i % len(SECTOR_COLORS)],  # Add color
            "pct": round((value / total_value) * 100, 1) if total_value > 0 else 0
        })
    
    return result


@router.get("/summary")
def get_portfolio_summary(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get portfolio summary with key metrics"""
    # Get holdings
    holdings = session.exec(select(Holding)).all()
    if not holdings:
        holdings = seed_default_holdings(session)
    
    total_invested = sum(h.avg_price * h.qty for h in holdings)
    current_value = sum(h.value for h in holdings)
    total_pnl = current_value - total_invested
    total_pnl_pct = (total_pnl / total_invested) * 100 if total_invested > 0 else 0
    
    # Get broker funds
    brokers = session.exec(select(BrokerCredential)).all()
    total_funds = sum(b.funds for b in brokers)
    margin_available = sum(b.margin_available for b in brokers)
    
    # Get virtual portfolio
    portfolio = session.get(VirtualPortfolio, 1)
    if not portfolio:
        portfolio = VirtualPortfolio()
        session.add(portfolio)
        session.commit()
    
    # Calculate total portfolio value (holdings + broker funds)
    net_worth = current_value + total_funds
    
    # Get open positions
    open_positions = session.exec(
        select(func.count(VirtualTrade.id)).where(VirtualTrade.status == "OPEN")
    ).one() or 0
    
    # Get running strategies
    running_strategies = session.exec(
        select(func.count(Strategy.id)).where(Strategy.status == "RUNNING")
    ).one() or 0
    
    # Calculate day change (simulated as portion of total pnl for demo)
    day_change = round(total_pnl * random.uniform(0.05, 0.15), 2)
    
    return {
        # Frontend-expected fields
        "netWorth": round(net_worth, 2),
        "invested": round(total_invested, 2),
        "pnl": round(total_pnl, 2),
        "pnlPct": round(total_pnl_pct, 2),
        "dayChange": day_change,
        # Additional detailed fields
        "holdingsValue": round(current_value, 2),
        "brokerFunds": round(total_funds, 2),
        "marginAvailable": round(margin_available, 2),
        "totalInvested": round(total_invested, 2),
        "totalPnl": round(total_pnl, 2),
        "totalPnlPct": round(total_pnl_pct, 2),
        "openPositions": open_positions,
        "runningStrategies": running_strategies,
        "holdingsCount": len(holdings)
    }


BROKER_COLORS = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", 
    "var(--chart-4)", "var(--chart-5)"
]


@router.get("/broker-capital")
def get_broker_capital_distribution(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get capital distribution across brokers"""
    brokers = session.exec(select(BrokerCredential)).all()
    
    if not brokers:
        # Seed default brokers if none exist
        from routes.brokers import seed_default_brokers
        brokers = seed_default_brokers(session)
    
    BROKER_NAMES = {
        "KITE": "Zerodha Kite",
        "UPX": "Upstox",
        "SMARTAPI": "Angel One",
        "FYERS-V3": "Fyers",
        "DHANHQ": "Dhan"
    }
    
    total_funds = sum(b.funds for b in brokers)
    
    result = []
    sorted_brokers = sorted(brokers, key=lambda x: -x.funds)
    for i, b in enumerate(sorted_brokers):
        result.append({
            "id": str(b.id),
            "name": BROKER_NAMES.get(b.code, b.code),
            "value": round(b.funds, 2),  # Frontend expects 'value'
            "color": BROKER_COLORS[i % len(BROKER_COLORS)],  # Add color
            # Additional detailed fields
            "code": b.code,
            "funds": round(b.funds, 2),
            "marginUsed": round(b.margin_used, 2),
            "marginAvailable": round(b.margin_available, 2),
            "pct": round((b.funds / total_funds) * 100, 1) if total_funds > 0 else 0,
            "status": b.connection_status
        })
    
    return result


@router.get("/net-worth-history")
def get_net_worth_history(
    period: Optional[str] = None,
    range: Optional[str] = None,  # Frontend sends 'range' parameter
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get historical net worth curve data"""
    period_days = {
        "1D": 1,
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "1Y": 365,
        "ALL": 730
    }
    
    # Accept both 'range' and 'period' parameters
    time_range = range or period or "1M"
    days = period_days.get(time_range, 30)
    
    # Generate simulated historical data
    # In production, this would come from DailyPnl table
    random.seed(42)  # For consistent data
    
    base_value = 2500000  # Starting net worth
    result = []
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i - 1)
        # Simulate gradual growth with volatility
        daily_change = random.gauss(0.001, 0.015)  # ~0.1% daily expected return, 1.5% std dev
        base_value *= (1 + daily_change)
        
        result.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(base_value, 2)
        })
    
    return result


@router.get("/strategy-contribution")
def get_strategy_contribution(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get P&L contribution by strategy"""
    strategies = session.exec(select(Strategy)).all()
    
    result = []
    for s in strategies:
        result.append({
            "id": str(s.id),
            "name": s.name,
            "pnl": round(s.total_pnl, 2),
            "segment": s.segment,
            "status": s.status.lower()
        })
    
    return sorted(result, key=lambda x: -x["pnl"])


@router.get("/gainers-losers")
def get_top_gainers_losers(limit: int = 5, session: Session = Depends(get_session)) -> Dict[str, List[Dict[str, Any]]]:
    """Get top gainers and losers from holdings"""
    holdings = session.exec(select(Holding)).all()
    if not holdings:
        holdings = seed_default_holdings(session)
    
    sorted_holdings = sorted(holdings, key=lambda h: h.pnl_pct, reverse=True)
    
    gainers = [
        {"symbol": h.symbol, "pnl": round(h.pnl, 2), "pnlPct": round(h.pnl_pct, 2)}
        for h in sorted_holdings[:limit] if h.pnl_pct > 0
    ]
    
    losers = [
        {"symbol": h.symbol, "pnl": round(h.pnl, 2), "pnlPct": round(h.pnl_pct, 2)}
        for h in sorted_holdings[-limit:] if h.pnl_pct < 0
    ][::-1]  # Reverse to show worst first
    
    return {
        "gainers": gainers,
        "losers": losers
    }
