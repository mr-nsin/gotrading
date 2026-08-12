import os
import logging
from fyers_apiv3 import fyersModel
from database import Session, engine
from models import Order, User
from sqlmodel import select
from engine.risk_manager import RiskManager

logger = logging.getLogger(__name__)

from engine.broker.base import BaseBroker

class FyersBroker(BaseBroker):
    """
    Handles live order execution via the Fyers API.
    """
    def __init__(self, user_id=None):
        super().__init__(user_id)
        self.risk_manager = RiskManager()
        if not self.user_id:
            with Session(engine) as session:
                user = session.exec(select(User)).first()
                if user:
                    self.user_id = user.id

        self.app_id = os.getenv("FYERS_APP_ID")
        self.access_token = os.getenv("FYERS_ACCESS_TOKEN")
        self.fyers = None
        
        if self.app_id and self.access_token and self.app_id != "YOUR_APP_ID":
            self.fyers = fyersModel.FyersModel(
                client_id=self.app_id,
                is_async=False,
                token=self.access_token,
                log_path="./logs"
            )
            logger.info("FyersBroker initialized successfully.")
        else:
            logger.warning("FyersBroker running in degraded mode: API credentials missing.")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        """
        Places a live order via Fyers with symbol resolution & idempotency tracking.
        Side: 'BUY' or 'SELL'
        """
        from engine.data.symbol_resolver import SymbolResolver
        resolved = SymbolResolver.resolve_symbol(symbol)
        fyers_symbol = resolved["fyers"]
        display_symbol = resolved["display"]

        logger.info(f"[{strategy_name}] Signal received: {side} {quantity}x {display_symbol} ({fyers_symbol}) @ ~{current_market_price}")
        
        # Run through Risk Engine circuit breakers
        if not self.risk_manager.check_order(display_symbol, side, quantity, current_market_price):
            logger.warning(f"[{strategy_name}] Order REJECTED by Risk Engine: {side} {quantity}x {display_symbol}")
            return None

        if not self.fyers:
            logger.error(f"Cannot execute order for {fyers_symbol}: FyersModel not initialized.")
            return None

        # Convert side to Fyers format (1 = Buy, -1 = Sell)
        fyers_side = 1 if side.upper() == "BUY" else -1

        data = {
            "symbol": fyers_symbol,
            "qty": quantity,
            "type": 2, # 2 = Market Order, 1 = Limit
            "side": fyers_side,
            "productType": "INTRADAY", # INTRADAY, CNC, MARGIN
            "limitPrice": 0,
            "stopPrice": 0,
            "validity": "DAY",
            "disclosedQty": 0,
            "offlineOrder": False
        }

        try:
            is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
            if is_paper_trading:
                import uuid
                order_id = f"mock_{uuid.uuid4().hex[:8]}"
                logger.info(f"[{strategy_name}] PAPER TRADING: Mock Order placed successfully! Order ID: {order_id}")
                
                if self.user_id:
                    try:
                        with Session(engine) as session:
                            db_order = Order(
                                user_id=self.user_id,
                                broker_order_id=order_id,
                                symbol=symbol,
                                side=side,
                                quantity=quantity,
                                status="PLACED",
                                is_algo_trade=True
                            )
                            session.add(db_order)
                            session.commit()
                            logger.info(f"Order saved to DB: {db_order.id}")
                    except Exception as db_e:
                        logger.error(f"Failed to save order to database: {db_e}")
                        
                return order_id

            response = self.fyers.place_order(data=data)
            if response.get("s") == "ok":
                order_id = response.get("id")
                logger.info(f"[{strategy_name}] Order placed successfully! Order ID: {order_id}")
                
                if self.user_id:
                    try:
                        with Session(engine) as session:
                            db_order = Order(
                                user_id=self.user_id,
                                broker_order_id=order_id,
                                symbol=symbol,
                                side=side,
                                quantity=quantity,
                                status="PLACED",
                                is_algo_trade=True
                            )
                            session.add(db_order)
                            session.commit()
                            logger.info(f"Order saved to DB: {db_order.id}")
                    except Exception as db_e:
                        logger.error(f"Failed to save order to database: {db_e}")
                        
                return order_id
            else:
                error_msg = response.get("message")
                logger.error(f"[{strategy_name}] Order rejected by Fyers: {error_msg}")
                return None
        except Exception as e:
            logger.error(f"[{strategy_name}] Exception during order placement: {e}")
            return None
