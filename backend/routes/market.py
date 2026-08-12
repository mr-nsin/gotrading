from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import Dict, Any, List
from database import get_session
from models import Instrument
from datetime import datetime
import random

router = APIRouter(prefix="/api/v1/market", tags=["Market"])

# Simulated market data
INDICES = {
    "NIFTY": {"base": 24512.60, "name": "NIFTY 50"},
    "BANKNIFTY": {"base": 52218.40, "name": "BANK NIFTY"},
    "FINNIFTY": {"base": 23456.80, "name": "FIN NIFTY"},
    "SENSEX": {"base": 81234.50, "name": "SENSEX"}
}


def get_live_price(symbol: str, base: float) -> Dict[str, Any]:
    """Generate simulated live price"""
    random.seed(int(datetime.utcnow().timestamp() / 5))  # Changes every 5 seconds
    change_pct = random.gauss(0, 0.5)
    change = base * (change_pct / 100)
    ltp = base + change
    
    return {
        "symbol": symbol,
        "ltp": round(ltp, 2),
        "change": round(change, 2),
        "changePct": round(change_pct, 2),
        "high": round(ltp * 1.008, 2),
        "low": round(ltp * 0.992, 2),
        "open": round(base * 0.998, 2),
        "close": round(base, 2),
        "volume": random.randint(1000000, 50000000),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/stats")
def get_market_stats(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get market stats for NIFTY, BANKNIFTY, and India VIX (used in TopBar)"""
    nifty = get_live_price("NIFTY", INDICES["NIFTY"]["base"])
    banknifty = get_live_price("BANKNIFTY", INDICES["BANKNIFTY"]["base"])
    
    # Simulate India VIX data
    random.seed(int(datetime.utcnow().timestamp() / 5))
    vix_base = 14.25
    vix_change_pct = random.gauss(0, 2.5)
    vix_change = vix_base * (vix_change_pct / 100)
    vix_ltp = vix_base + vix_change
    
    return {
        "nifty": {
            "ltp": nifty["ltp"],
            "change": nifty["change"],
            "changePct": nifty["changePct"]
        },
        "bankNifty": {
            "ltp": banknifty["ltp"],
            "change": banknifty["change"],
            "changePct": banknifty["changePct"]
        },
        "indiaVix": {
            "ltp": round(vix_ltp, 2),
            "change": round(vix_change, 2),
            "changePct": round(vix_change_pct, 2)
        },
        "marketStatus": "open" if 9 <= datetime.utcnow().hour < 16 else "closed",
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/indices")
def get_all_indices(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get all major indices"""
    result = []
    for symbol, data in INDICES.items():
        price_data = get_live_price(symbol, data["base"])
        price_data["name"] = data["name"]
        result.append(price_data)
    return result


@router.get("/symbols/{symbol}/quote")
def get_symbol_quote(symbol: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get live quote for a symbol"""
    # Check if it's an index
    symbol_upper = symbol.upper()
    if symbol_upper in INDICES:
        return get_live_price(symbol_upper, INDICES[symbol_upper]["base"])
    
    # Check database for instrument
    instrument = session.exec(
        select(Instrument).where(Instrument.symbol == symbol_upper)
    ).first()
    
    if instrument:
        return {
            "symbol": instrument.symbol,
            "ltp": instrument.ltp,
            "change": round(instrument.ltp * (instrument.change_pct / 100), 2),
            "changePct": instrument.change_pct,
            "segment": instrument.segment,
            "timestamp": instrument.updated_at.isoformat() + "Z" if instrument.updated_at else None
        }
    
    # Generate simulated data for unknown symbols
    base_price = random.uniform(100, 5000)
    return get_live_price(symbol_upper, base_price)


@router.get("/watchlist")
def get_default_watchlist(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get default watchlist symbols"""
    symbols = [
        {"symbol": "RELIANCE", "base": 2984.50, "segment": "EQ"},
        {"symbol": "TCS", "base": 4128.90, "segment": "EQ"},
        {"symbol": "HDFCBANK", "base": 1682.30, "segment": "EQ"},
        {"symbol": "INFY", "base": 1875.60, "segment": "EQ"},
        {"symbol": "ICICIBANK", "base": 1248.75, "segment": "EQ"},
        {"symbol": "NIFTY AUG FUT", "base": 24512.60, "segment": "FUT"},
        {"symbol": "BANKNIFTY AUG FUT", "base": 52218.40, "segment": "FUT"},
        {"symbol": "NIFTY 25AUG 24500 CE", "base": 182.40, "segment": "OPT"},
        {"symbol": "BANKNIFTY 25AUG 52000 PE", "base": 244.15, "segment": "OPT"},
    ]
    
    result = []
    for s in symbols:
        price_data = get_live_price(s["symbol"], s["base"])
        price_data["segment"] = s["segment"]
        result.append(price_data)
    
    return result
