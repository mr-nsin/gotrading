import os
import uuid
import logging
from engine.broker.base import BaseBroker
from database import Session, engine
from models import VirtualTrade

try:
    from kiteconnect import KiteConnect
except ImportError:
    KiteConnect = None

logger = logging.getLogger(__name__)

class ZerodhaBroker(BaseBroker):
    """
    Integration for Zerodha API.
    """
    def __init__(self, user_id=None, broker_id=None):
        super().__init__(user_id)
        
        self.api_key = os.getenv("ZERODHA_API_KEY")
        self.access_token = os.getenv("ZERODHA_ACCESS_TOKEN")
        
        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "KITE")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.zerodha_api_key: self.api_key = decrypt_credential(cred.zerodha_api_key)
                    # Note: Zerodha requires generating the access_token from the api_secret via login. 
                    # If access_token isn't in DB, we rely on the connect endpoint generating it and storing it maybe?
                    # For now, if we have api_key, we set it.
                    
        self.kite = None
        
        if self.api_key and self.access_token and KiteConnect:
            self.kite = KiteConnect(api_key=self.api_key)
            self.kite.set_access_token(self.access_token)
            logger.info("ZerodhaBroker initialized and connected.")
        else:
            logger.info("ZerodhaBroker initialized in mock mode.")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[Zerodha] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        if is_paper_trading or not self.kite:
            order_id = f"mock_zerodha_{uuid.uuid4().hex[:8]}"
            logger.info(f"[{strategy_name}] PAPER TRADING: Mock Order placed successfully! Order ID: {order_id}")
            
            try:
                with Session(engine) as session:
                    v_trade = VirtualTrade(
                        strategy_name=strategy_name,
                        symbol=symbol,
                        side=side,
                        quantity=quantity,
                        entry_price=current_market_price,
                        status="OPEN"
                    )
                    session.add(v_trade)
                    session.commit()
                    logger.info(f"VirtualTrade saved to DB: {v_trade.id}")
            except Exception as db_e:
                logger.error(f"Failed to save VirtualTrade to database: {db_e}")
                
            return order_id

        # Real Execution
        try:
            order_id = self.kite.place_order(
                tradingsymbol=symbol,
                exchange=self.kite.EXCHANGE_NSE,
                transaction_type=self.kite.TRANSACTION_TYPE_BUY if side.upper() == 'BUY' else self.kite.TRANSACTION_TYPE_SELL,
                quantity=quantity,
                order_type=self.kite.ORDER_TYPE_MARKET,
                product=self.kite.PRODUCT_MIS,
                variety=self.kite.VARIETY_REGULAR
            )
            logger.info(f"Real Zerodha Order placed: {order_id}")
            return order_id
        except Exception as e:
            logger.error(f"Failed to place real Zerodha order: {e}")
            return None
