import logging
import math
from collections import deque
from scipy.stats import norm

logger = logging.getLogger(__name__)

class GammaScalpingStrategy:
    """
    Delta Neutral Gamma Scalping Strategy.
    Simulates checking Delta thresholds and sending Futures buy/sell signals to reset Delta to 0.
    """
    def __init__(self, broker, symbol="NSE:NIFTY50-INDEX"):
        self.broker = broker
        self.symbol = symbol
        self.name = "GAMMA_SCALPING"
        self.delta_threshold = 0.15  # Scalp when delta drifts beyond +/- 0.15
        
        # Strategy Parameters
        self.r = 0.05
        self.tte = 14 / 365.0
        
        # State
        self.strike = None
        self.history = deque(maxlen=100)
        self.current_simulated_delta = 0.0

    def process_tick(self, tick_data: dict):
        """
        Process incoming tick data. 
        In a real scenario, this would use an options pricing model (Black-Scholes) 
        to calculate real-time Delta of the straddle.
        """
        if tick_data.get('symbol') != self.symbol:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp == 0.0:
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
            
        # Calculate realized volatility
        mean_return = sum(returns) / len(returns)
        var = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        sigma = math.sqrt(var) * math.sqrt(94500)
        
        if sigma < 0.001:
            sigma = 0.001
            
        # Dynamically calculate d1 and d2 for the Black-Scholes model
        S = ltp
        K = self.strike
        d1 = (math.log(S / K) + (self.r + 0.5 * sigma**2) * self.tte) / (sigma * math.sqrt(self.tte))
        d2 = d1 - sigma * math.sqrt(self.tte)
        
        # Delta of Short Straddle = 1 - 2 * N(d1)
        self.current_simulated_delta = 1.0 - 2.0 * norm.cdf(d1)
            
        # Check threshold
        if self.current_simulated_delta >= self.delta_threshold:
            # We are too long delta. Sell futures to hedge.
            logger.info(f"[{self.name}] Delta drifted high ({self.current_simulated_delta:.2f}). Scalping Short.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="SELL",
                quantity=25, # 1 Nifty Lot
                current_market_price=ltp
            )
            self.strike = ltp
            self.current_simulated_delta = 0.0 # Reset
            
        elif self.current_simulated_delta <= -self.delta_threshold:
            # We are too short delta. Buy futures to hedge.
            logger.info(f"[{self.name}] Delta drifted low ({self.current_simulated_delta:.2f}). Scalping Long.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="BUY",
                quantity=25, # 1 Nifty Lot
                current_market_price=ltp
            )
            self.strike = ltp
            self.current_simulated_delta = 0.0 # Reset
