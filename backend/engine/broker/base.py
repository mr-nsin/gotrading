from abc import ABC, abstractmethod
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class BaseBroker(ABC):
    """
    Abstract Base Class for all broker integrations.
    """
    def __init__(self, user_id=None):
        from engine.risk_manager import RiskManager
        self.user_id = user_id
        self.risk_manager = RiskManager()

    @abstractmethod
    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0) -> Optional[str]:
        """
        Places a live order via the specific broker.
        Side: 'BUY' or 'SELL'
        Returns the order ID if successful.
        """
        pass

    @abstractmethod
    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """
        Fetches the status of a specific order.
        Returns a normalized dictionary containing status, filled_quantity, avg_price, etc.
        """
        pass

    @abstractmethod
    def get_positions(self) -> List[Dict[str, Any]]:
        """
        Fetches the current open positions.
        Returns a list of normalized position dictionaries.
        """
        pass

    @abstractmethod
    def get_margins(self) -> Dict[str, float]:
        """
        Fetches available margins and funds.
        Returns a normalized dictionary e.g. {"available": 100000, "used": 50000}
        """
        pass

    @abstractmethod
    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> List[Dict[str, Any]]:
        """
        Fetches historical OHLCV data.
        Dates typically in "YYYY-MM-DD HH:MM:SS" format.
        Resolution: "1", "5", "15", "60", "1D" etc.
        Returns list of dicts with keys: time, open, high, low, close, volume
        """
        pass

    @abstractmethod
    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> Dict[str, Any]:
        """
        Fetches Level 2 market depth (order book) for a symbol.
        Returns normalized dict containing lists of bids and asks.
        """
        pass

    @abstractmethod
    def get_instrument_list(self) -> List[Dict[str, Any]]:
        """
        Fetches the master contract/instrument list from the broker to resolve trading symbols to tokens.
        """
        pass

    @abstractmethod
    def get_option_chain(self, underlying_symbol: str, expiry_date: str) -> Dict[str, Any]:
        """
        Fetches the option chain (CE and PE strikes) for a given underlying and expiry date.
        """
        pass
