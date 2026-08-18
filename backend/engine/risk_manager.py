import logging
import re
import time
import threading
from typing import Optional, List

logger = logging.getLogger(__name__)

from database import Session, engine
from models import RiskSettings, VirtualTrade, VirtualPortfolio
from sqlmodel import select

# Input validation constants
VALID_SIDES = {"BUY", "SELL"}
SYMBOL_PATTERN = re.compile(r'^[A-Z]+:[A-Z0-9\-]+$')  # e.g., NSE:NIFTY50-INDEX

# Cache TTL in seconds
CACHE_TTL_SECONDS = 0.1  # 100ms - refresh cache every 100ms

class RiskManager:
    """
    Risk Engine to enforce database RiskSettings, circuit breakers, 
    max open position limits, and daily loss limits before order execution.
    
    PERFORMANCE: Uses a 100ms cache to avoid DB queries on every order check.
    This reduces latency from 4-20ms to <1ms per check while maintaining
    near-real-time risk enforcement.
    """
    def __init__(self, max_drawdown_pct: float = 0.05, max_qty_per_order: int = 1000):
        self.max_drawdown_pct = max_drawdown_pct
        self.max_qty_per_order = max_qty_per_order
        self.current_drawdown_pct = 0.0
        
        # Cache for hot path optimization
        self._cache: dict = {}
        self._cache_time: float = 0.0
        self._cache_lock = threading.Lock()
    
    def _refresh_cache_if_needed(self):
        """
        Refreshes the cache if it's older than CACHE_TTL_SECONDS.
        Returns True if cache is fresh, False if refresh failed.
        """
        now = time.time()
        if now - self._cache_time < CACHE_TTL_SECONDS and self._cache:
            return True
        
        # P0 FIX: Add thread safety lock around cache refresh because process_tick runs in threadpool
        with self._cache_lock:
            try:
                with Session(engine) as session:
                    settings = session.get(RiskSettings, 1)
                    if not settings:
                        settings = RiskSettings(id=1)
                    
                    portfolio = session.get(VirtualPortfolio, 1)
                    open_trades = session.exec(
                        select(VirtualTrade).where(VirtualTrade.status == "OPEN")
                    ).all()
                    
                    self._cache = {
                        'settings': settings,
                        'portfolio': portfolio,
                        'open_trades': open_trades,
                        'open_trade_count': len(open_trades),
                        'unrealized_pnl': sum(t.pnl or 0.0 for t in open_trades),
                    }
                    self._cache_time = time.time()
                    return True
            except Exception as e:
                logger.error(f"Failed to refresh risk cache: {e}")
                return False

    def check_order(self, symbol: str, side: str, quantity: int, current_market_price: float = 0.0) -> bool:
        """
        Evaluates an order against global database RiskSettings and position limits.
        Returns True if allowed, False if rejected.
        """
        # Input validation - reject invalid inputs early
        if not symbol or not isinstance(symbol, str):
            logger.warning("Risk Check Failed: Invalid symbol (empty or wrong type)")
            return False
            
        if not SYMBOL_PATTERN.match(symbol):
            logger.warning(f"Risk Check Failed: Invalid symbol format: {symbol}")
            return False
            
        if not side or side.upper() not in VALID_SIDES:
            logger.warning(f"Risk Check Failed: Invalid side: {side}. Must be BUY or SELL.")
            return False
            
        if current_market_price < 0:
            logger.warning(f"Risk Check Failed: Price cannot be negative: {current_market_price}")
            return False
        
        if quantity <= 0:
            logger.warning("Risk Check Failed: Quantity must be greater than 0.")
            return False
            
        if quantity > self.max_qty_per_order:
            logger.warning(f"Risk Check Failed: Quantity {quantity} for {symbol} exceeds max allowed {self.max_qty_per_order}.")
            return False

        try:
            # PERFORMANCE: Use cached values (refreshed every 100ms)
            if not self._refresh_cache_if_needed():
                # Cache refresh failed - fail safe, reject order
                logger.error("Risk Check FAILED: Unable to refresh cache - Order REJECTED for safety")
                return False
            
            settings = self._cache.get('settings')
            if not settings:
                logger.error("Risk Check FAILED: No risk settings found")
                return False

            # 1. Circuit Breaker Check
            if settings.circuit_breaker_enabled and (self.current_drawdown_pct * 100.0 >= settings.circuit_breaker_threshold):
                logger.warning(f"Risk Check Failed: Circuit breaker active! Current drawdown ({self.current_drawdown_pct * 100:.2f}%) >= threshold ({settings.circuit_breaker_threshold}%). Order rejected.")
                return False

            # 2. Max Open Positions Check (Only for BUY / Position opening)
            if side.upper() == "BUY":
                open_trade_count = self._cache.get('open_trade_count', 0)
                if open_trade_count >= settings.max_open_positions:
                    logger.warning(f"Risk Check Failed: Max open positions limit reached ({open_trade_count} >= {settings.max_open_positions}). Order rejected.")
                    return False

            # 3. Daily Loss Limit Check
            portfolio = self._cache.get('portfolio')
            if portfolio:
                realized = portfolio.realized_pnl or 0.0
                unrealized = self._cache.get('unrealized_pnl', 0.0)
                total_pnl = realized + unrealized
                
                if total_pnl < 0 and abs(total_pnl) >= settings.daily_loss_limit:
                    logger.warning(f"Risk Check Failed: Daily loss limit reached (Current Loss: ₹{abs(total_pnl):,.2f} >= Limit: ₹{settings.daily_loss_limit:,.2f}). Order rejected.")
                    return False

        except Exception as e:
            # CRITICAL FIX: FAIL SAFE - Always reject orders on ANY error
            # This prevents orders from bypassing risk checks during database outages
            logger.error(f"Risk Check FAILED (exception): {e} - Order REJECTED for safety")
            return False

        logger.info(f"Risk Check Passed: {side} {quantity} {symbol}")
        return True
        
    def update_drawdown(self, new_drawdown_pct: float):
        """
        Updates the current global drawdown percentage.
        """
        self.current_drawdown_pct = new_drawdown_pct
