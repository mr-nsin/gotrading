import logging
import os
import uuid
from engine.broker.base import BaseBroker
from database import Session, engine
from models import VirtualTrade

try:
    from SmartApi import SmartConnect
except ImportError:
    SmartConnect = None

logger = logging.getLogger(__name__)

class AngelBroker(BaseBroker):
    """
    Integration for AngelOne API.
    """
    def __init__(self, user_id=None):
        super().__init__(user_id)
        
        self.client_code = os.getenv("ANGEL_CLIENT_CODE")
        self.password = os.getenv("ANGEL_PASSWORD")
        self.api_key = os.getenv("ANGEL_API_KEY")
        self.totp = os.getenv("ANGEL_TOTP")
        
        self.smartApi = None
        if self.client_code and self.password and self.api_key and SmartConnect:
            try:
                self.smartApi = SmartConnect(api_key=self.api_key)
                data = self.smartApi.generateSession(self.client_code, self.password, self.totp)
                if data and data.get('status'):
                    logger.info("AngelBroker initialized and connected.")
                else:
                    logger.error(f"AngelBroker connection failed: {data}")
            except Exception as e:
                logger.error(f"AngelBroker initialization error: {e}")
        else:
            logger.info("AngelBroker initialized in mock mode.")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[AngelOne] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        
        if is_paper_trading or not self.smartApi:
            order_id = f"mock_angel_{uuid.uuid4().hex[:8]}"
            logger.info(f"[{strategy_name}] PAPER TRADING: Mock Order placed successfully! Order ID: {order_id}")
            try:
                with Session(engine) as session:
                    new_trade = VirtualTrade(
                        strategy_name=strategy_name,
                        symbol=symbol,
                        side=side,
                        quantity=quantity,
                        entry_price=current_market_price
                    )
                    session.add(new_trade)
                    session.commit()
                    logger.info(f"VirtualTrade saved to DB: {new_trade.id}")
            except Exception as db_e:
                logger.error(f"Failed to save VirtualTrade to database: {db_e}")
                
            return order_id

        # Real Execution
        try:
            orderparams = {
                "variety": "NORMAL",
                "tradingsymbol": symbol,
                "symboltoken": "3045", # Token mapping might be needed based on symbol in real setup
                "transactiontype": side.upper(),
                "exchange": "NSE",
                "ordertype": "MARKET",
                "producttype": "INTRADAY",
                "duration": "DAY",
                "quantity": str(quantity)
            }
            order_id = self.smartApi.placeOrder(orderparams)
            logger.info(f"Real AngelOne Order placed: {order_id}")
            return order_id
        except Exception as e:
            logger.error(f"Failed to place real AngelOne order: {e}")
            return None
