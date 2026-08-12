import logging
import math
from collections import deque
from scipy.stats import norm

logger = logging.getLogger(__name__)

class InstitutionalDispersionStrategy:
    """
    Institutional Volatility Dispersion Strategy.
    Trades the spread between Index IV and the variance-weighted Constituent IV.
    """
    def __init__(self, broker, index_symbol="NSE:NIFTY50-INDEX"):
        self.broker = broker
        self.index_symbol = index_symbol
        self.name = "INSTITUTIONAL_DISPERSION"
        
        # Constituent dummy weights (generic for now)
        self.constituents = {
            "NSE:HDFCBANK": 0.15,
            "NSE:RELIANCE": 0.10,
            "NSE:ICICIBANK": 0.08,
            "NSE:INFY": 0.07,
            "NSE:TCS": 0.05
        }
        
        self.histories = {symbol: deque(maxlen=100) for symbol in [self.index_symbol] + list(self.constituents.keys())}
        self.iv_threshold = 0.02 # 2% spread
        
    def process_tick(self, tick_data: dict):
        symbol = tick_data.get('symbol')
        if symbol not in self.histories:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp <= 0.0:
            return
            
        self.histories[symbol].append(ltp)
        
        # Ensure we have enough history for all symbols
        if any(len(h) < 20 for h in self.histories.values()):
            return
            
        # Calculate Realized Volatility for each as a proxy for IV for now
        vols = {}
        for sym, history in self.histories.items():
            returns = []
            prices = list(history)
            for i in range(1, len(prices)):
                returns.append(math.log(prices[i] / prices[i-1]))
            mean_return = sum(returns) / len(returns)
            var = sum((r - mean_return) ** 2 for r in returns) / len(returns)
            sigma = math.sqrt(var) * math.sqrt(94500)
            vols[sym] = max(sigma, 0.001)
            
        index_iv = vols[self.index_symbol]
        
        # Calculate Constituent Implied Volatility (variance weighted)
        # Using a generic correlation assumption of 0.5 for demonstration
        implied_constituent_variance = 0.0
        for sym, weight in self.constituents.items():
            implied_constituent_variance += weight * (vols[sym] ** 2)
            
        constituent_iv = math.sqrt(implied_constituent_variance)
        
        spread = index_iv - constituent_iv
        
        # Logic: 
        # If index_iv > constituent_iv + threshold -> Index is expensive, sell index options, buy constituent options
        # If constituent_iv > index_iv + threshold -> Constituents are expensive, buy index options, sell constituent options
        
        if spread > self.iv_threshold:
            logger.info(f"[{self.name}] Spread high ({spread:.4f}). Index is expensive. Short Dispersion.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.index_symbol}-OPT",
                side="SELL",
                quantity=50,
                current_market_price=self.histories[self.index_symbol][-1]
            )
            self.histories = {sym: deque(maxlen=100) for sym in self.histories.keys()} # Reset after trade
        elif spread < -self.iv_threshold:
            logger.info(f"[{self.name}] Spread low ({spread:.4f}). Constituents are expensive. Long Dispersion.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.index_symbol}-OPT",
                side="BUY",
                quantity=50,
                current_market_price=self.histories[self.index_symbol][-1]
            )
            self.histories = {sym: deque(maxlen=100) for sym in self.histories.keys()} # Reset after trade
