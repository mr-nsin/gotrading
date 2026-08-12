import logging
import random

logger = logging.getLogger(__name__)

class StatArbOUStrategy:
    """
    Statistical Arbitrage (Ornstein-Uhlenbeck).
    Simulates mean reversion pairs trading based on z-score of spread.
    """
    def __init__(self, broker, symbol="NSE:BANKNIFTY-INDEX"):
        self.broker = broker
        self.symbol = symbol
        self.name = "STAT_ARB_OU"
        self.z_score_threshold = 2.0
        
        # State
        self.current_z_score = 0.0

    def process_tick(self, tick_data: dict):
        """
        Process incoming tick data.
        In a real scenario, this would calculate the real-time spread and z-score 
        between two highly correlated assets.
        """
        if tick_data.get('symbol') != self.symbol:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp == 0.0:
            return
            
        # --- Simplified Simulation Logic ---
        # Simulate z-score drift
        drift = random.uniform(-0.5, 0.5)
        self.current_z_score += drift
            
        # Check threshold
        if self.current_z_score >= self.z_score_threshold:
            logger.info(f"[{self.name}] Z-Score high ({self.current_z_score:.2f}). Shorting Spread.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="SELL",
                quantity=15, # 1 BankNifty Lot
                current_market_price=ltp
            )
            self.current_z_score = 0.0 # Reset
            
        elif self.current_z_score <= -self.z_score_threshold:
            logger.info(f"[{self.name}] Z-Score low ({self.current_z_score:.2f}). Buying Spread.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="BUY",
                quantity=15, # 1 BankNifty Lot
                current_market_price=ltp
            )
            self.current_z_score = 0.0 # Reset
