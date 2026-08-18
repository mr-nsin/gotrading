import os
import uuid
import logging
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver

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
        self.resolver = SymbolResolver()
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

    def get_order_status(self, order_id: str) -> dict:
        if not self.kite:
            return {"order_id": order_id, "status": "mock"}
        try:
            orders = self.kite.orders()
            for o in orders:
                if str(o.get("order_id")) == str(order_id):
                    return {
                        "order_id": order_id,
                        "status": o.get("status"),
                        "filled_quantity": o.get("filled_quantity"),
                        "average_price": o.get("average_price"),
                        "raw": o
                    }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.kite:
            return []
        try:
            pos = self.kite.positions()
            normalized = []
            for p in pos.get("net", []):
                normalized.append({
                    "symbol": p.get("tradingsymbol"),
                    "quantity": p.get("quantity"),
                    "average_price": p.get("average_price"),
                    "pnl": p.get("pnl"),
                    "product_type": p.get("product"),
                    "raw": p
                })
            return normalized
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_margins(self) -> dict:
        if not self.kite:
            return {"available": 0.0, "used": 0.0}
        try:
            margins = self.kite.margins()
            equity = margins.get("equity", {})
            return {
                "available": float(equity.get("available", {}).get("live_balance", 0)),
                "used": float(equity.get("utilised", {}).get("debits", 0)),
                "raw": equity
            }
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        if not self.kite:
            return []
        try:
            instruments = self.kite.instruments()
            logger.info(f"Successfully fetched {len(instruments)} instruments from Zerodha")
            return instruments
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.kite:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            return self.kite.historical_data(token, from_date, to_date, resolution)
        except Exception as e:
            logger.error(f"Zerodha historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.kite:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            res = self.kite.quote(f"{exchange}:{symbol}")
            return res.get(f"{exchange}:{symbol}", {}).get("depth", {})
        except Exception as e:
            logger.error(f"Zerodha market depth error: {e}")
            return {}

    def get_option_chain(self, underlying_symbol: str, expiry_date: str) -> dict:
        from sqlmodel import select
        from models import Instrument
        try:
            with Session(engine) as session:
                instruments = session.exec(
                    select(Instrument)
                    .where(Instrument.symbol.startswith(underlying_symbol))
                    .where(Instrument.segment == "OPT")
                ).all()

                chain = {"calls": [], "puts": []}
                for inst in instruments:
                    item = {
                        "symbol": inst.symbol,
                        "strike": inst.strike,
                        "token": inst.zerodha_token,
                        "ltp": inst.ltp
                    }
                    if inst.option_type == "CE":
                        chain["calls"].append(item)
                    elif inst.option_type == "PE":
                        chain["puts"].append(item)

                return chain
        except Exception as e:
            logger.error(f"Error building Zerodha option chain: {e}")
            return {"calls": [], "puts": []}
