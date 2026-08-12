from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class BaseBroker(ABC):
    """
    Abstract Base Class for all broker integrations.
    """
    def __init__(self, user_id=None):
        self.user_id = user_id

    @abstractmethod
    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        """
        Places a live order via the specific broker.
        Side: 'BUY' or 'SELL'
        """
        pass
