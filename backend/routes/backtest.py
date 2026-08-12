from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_session
from models import BacktestRun, Strategy, User
import random
import math
import uuid
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/backtest", tags=["Backtest"])


class BacktestRequest(BaseModel):
    strategy_id: Optional[str] = None
    strategy_name: Optional[str] = "Intraday Momentum"
    instrument: Optional[str] = "NIFTY"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_capital: float = 1000000.0
    slippage_pct: float = 0.05
    brokerage_per_order: float = 20.0
    include_costs: bool = True


class BacktestParams(BaseModel):
    # Support both camelCase (UI) and snake_case (API) formats
    strategy: Optional[str] = None
    strategy_id: Optional[str] = None  # Frontend sends this
    periodStart: Optional[str] = None
    start_date: Optional[str] = None  # Frontend sends this
    periodEnd: Optional[str] = None
    end_date: Optional[str] = None  # Frontend sends this
    capital: float = 1000000.0
    slippage: Optional[float] = None
    slippage_pct: Optional[float] = None  # Frontend sends this
    brokerage: Optional[float] = None
    brokerage_per_order: Optional[float] = None  # Frontend sends this
    includeCosts: Optional[bool] = None
    include_costs: Optional[bool] = None  # Frontend sends this
    
    @property
    def resolved_strategy(self) -> str:
        return self.strategy or self.strategy_id or "Nifty ORB Breakout"
    
    @property
    def resolved_start(self) -> str:
        return self.periodStart or self.start_date or "2024-01-01"
    
    @property
    def resolved_end(self) -> str:
        return self.periodEnd or self.end_date or "2024-08-01"
    
    @property
    def resolved_slippage(self) -> float:
        return self.slippage if self.slippage is not None else (self.slippage_pct if self.slippage_pct is not None else 0.05)
    
    @property
    def resolved_brokerage(self) -> float:
        return self.brokerage if self.brokerage is not None else (self.brokerage_per_order if self.brokerage_per_order is not None else 20.0)
    
    @property
    def resolved_include_costs(self) -> bool:
        if self.includeCosts is not None:
            return self.includeCosts
        if self.include_costs is not None:
            return self.include_costs
        return True


def simulate_backtest(params: BacktestParams, run_id: uuid.UUID = None) -> Dict[str, Any]:
    """Run a simulated backtest with realistic results"""
    strategy_name = params.resolved_strategy
    start_date = params.resolved_start
    end_date = params.resolved_end
    include_costs = params.resolved_include_costs
    slippage = params.resolved_slippage
    brokerage = params.resolved_brokerage
    
    random.seed(hash(strategy_name + start_date))
    
    # Parse dates
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except:
        start = datetime.now() - timedelta(days=180)
        end = datetime.now()
    
    days = (end - start).days
    initial = params.capital
    
    # Generate equity curve
    equity_curve = []
    running_capital = initial
    running_pnl = 0.0
    max_capital = initial
    max_drawdown = 0.0
    win_count = 0
    loss_count = 0
    total_win = 0.0
    total_loss = 0.0
    trade_count = 0
    
    daily_returns = []
    
    current_date = start
    while current_date <= end:
        # Skip weekends
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue
        
        # Simulate 0-3 trades per day
        day_trades = random.randint(0, 3)
        day_pnl = 0.0
        
        for _ in range(day_trades):
            trade_count += 1
            
            # Win rate varies by strategy type
            win_prob = random.uniform(0.48, 0.68)
            is_win = random.random() < win_prob
            
            if is_win:
                trade_pnl = random.uniform(500, 8000)
                win_count += 1
                total_win += trade_pnl
            else:
                trade_pnl = -random.uniform(300, 5000)
                loss_count += 1
                total_loss += abs(trade_pnl)
            
            # Apply costs
            if include_costs:
                trade_pnl -= brokerage * 2  # Entry + exit
                trade_pnl *= (1 - slippage / 100)
            
            day_pnl += trade_pnl
        
        running_pnl += day_pnl
        running_capital = initial + running_pnl
        
        if running_capital > max_capital:
            max_capital = running_capital
        
        drawdown = (max_capital - running_capital) / max_capital if max_capital > 0 else 0
        if drawdown > max_drawdown:
            max_drawdown = drawdown
        
        if day_trades > 0:
            daily_returns.append(day_pnl / initial)
        
        equity_curve.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "value": round(running_capital, 2),
            "pnl": round(running_pnl, 2)
        })
        
        current_date += timedelta(days=1)
    
    # Calculate metrics
    win_rate = win_count / trade_count if trade_count > 0 else 0
    avg_win = total_win / win_count if win_count > 0 else 0
    avg_loss = total_loss / loss_count if loss_count > 0 else 0
    profit_factor = total_win / total_loss if total_loss > 0 else 0
    
    # Calculate Sharpe Ratio
    if daily_returns:
        avg_return = sum(daily_returns) / len(daily_returns)
        std_return = math.sqrt(sum((r - avg_return) ** 2 for r in daily_returns) / len(daily_returns)) if len(daily_returns) > 1 else 0.01
        sharpe = (avg_return * 252) / (std_return * math.sqrt(252)) if std_return > 0 else 0
    else:
        sharpe = 0
    
    # Generate daily P&L bars
    daily_pnl = []
    for i in range(min(len(equity_curve), 30)):
        idx = len(equity_curve) - 30 + i if len(equity_curve) > 30 else i
        if idx > 0:
            day_change = equity_curve[idx]["value"] - equity_curve[idx-1]["value"]
        else:
            day_change = 0
        daily_pnl.append({
            "date": equity_curve[idx]["date"],
            "pnl": round(day_change, 2)
        })
    
    return {
        "id": str(run_id) if run_id else str(uuid.uuid4()),
        "strategy": strategy_name,
        "periodStart": start_date,
        "periodEnd": end_date,
        "capital": initial,
        "finalCapital": round(running_capital, 2),
        "pnl": round(running_pnl, 2),
        "pnlPct": round((running_pnl / initial) * 100, 2),
        "trades": trade_count,
        "winRate": round(win_rate * 100, 1),
        "maxDrawdown": round(max_drawdown * 100, 1),
        "sharpe": round(sharpe, 2),
        "profitFactor": round(profit_factor, 2),
        "avgWin": round(avg_win, 2),
        "avgLoss": round(avg_loss, 2),
        "equityCurve": equity_curve,
        "dailyPnl": daily_pnl,
        "status": "completed",
        "completedAt": datetime.utcnow().isoformat()
    }


def backtest_to_response(run: BacktestRun) -> Dict[str, Any]:
    """Convert BacktestRun model to API response"""
    try:
        equity_curve = json.loads(run.equity_curve_json) if run.equity_curve_json else []
    except:
        equity_curve = []
    
    try:
        results = json.loads(run.results_json) if run.results_json else {}
    except:
        results = {}
    
    return {
        "id": str(run.id),
        "strategy": run.strategy_name,
        "periodStart": run.period_start.isoformat() if run.period_start else None,
        "periodEnd": run.period_end.isoformat() if run.period_end else None,
        "capital": run.starting_capital,
        "pnl": round(run.pnl, 2),
        "pnlPct": round((run.pnl / run.starting_capital) * 100, 2) if run.starting_capital > 0 else 0,
        "trades": run.trades,
        "winRate": round(run.win_rate, 1),
        "maxDrawdown": round(run.max_drawdown, 1),
        "sharpe": round(run.sharpe, 2),
        "profitFactor": round(run.profit_factor, 2),
        "avgWin": round(run.avg_win, 2),
        "avgLoss": round(run.avg_loss, 2),
        "status": run.status,
        "createdAt": run.created_at.isoformat() if run.created_at else None,
        "completedAt": run.completed_at.isoformat() if run.completed_at else None,
        "equityCurve": equity_curve,
        **results
    }


def seed_backtest_runs(session: Session) -> List[BacktestRun]:
    """Seed database with sample backtest runs"""
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    strategies = ["Nifty ORB Breakout", "BankNifty Straddle", "Supertrend Momentum", "RSI Mean Reversion"]
    
    runs = []
    for i, strategy_name in enumerate(strategies):
        params = BacktestParams(
            strategy=strategy_name,
            periodStart=(datetime.utcnow() - timedelta(days=180 + i*30)).strftime("%Y-%m-%d"),
            periodEnd=(datetime.utcnow() - timedelta(days=i*7)).strftime("%Y-%m-%d"),
            capital=random.choice([500000, 750000, 1000000, 1500000])
        )
        
        result = simulate_backtest(params)
        
        run = BacktestRun(
            user_id=user_id,
            strategy_name=strategy_name,
            period_start=datetime.fromisoformat(params.resolved_start),
            period_end=datetime.fromisoformat(params.resolved_end),
            starting_capital=params.capital,
            slippage_pct=params.resolved_slippage,
            brokerage_per_order=params.resolved_brokerage,
            include_costs=params.includeCosts,
            trades=result["trades"],
            win_rate=result["winRate"],
            pnl=result["pnl"],
            max_drawdown=result["maxDrawdown"],
            sharpe=result["sharpe"],
            profit_factor=result["profitFactor"],
            avg_win=result["avgWin"],
            avg_loss=result["avgLoss"],
            status="completed",
            equity_curve_json=json.dumps(result["equityCurve"][-50:]),  # Last 50 points
            results_json=json.dumps({"dailyPnl": result["dailyPnl"]}),
            completed_at=datetime.utcnow() - timedelta(hours=i*12)
        )
        runs.append(run)
    
    session.add_all(runs)
    session.commit()
    return runs


@router.get("/runs")
def list_backtest_runs(
    limit: int = 10,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """List recent backtest runs"""
    runs = session.exec(
        select(BacktestRun)
        .order_by(BacktestRun.created_at.desc())
        .limit(limit)
    ).all()
    
    if not runs:
        seed_backtest_runs(session)
        runs = session.exec(
            select(BacktestRun)
            .order_by(BacktestRun.created_at.desc())
            .limit(limit)
        ).all()
    
    return [backtest_to_response(r) for r in runs]


@router.get("/runs/{id}")
def get_backtest_run(
    id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get a specific backtest run by ID"""
    run = session.get(BacktestRun, id)
    if not run:
        raise HTTPException(status_code=404, detail="Backtest run not found")
    return backtest_to_response(run)


@router.post("/run")
def run_backtest(
    params: BacktestParams,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Run a new backtest simulation.
    Returns immediately with status 'running', results computed in background.
    """
    user = session.exec(select(User)).first()
    user_id = user.id if user else None
    
    # Create backtest run record
    run = BacktestRun(
        user_id=user_id,
        strategy_name=params.resolved_strategy,
        period_start=datetime.fromisoformat(params.resolved_start),
        period_end=datetime.fromisoformat(params.resolved_end),
        starting_capital=params.capital,
        slippage_pct=params.resolved_slippage,
        brokerage_per_order=params.resolved_brokerage,
        include_costs=params.resolved_include_costs,
        status="running"
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    
    # For demo, run simulation immediately (in production, use background task)
    result = simulate_backtest(params, run.id)
    
    # Update the run with results
    run.trades = result["trades"]
    run.win_rate = result["winRate"]
    run.pnl = result["pnl"]
    run.max_drawdown = result["maxDrawdown"]
    run.sharpe = result["sharpe"]
    run.profit_factor = result["profitFactor"]
    run.avg_win = result["avgWin"]
    run.avg_loss = result["avgLoss"]
    run.status = "completed"
    run.equity_curve_json = json.dumps(result["equityCurve"][-100:])  # Last 100 points
    run.results_json = json.dumps({"dailyPnl": result["dailyPnl"]})
    run.completed_at = datetime.utcnow()
    
    session.add(run)
    session.commit()
    session.refresh(run)
    
    return backtest_to_response(run)


@router.post("/simulate")
def simulate_backtest_quick(req: BacktestRequest):
    """
    Run a quick backtest simulation without persisting.
    Returns full results immediately.
    """
    params = BacktestParams(
        strategy=req.strategy_name or req.strategy_id or "Intraday Momentum",
        periodStart=req.start_date or (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d"),
        periodEnd=req.end_date or datetime.now().strftime("%Y-%m-%d"),
        capital=req.initial_capital,
        slippage=req.slippage_pct,
        brokerage=req.brokerage_per_order,
        includeCosts=req.include_costs
    )
    
    return simulate_backtest(params)


@router.delete("/runs/{id}")
def delete_backtest_run(
    id: uuid.UUID,
    session: Session = Depends(get_session)
):
    """Delete a backtest run"""
    run = session.get(BacktestRun, id)
    if not run:
        raise HTTPException(status_code=404, detail="Backtest run not found")
    
    session.delete(run)
    session.commit()
    return {"ok": True}


@router.get("/strategies")
def get_available_strategies(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get list of strategies available for backtesting"""
    strategies = session.exec(select(Strategy)).all()
    
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "segment": s.segment,
            "instrument": s.instrument,
            "type": s.type
        }
        for s in strategies
    ]
