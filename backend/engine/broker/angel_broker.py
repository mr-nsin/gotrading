import logging
import os
import uuid
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver

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
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.client_code = os.getenv("ANGEL_CLIENT_CODE")
        self.password = os.getenv("ANGEL_PASSWORD")
        self.api_key = os.getenv("ANGEL_API_KEY")
        self.totp_secret = os.getenv("ANGEL_TOTP")
        
        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "SMARTAPI")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.angelone_client_code: self.client_code = decrypt_credential(cred.angelone_client_code)
                    if cred.angelone_password: self.password = decrypt_credential(cred.angelone_password)
                    if cred.angelone_api_key: self.api_key = decrypt_credential(cred.angelone_api_key)
                    if cred.angelone_totp_secret: self.totp_secret = decrypt_credential(cred.angelone_totp_secret)
        
        self.smartApi = None
        if self.client_code and self.password and self.api_key and SmartConnect:
            try:
                import pyotp
                self.smartApi = SmartConnect(api_key=self.api_key)
                current_totp = pyotp.TOTP(self.totp_secret).now() if self.totp_secret else "000000"
                data = self.smartApi.generateSession(self.client_code, self.password, current_totp)
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

    def get_order_status(self, order_id: str) -> dict:
        if not self.smartApi:
            return {"status": "mock", "order_id": order_id}
        try:
            order_book = self.smartApi.orderBook()
            if order_book and order_book.get("data"):
                for order in order_book["data"]:
                    if order.get("orderid") == order_id:
                        return {
                            "order_id": order_id,
                            "status": order.get("status"),
                            "filled_quantity": order.get("filledshares"),
                            "average_price": order.get("averageprice"),
                            "raw": order
                        }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.smartApi:
            return []
        try:
            res = self.smartApi.position()
            if res and res.get("data"):
                normalized = []
                for p in res["data"]:
                    normalized.append({
                        "symbol": p.get("tradingsymbol"),
                        "quantity": p.get("netqty"),
                        "average_price": p.get("netprice"),
                        "pnl": p.get("pnl"),
                        "product_type": p.get("producttype"),
                        "raw": p
                    })
                return normalized
            return []
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_margins(self) -> dict:
        if not self.smartApi:
            return {"available": 0.0, "used": 0.0}
        try:
            res = self.smartApi.rmsLimit()
            if res and res.get("data"):
                data = res["data"]
                return {
                    "available": float(data.get("netAvailableMargin", 0)),
                    "used": float(data.get("utilizedMargin", 0)),
                    "raw": data
                }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        import requests
        try:
            url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Successfully fetched {len(data)} instruments from Angel One")
                return data
            else:
                logger.error(f"Failed to fetch instrument list: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.smartApi:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            params = {
                "exchange": exchange,
                "symboltoken": token,
                "interval": resolution,
                "fromdate": from_date + " 00:00",
                "todate": to_date + " 23:59"
            }
            res = self.smartApi.getCandleData(params)
            return res.get('data', []) if res else []
        except Exception as e:
            logger.error(f"Angel historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.smartApi:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            res = self.smartApi.marketQuote("FULL", exchange, token)
            return res.get('data', {}).get('depth', {}) if res else {}
        except Exception as e:
            logger.error(f"Angel market depth error: {e}")
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
                        "token": inst.angelone_token,
                        "ltp": inst.ltp
                    }
                    if inst.option_type == "CE":
                        chain["calls"].append(item)
                    elif inst.option_type == "PE":
                        chain["puts"].append(item)

                return chain
        except Exception as e:
            logger.error(f"Error building AngelOne option chain: {e}")
            return {"calls": [], "puts": []}
