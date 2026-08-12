import logging
import math
from collections import deque
from scipy.stats import norm

logger = logging.getLogger(__name__)

class DeltaHedgingStrategy:
    """
    Delta Hedging Strategy.
    Quantitatively calculates the delta of an assumed short straddle position using a dynamically
    updated Black-Scholes approximation. When the delta exceeds a statistical threshold, 
    it executes a hedging trade.
    """
    def __init__(self, broker, symbol="NSE:NIFTY50-INDEX"):
        self.broker = broker
        self.symbol = symbol
        self.name = "DELTA_HEDGING"
        
        # Strategy Parameters
        self.delta_threshold = 0.10  # Hedge if delta magnitude > 0.10
        self.r = 0.05                # Risk-free rate (5%)
        self.tte = 14 / 365.0        # Time to expiration (14 days)
        
        # State variables
        self.strike = None
        self.history = deque(maxlen=100) # Store recent prices to calculate realized volatility
        self.current_delta = 0.0
        self.hedged_quantity = 0

    def process_tick(self, tick_data: dict):
        if tick_data.get('symbol') != self.symbol:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp <= 0.0:
            return
            
        self.history.append(ltp)
        
        # Wait for enough history to calculate volatility
        if len(self.history) < 20:
            self.strike = ltp # Initialize strike at ATM
            return
            
        # Calculate recent returns
        returns = []
        prices = list(self.history)
        for i in range(1, len(prices)):
            returns.append(math.log(prices[i] / prices[i-1]))
            
        # Calculate realized volatility (annualized assuming 252 trading days, 375 minutes per day, roughly 94500 periods)
        # Using a fixed multiplier for tick/minute data approximation
        mean_return = sum(returns) / len(returns)
        var = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        sigma = math.sqrt(var) * math.sqrt(94500) # rough annualized vol for tick data
        
        # Prevent division by zero
        if sigma < 0.001:
            sigma = 0.001
            
        # Dynamically calculate d1 and d2 for the Black-Scholes model
        S = ltp
        K = self.strike
        d1 = (math.log(S / K) + (self.r + 0.5 * sigma**2) * self.tte) / (sigma * math.sqrt(self.tte))
        d2 = d1 - sigma * math.sqrt(self.tte)
        
        # Delta of Short Straddle = - (Call Delta + Put Delta) = 1 - 2 * N(d1)
        self.current_delta = 1.0 - 2.0 * norm.cdf(d1)
        
        # Check if delta drifted beyond threshold
        if self.current_delta >= self.delta_threshold:
            # We are long delta -> Need to sell to hedge
            hedge_qty = int(self.current_delta * 100)  # Scale to some lot size
            logger.info(f"[{self.name}] Delta drifted high ({self.current_delta:.3f}). Selling {hedge_qty} units to hedge.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="SELL",
                quantity=hedge_qty,
                current_market_price=ltp
            )
            self.strike = ltp # Reset strike (equivalent to rolling the straddle to ATM)
            self.current_delta = 0.0
            
        elif self.current_delta <= -self.delta_threshold:
            # We are short delta -> Need to buy to hedge
            hedge_qty = int(abs(self.current_delta) * 100)
            logger.info(f"[{self.name}] Delta drifted low ({self.current_delta:.3f}). Buying {hedge_qty} units to hedge.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="BUY",
                quantity=hedge_qty,
                current_market_price=ltp
            )
            self.strike = ltp # Reset strike
            self.current_delta = 0.0
