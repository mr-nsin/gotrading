from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select, func
from typing import Dict, Any, List, Optional
from database import get_session
from models import DailyPnl, Strategy, BrokerCredential, Order, VirtualTrade, User
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta
import random
import json
import csv
import io

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def seed_daily_pnl(session: Session, days: int = 365) -> List[DailyPnl]:
    """Seed database with historical daily P&L data"""
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    random.seed(42)
    records = []
    
    strategies = session.exec(select(Strategy)).all()
    strategy_names = [s.name for s in strategies] if strategies else ["Default Strategy"]
    
    brokers = session.exec(select(BrokerCredential)).all()
    broker_codes = [b.code for b in brokers] if brokers else ["KITE"]
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i - 1)
        
        # Skip weekends
        if date.weekday() >= 5:
            continue
        
        # Generate random daily P&L with slight upward bias
        base_pnl = random.gauss(2000, 15000)  # Mean +2000, std 15000
        trades = random.randint(5, 50)
        charges = trades * random.uniform(15, 40)  # Avg 15-40 per trade
        
        # Strategy breakdown
        strategy_breakdown = {}
        remaining_pnl = base_pnl
        for j, name in enumerate(strategy_names[:-1] if len(strategy_names) > 1 else strategy_names):
            pnl_share = remaining_pnl * random.uniform(0.1, 0.4)
            strategy_breakdown[name] = round(pnl_share, 2)
            remaining_pnl -= pnl_share
        if strategy_names:
            strategy_breakdown[strategy_names[-1]] = round(remaining_pnl, 2)
        
        # Broker breakdown
        broker_breakdown = {}
        remaining_pnl = base_pnl
        for j, code in enumerate(broker_codes[:-1] if len(broker_codes) > 1 else broker_codes):
            pnl_share = remaining_pnl * random.uniform(0.2, 0.5)
            broker_breakdown[code] = round(pnl_share, 2)
            remaining_pnl -= pnl_share
        if broker_codes:
            broker_breakdown[broker_codes[-1]] = round(remaining_pnl, 2)
        
        record = DailyPnl(
            user_id=user_id,
            date=date,
            pnl=round(base_pnl, 2),
            trades=trades,
            charges=round(charges, 2),
            strategy_breakdown_json=json.dumps(strategy_breakdown),
            broker_breakdown_json=json.dumps(broker_breakdown)
        )
        records.append(record)
    
    session.add_all(records)
    session.commit()
    return records


def get_pnl_records(session: Session, start_date: datetime = None, end_date: datetime = None) -> List[DailyPnl]:
    """Get P&L records, seeding if necessary"""
    query = select(DailyPnl)
    
    if start_date:
        query = query.where(DailyPnl.date >= start_date)
    if end_date:
        query = query.where(DailyPnl.date <= end_date)
    
    query = query.order_by(DailyPnl.date)
    
    records = session.exec(query).all()
    
    if not records:
        seed_daily_pnl(session)
        records = session.exec(query).all()
    
    return records


@router.get("/summary")
def get_reports_summary(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get summary statistics for reports page"""
    period_days = {
        "1D": 1,
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "1Y": 365,
        "ALL": 730
    }
    
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    if not records:
        return {
            "netPnl": 0,
            "totalTrades": 0,
            "winDays": 0,
            "lossDays": 0,
            "bestDay": 0,
            "worstDay": 0,
            "avgDailyPnl": 0,
            "totalCharges": 0,
            "winRate": 0
        }
    
    pnls = [r.pnl for r in records]
    win_days = sum(1 for p in pnls if p > 0)
    loss_days = sum(1 for p in pnls if p < 0)
    
    return {
        "netPnl": round(sum(pnls), 2),
        "totalTrades": sum(r.trades for r in records),
        "winDays": win_days,
        "lossDays": loss_days,
        "bestDay": round(max(pnls) if pnls else 0, 2),
        "worstDay": round(min(pnls) if pnls else 0, 2),
        "avgDailyPnl": round(sum(pnls) / len(pnls) if pnls else 0, 2),
        "totalCharges": round(sum(r.charges for r in records), 2),
        "winRate": round((win_days / len(records)) * 100 if records else 0, 1)
    }


@router.get("/daily")
def get_daily_pnl(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get daily P&L records"""
    start = datetime.fromisoformat(start_date) if start_date else datetime.utcnow() - timedelta(days=limit)
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    
    records = get_pnl_records(session, start, end)
    
    return [
        {
            "date": r.date.strftime("%Y-%m-%d"),
            "pnl": round(r.pnl, 2),
            "trades": r.trades,
            "charges": round(r.charges, 2),
            "net": round(r.pnl - r.charges, 2)
        }
        for r in records[-limit:]
    ]


@router.get("/monthly")
def get_monthly_pnl(
    year: Optional[int] = None,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get monthly P&L aggregation"""
    target_year = year or datetime.utcnow().year
    start_date = datetime(target_year, 1, 1)
    end_date = datetime(target_year, 12, 31)
    
    records = get_pnl_records(session, start_date, end_date)
    
    # Aggregate by month
    monthly = {}
    for r in records:
        month_key = r.date.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = {"pnl": 0, "trades": 0, "charges": 0, "days": 0}
        monthly[month_key]["pnl"] += r.pnl
        monthly[month_key]["trades"] += r.trades
        monthly[month_key]["charges"] += r.charges
        monthly[month_key]["days"] += 1
    
    result = []
    for month_key in sorted(monthly.keys()):
        data = monthly[month_key]
        result.append({
            "month": month_key,
            "monthName": datetime.strptime(month_key, "%Y-%m").strftime("%b %Y"),
            "pnl": round(data["pnl"], 2),
            "trades": data["trades"],
            "charges": round(data["charges"], 2),
            "net": round(data["pnl"] - data["charges"], 2),
            "tradingDays": data["days"],
            "avgDailyPnl": round(data["pnl"] / data["days"] if data["days"] > 0 else 0, 2)
        })
    
    return result


@router.get("/by-strategy")
def get_pnl_by_strategy(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get P&L breakdown by strategy"""
    period_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 730}
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    # Aggregate by strategy
    strategy_pnl = {}
    for r in records:
        try:
            breakdown = json.loads(r.strategy_breakdown_json) if r.strategy_breakdown_json else {}
        except:
            breakdown = {}
        
        for name, pnl in breakdown.items():
            if name not in strategy_pnl:
                strategy_pnl[name] = {"pnl": 0, "days": 0}
            strategy_pnl[name]["pnl"] += pnl
            strategy_pnl[name]["days"] += 1
    
    # Get strategy details
    strategies = session.exec(select(Strategy)).all()
    strategy_map = {s.name: s for s in strategies}
    
    result = []
    for name, data in strategy_pnl.items():
        strategy = strategy_map.get(name)
        result.append({
            "name": name,
            "pnl": round(data["pnl"], 2),
            "tradingDays": data["days"],
            "avgDailyPnl": round(data["pnl"] / data["days"] if data["days"] > 0 else 0, 2),
            "segment": strategy.segment if strategy else "Unknown",
            "status": strategy.status.lower() if strategy else "unknown"
        })
    
    return sorted(result, key=lambda x: -x["pnl"])


@router.get("/by-broker")
def get_pnl_by_broker(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get P&L breakdown by broker"""
    period_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 730}
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    # Aggregate by broker
    broker_pnl = {}
    for r in records:
        try:
            breakdown = json.loads(r.broker_breakdown_json) if r.broker_breakdown_json else {}
        except:
            breakdown = {}
        
        for code, pnl in breakdown.items():
            if code not in broker_pnl:
                broker_pnl[code] = {"pnl": 0, "days": 0}
            broker_pnl[code]["pnl"] += pnl
            broker_pnl[code]["days"] += 1
    
    BROKER_NAMES = {
        "KITE": "Zerodha Kite",
        "UPX": "Upstox",
        "SMARTAPI": "Angel One",
        "FYERS-V3": "Fyers",
        "DHANHQ": "Dhan"
    }
    
    result = []
    for code, data in broker_pnl.items():
        result.append({
            "code": code,
            "name": BROKER_NAMES.get(code, code),
            "pnl": round(data["pnl"], 2),
            "tradingDays": data["days"],
            "avgDailyPnl": round(data["pnl"] / data["days"] if data["days"] > 0 else 0, 2)
        })
    
    return sorted(result, key=lambda x: -x["pnl"])


@router.get("/by-segment")
def get_pnl_by_segment(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get P&L breakdown by market segment"""
    strategies = session.exec(select(Strategy)).all()
    
    segment_pnl = {}
    for s in strategies:
        segment = s.segment or "Others"
        if segment not in segment_pnl:
            segment_pnl[segment] = {"pnl": 0, "strategies": 0}
        segment_pnl[segment]["pnl"] += s.total_pnl
        segment_pnl[segment]["strategies"] += 1
    
    total_pnl = sum(d["pnl"] for d in segment_pnl.values())
    
    result = []
    for segment, data in segment_pnl.items():
        result.append({
            "segment": segment,
            "pnl": round(data["pnl"], 2),
            "strategies": data["strategies"],
            "pct": round((data["pnl"] / total_pnl) * 100, 1) if total_pnl > 0 else 0
        })
    
    return sorted(result, key=lambda x: -x["pnl"])


@router.get("/equity-curve")
def get_equity_curve(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get cumulative equity curve data"""
    period_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 730}
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    base_capital = 2500000  # Starting capital
    cumulative = base_capital
    
    result = []
    for r in records:
        cumulative += r.pnl
        result.append({
            "date": r.date.strftime("%Y-%m-%d"),
            "value": round(cumulative, 2),
            "dailyPnl": round(r.pnl, 2)
        })
    
    return result


@router.get("/session-ledger")
def get_session_ledger(
    date: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get detailed trade session ledger"""
    target_date = datetime.fromisoformat(date) if date else datetime.utcnow()
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get closed virtual trades for the day
    trades = session.exec(
        select(VirtualTrade)
        .where(VirtualTrade.status == "CLOSED")
        .where(VirtualTrade.closed_at >= start_of_day)
        .where(VirtualTrade.closed_at <= end_of_day)
        .order_by(VirtualTrade.closed_at.desc())
        .limit(limit)
    ).all()
    
    result = []
    for t in trades:
        result.append({
            "id": str(t.id),
            "time": t.closed_at.isoformat() if t.closed_at else t.created_at.isoformat(),
            "symbol": t.symbol,
            "side": t.side,
            "qty": t.quantity,
            "entryPrice": round(t.entry_price, 2),
            "exitPrice": round(t.exit_price, 2) if t.exit_price else 0,
            "pnl": round(t.pnl, 2),
            "pnlPct": round(t.pnl_pct, 2),
            "strategy": t.strategy_name,
            "segment": t.segment
        })
    
    # If no real trades, generate sample data
    if not result:
        random.seed(int(target_date.timestamp()))
        symbols = ["NIFTY 25AUG 24500 CE", "BANKNIFTY 25AUG 52000 PE", "RELIANCE", "TCS", "HDFCBANK"]
        strategies = ["Nifty ORB Breakout", "BankNifty Straddle", "RSI Mean Reversion"]
        
        for i in range(min(limit, 20)):
            side = random.choice(["BUY", "SELL"])
            entry = random.uniform(100, 500)
            exit_price = entry * (1 + random.gauss(0, 0.02))
            qty = random.randint(50, 500)
            pnl = (exit_price - entry) * qty if side == "BUY" else (entry - exit_price) * qty
            
            result.append({
                "id": str(uuid.uuid4()),
                "time": (start_of_day + timedelta(minutes=random.randint(555, 930))).isoformat(),
                "symbol": random.choice(symbols),
                "side": side,
                "qty": qty,
                "entryPrice": round(entry, 2),
                "exitPrice": round(exit_price, 2),
                "pnl": round(pnl, 2),
                "pnlPct": round((pnl / (entry * qty)) * 100, 2),
                "strategy": random.choice(strategies),
                "segment": random.choice(["Options", "Equity Cash", "Futures"])
            })
        
        result.sort(key=lambda x: x["time"], reverse=True)
    
    return result


@router.get("/export/csv")
def export_pnl_csv(
    period: str = "1M",
    session: Session = Depends(get_session)
):
    """Export P&L data as CSV"""
    period_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 730}
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "P&L", "Trades", "Charges", "Net P&L"])
    
    for r in records:
        writer.writerow([
            r.date.strftime("%Y-%m-%d"),
            round(r.pnl, 2),
            r.trades,
            round(r.charges, 2),
            round(r.pnl - r.charges, 2)
        ])
    
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pnl_report_{period}.csv"}
    )


@router.get("/charges")
def get_charges_breakdown(
    period: str = "1M",
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get breakdown of trading charges"""
    period_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 730}
    days = period_days.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = get_pnl_records(session, start_date)
    
    total_charges = sum(r.charges for r in records)
    total_trades = sum(r.trades for r in records)
    
    # Estimate breakdown (in production, this would be tracked precisely)
    brokerage_pct = 0.45
    stt_pct = 0.25
    exchange_pct = 0.15
    gst_pct = 0.10
    stamp_pct = 0.05
    
    return {
        "totalCharges": round(total_charges, 2),
        "totalTrades": total_trades,
        "avgPerTrade": round(total_charges / total_trades if total_trades > 0 else 0, 2),
        "breakdown": {
            "brokerage": round(total_charges * brokerage_pct, 2),
            "stt": round(total_charges * stt_pct, 2),
            "exchange": round(total_charges * exchange_pct, 2),
            "gst": round(total_charges * gst_pct, 2),
            "stamp": round(total_charges * stamp_pct, 2)
        }
    }
