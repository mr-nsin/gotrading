import logging
import uuid
import os
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver

from database import Session, engine
from models import VirtualTrade

logger = logging.getLogger(__name__)

class FivePaisaBroker(BaseBroker):
    """
    Integration for 5paisa API.
    """
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.client_code = os.getenv("5PAISA_CLIENT_CODE")
        self.password = os.getenv("5PAISA_PASSWORD")
        self.user_key = os.getenv("5PAISA_USER_KEY")
        self.app_source = os.getenv("5PAISA_APP_SOURCE")
        self.client = None

        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "5PAISA")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.client_id: self.client_code = decrypt_credential(cred.client_id)
                    if cred.zerodha_api_key: self.password = decrypt_credential(cred.zerodha_api_key)

        try:
            from py5paisa import FivePaisaClient
            if self.client_code and self.password:
                cred_dict = {
                    "appName": "GoTrading",
                    "appSource": self.app_source or "WEB",
                    "userId": self.client_code,
                    "password": self.password,
                    "userKey": self.user_key or "",
                    "encryptionKey": ""
                }
                self.client = FivePaisaClient(email="", passwd="", dob="", cred=cred_dict)
                self.client.login()
                logger.info("FivePaisaBroker initialized.")
        except Exception as e:
            logger.info(f"FivePaisaBroker initialized in mock mode ({e}).")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[5paisa] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        
        if is_paper_trading or not self.client:
            order_id = f"mock_5paisa_{uuid.uuid4().hex[:8]}"
            logger.info(f"[{strategy_name}] PAPER TRADING: Mock 5paisa Order placed! Order ID: {order_id}")
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
            except Exception as db_e:
                logger.error(f"Failed to save VirtualTrade to database: {db_e}")
            return order_id

        try:
            from py5paisa.order import OrderType, Exchange
            res = self.client.place_order(
                OrderType='B' if side.upper() == 'BUY' else 'S',
                Exchange='N',
                ExchangeSegment='C',
                ScripCode=int(self.resolver.resolve_token(symbol, "5PAISA") or 0),
                Qty=quantity,
                Price=current_market_price,
                IsIntraday=True
            )
            return str(res.get("BrokerOrderId")) if isinstance(res, dict) else None
        except Exception as e:
            logger.error(f"Failed to place real 5paisa order: {e}")
            return None

    def get_order_status(self, order_id: str) -> dict:
        if not self.client:
            return {"order_id": order_id, "status": "mock"}
        try:
            response = self.client.order_book()
            if response and isinstance(response, list):
                for order in response:
                    if str(order.get('BrokerOrderId')) == str(order_id) or str(order.get('ExchangeOrderId')) == str(order_id):
                        return {
                            "order_id": order_id,
                            "status": order.get("OrderStatus"),
                            "filled_quantity": order.get("TradedQty", 0),
                            "average_price": order.get("AveragePrice", 0),
                            "raw": order
                        }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.client:
            return []
        try:
            response = self.client.positions()
            if response and isinstance(response, list):
                normalized = []
                for p in response:
                    normalized.append({
                        "symbol": p.get("ScripName"),
                        "quantity": p.get("NetQty"),
                        "average_price": p.get("AveragePrice"),
                        "pnl": p.get("MTM"),
                        "product_type": p.get("OrderFor"),
                        "raw": p
                    })
                return normalized
            return []
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_margins(self) -> dict:
        if not self.client:
            return {"available": 0.0, "used": 0.0}
        try:
            response = self.client.margin()
            if response and isinstance(response, list) and len(response) > 0:
                data = response[0]
                return {
                    "available": float(data.get("AvailableMargin", 0)),
                    "used": float(data.get("UtilizedMargin", 0)),
                    "raw": data
                }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        import requests
        try:
            url = "https://images.5paisa.com/Master/SCRIPMASTER.csv"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                logger.info("Successfully fetched scrip master from 5paisa")
                return [{"raw_csv": True}]
            return []
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, "5PAISA", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            return []
        except Exception as e:
            logger.error(f"5paisa historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, "5PAISA", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            return {}
        except Exception as e:
            logger.error(f"5paisa market depth error: {e}")
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
                        "token": inst.fivepaisa_token,
                        "ltp": inst.ltp
                    }
                    if inst.option_type == "CE":
                        chain["calls"].append(item)
                    elif inst.option_type == "PE":
                        chain["puts"].append(item)

                return chain
        except Exception as e:
            logger.error(f"Error building option chain: {e}")
            return {"calls": [], "puts": []}
