import logging
import math
from collections import deque

logger = logging.getLogger(__name__)

class VolatilitySkewStrategy:
    """
    Volatility Skew Trading Strategy.
    Quantitatively models the volatility skew by estimating the asymmetry 
    in the asset's return distribution (using a rolling ratio of downside 
    semi-variance to total variance).
    Trades are executed when the estimated skew crosses statistical thresholds.
    """
    def __init__(self, broker, symbol="NSE:NIFTY50-INDEX"):
        self.broker = broker
        self.symbol = symbol
        self.name = "VOL_SKEW"
        
        # Strategy Parameters
        self.skew_threshold = 0.6  # Execute if skew proxy exceeds +/- 0.6
        self.window_size = 50      # Number of ticks for rolling calculation
        
        # State
        self.history = deque(maxlen=self.window_size)
        self.current_skew_proxy = 0.0

    def process_tick(self, tick_data: dict):
        if tick_data.get('symbol') != self.symbol:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp <= 0.0:
            return
            
        self.history.append(ltp)
        
        if len(self.history) < self.window_size:
            return
            
        # Calculate recent returns
        returns = []
        prices = list(self.history)
        for i in range(1, len(prices)):
            returns.append(math.log(prices[i] / prices[i-1]))
            
        mean_return = sum(returns) / len(returns)
        
        # Calculate total variance, downside variance, and upside variance
        total_var = 0.0
        downside_var = 0.0
        upside_var = 0.0
        
        for r in returns:
            dev2 = (r - mean_return) ** 2
            total_var += dev2
            if r < 0:
                downside_var += dev2
            else:
                upside_var += dev2
                
        if total_var < 1e-8:
            return # Avoid division by zero in zero-volatility environment
            
        # Skew Proxy: normalized difference between downside and upside variance
        # Range is theoretically [-1, 1]
        self.current_skew_proxy = (downside_var - upside_var) / total_var
            
        # Check threshold
        if self.current_skew_proxy >= self.skew_threshold:
            # High downside variance -> Skew steepened significantly
            # Puts are relatively expensive, Calls are relatively cheap
            logger.info(f"[{self.name}] Skew extremely steep ({self.current_skew_proxy:.3f}). Selling Put / Buying Call.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-OPT",
                side="BUY", # Simulating the net delta / risk direction trade
                quantity=25, # 1 Nifty Lot
                current_market_price=ltp
            )
            # Clear history to avoid rapid re-triggering
            self.history.clear()
            self.current_skew_proxy = 0.0
            
        elif self.current_skew_proxy <= -self.skew_threshold:
            # High upside variance -> Skew inverted or flat
            # Calls are relatively expensive, Puts are relatively cheap
            logger.info(f"[{self.name}] Skew inverted or flat ({self.current_skew_proxy:.3f}). Buying Put / Selling Call.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-OPT",
                side="SELL",
                quantity=25, # 1 Nifty Lot
                current_market_price=ltp
            )
            # Clear history to avoid rapid re-triggering
            self.history.clear()
            self.current_skew_proxy = 0.0
