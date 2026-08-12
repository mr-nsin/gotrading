import logging

logger = logging.getLogger(__name__)

# Lot sizes for common indices - these change periodically
LOT_SIZES = {
    "NSE:NIFTY50-INDEX": 25,
    "NSE:BANKNIFTY-INDEX": 15,
    "NSE:FINNIFTY-INDEX": 40,
}

class OBIHFTStrategy:
    """
    Order Book Imbalance (HFT).
    Executes directional trades based on real Bid-Ask imbalance from L2 market depth data.
    
    The OBI (Order Book Imbalance) is calculated as:
    OBI = (TotalBidQty - TotalAskQty) / (TotalBidQty + TotalAskQty)
    
    Range: [-1, 1]
    - OBI > threshold: More buying pressure -> Go Long
    - OBI < -threshold: More selling pressure -> Go Short
    """
    def __init__(self, broker, symbol="NSE:NIFTY50-INDEX"):
        self.broker = broker
        self.symbol = symbol
        self.name = "OBI_HFT"
        self.imbalance_threshold = 0.4  # 40% imbalance triggers trade
        
        # State tracking
        self.current_obi = 0.0
        self.last_obi = 0.0
        self.position = 0  # Track current position
        self.cooldown_ticks = 0  # Prevent overtrading
        self.min_cooldown = 10  # Minimum ticks between trades
        
        # Get lot size for symbol
        self.lot_size = LOT_SIZES.get(symbol, 25)

    def process_depth(self, depth_data: dict):
        """
        Process order book depth data to calculate real OBI.
        Called when DEPTH events are received.
        """
        # Extract real OBI calculated in fyers_stream.py from actual bid/ask data
        obi = depth_data.get('obi')
        
        if obi is not None:
            self.last_obi = self.current_obi
            self.current_obi = obi
            
    def process_tick(self, tick_data: dict):
        """
        Process incoming tick data.
        Uses REAL order book imbalance data from market depth.
        """
        if tick_data.get('symbol') != self.symbol:
            return
            
        ltp = tick_data.get('ltp', 0.0)
        if ltp == 0.0:
            return
        
        # Check if we have real OBI data from depth events
        # OBI is calculated from L2 market depth in fyers_stream.py
        obi = tick_data.get('obi')
        if obi is not None:
            self.last_obi = self.current_obi
            self.current_obi = obi
        
        # Cooldown check - prevent overtrading
        if self.cooldown_ticks > 0:
            self.cooldown_ticks -= 1
            return
            
        # Only trade on significant imbalance with real data
        # OBI range is [-1, 1], where:
        #   1 = 100% bid pressure (all buyers, no sellers)
        #  -1 = 100% ask pressure (all sellers, no buyers)
        #   0 = balanced
        
        if self.current_obi >= self.imbalance_threshold and self.position <= 0:
            # High bid imbalance (buying pressure) -> Go Long
            logger.info(f"[{self.name}] High Bid Imbalance (OBI: {self.current_obi:.3f}). Going Long.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="BUY",
                quantity=self.lot_size,
                current_market_price=ltp
            )
            self.position = 1
            self.cooldown_ticks = self.min_cooldown
            
        elif self.current_obi <= -self.imbalance_threshold and self.position >= 0:
            # High ask imbalance (selling pressure) -> Go Short
            logger.info(f"[{self.name}] High Ask Imbalance (OBI: {self.current_obi:.3f}). Going Short.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="SELL",
                quantity=self.lot_size,
                current_market_price=ltp
            )
            self.position = -1
            self.cooldown_ticks = self.min_cooldown
            
        # Exit on reversal (OBI crosses zero with momentum)
        elif self.position > 0 and self.current_obi < 0 and self.last_obi >= 0:
            # Long position and OBI turned negative -> Exit
            logger.info(f"[{self.name}] OBI reversed to negative ({self.current_obi:.3f}). Exiting Long.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="SELL",
                quantity=self.lot_size,
                current_market_price=ltp
            )
            self.position = 0
            self.cooldown_ticks = self.min_cooldown
            
        elif self.position < 0 and self.current_obi > 0 and self.last_obi <= 0:
            # Short position and OBI turned positive -> Exit
            logger.info(f"[{self.name}] OBI reversed to positive ({self.current_obi:.3f}). Exiting Short.")
            self.broker.execute_order(
                strategy_name=self.name,
                symbol=f"{self.symbol}-FUT",
                side="BUY",
                quantity=self.lot_size,
                current_market_price=ltp
            )
            self.position = 0
            self.cooldown_ticks = self.min_cooldown
