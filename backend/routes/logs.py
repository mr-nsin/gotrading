from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from database import get_session
from models import LogEntry

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])


def log_to_response(log: LogEntry) -> Dict[str, Any]:
    """Convert LogEntry to frontend-expected format"""
    ts_str = log.timestamp.isoformat() if log.timestamp else ""
    if ts_str and not ts_str.endswith("Z"):
        ts_str += "Z"
    
    return {
        "id": str(log.id),
        "time": ts_str,
        "timestamp": ts_str,
        "level": log.level.lower() if log.level else "info",
        "source": log.source or "system",
        "strategyId": log.strategy_id,
        "strategy_id": log.strategy_id,
        "brokerId": log.broker_id,
        "broker_id": log.broker_id,
        "message": log.message
    }


@router.get("")
def list_logs(
    level: Optional[str] = None,
    source: Optional[str] = None,
    broker_id: Optional[str] = None,
    strategy_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """List logs with filtering"""
    query = select(LogEntry)
    
    if level:
        query = query.where(LogEntry.level == level.upper())
    if source:
        query = query.where(LogEntry.source == source.lower())
    if broker_id:
        query = query.where(LogEntry.broker_id == broker_id)
    if strategy_id:
        query = query.where(LogEntry.strategy_id == strategy_id)
    if search:
        query = query.where(LogEntry.message.contains(search))
    
    query = query.order_by(LogEntry.timestamp.desc())
    
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    logs = session.exec(query).all()
    return [log_to_response(l) for l in logs]


@router.get("/recent/{limit}")
def get_recent_logs(
    limit: int = 20,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get most recent logs"""
    logs = session.exec(
        select(LogEntry)
        .order_by(LogEntry.timestamp.desc())
        .limit(limit)
    ).all()
    
    return [log_to_response(l) for l in logs]


@router.get("/by-level")
def get_logs_by_level(session: Session = Depends(get_session)) -> Dict[str, int]:
    """Get log counts by level"""
    from sqlmodel import func
    
    levels = ["INFO", "WARN", "ERROR", "TRADE", "ALERT", "CRITICAL"]
    result = {}
    
    for level in levels:
        count = session.exec(
            select(func.count(LogEntry.id)).where(LogEntry.level == level)
        ).one() or 0
        result[level.lower()] = count
    
    return result


@router.get("/by-source")
def get_logs_by_source(session: Session = Depends(get_session)) -> Dict[str, int]:
    """Get log counts by source"""
    from sqlmodel import func
    
    sources = ["strategy", "broker", "system", "order", "webhook"]
    result = {}
    
    for source in sources:
        count = session.exec(
            select(func.count(LogEntry.id)).where(LogEntry.source == source)
        ).one() or 0
        result[source] = count
    
    return result
