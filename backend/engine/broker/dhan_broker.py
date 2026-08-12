import os
import uuid
import logging
from database import Session, engine
from models import VirtualTrade
from engine.broker.base import BaseBroker

try:
    from dhanhq import dhanhq
except ImportError:
    dhanhq = None

logger = logging.getLogger(__name__)

class DhanBroker(BaseBroker):
    """
    Integration for Dhan HQ API.
    """
    def __init__(self, user_id=None):
        super().__init__(user_id)
        
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")
        self.dhan = None
        
        if self.client_id and self.access_token and dhanhq:
            self.dhan = dhanhq(self.client_id, self.access_token)
            logger.info("DhanBroker initialized and connected.")
        else:
            logger.info("DhanBroker initialized in mock mode.")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[Dhan] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        
        if is_paper_trading or not self.dhan:
            order_id = f"mock_dhan_{uuid.uuid4().hex[:8]}_{symbol}_{side}"
            try:
                with Session(engine) as session:
                    virtual_trade = VirtualTrade(
                        strategy_name=strategy_name,
                        symbol=symbol,
                        side=side,
                        quantity=quantity,
                        entry_price=current_market_price
                    )
                    session.add(virtual_trade)
                    session.commit()
                    logger.info(f"[{strategy_name}] Mock Dhan order saved as VirtualTrade: {virtual_trade.id}")
            except Exception as e:
                logger.error(f"Failed to save VirtualTrade to database: {e}")
                
            return order_id
            
        # Real Execution
        try:
            order = self.dhan.place_order(
                security_id=symbol, # Requires instrument token mapping in a fully real environment
                exchange_segment=self.dhan.NSE,
                transaction_type=self.dhan.BUY if side.upper() == 'BUY' else self.dhan.SELL,
                quantity=quantity,
                order_type=self.dhan.MARKET,
                product_type=self.dhan.INTRA,
                price=0
            )
            logger.info(f"Real Dhan Order placed: {order}")
            return order.get('data', {}).get('orderId') if isinstance(order, dict) else str(order)
        except Exception as e:
            logger.error(f"Failed to place real Dhan order: {e}")
            return None
