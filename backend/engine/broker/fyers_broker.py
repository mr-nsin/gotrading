import os
import logging
from fyers_apiv3 import fyersModel
from database import Session, engine
from models import Order, User
from sqlmodel import select
from engine.risk_manager import RiskManager

logger = logging.getLogger(__name__)

from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver


class FyersBroker(BaseBroker):
    """
    Handles live order execution via the Fyers API.
    """
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.client_id = os.getenv("FYERS_CLIENT_ID")
        self.access_token = os.getenv("FYERS_ACCESS_TOKEN")
        
        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "FYERS-V3")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.fyers_app_id: self.client_id = decrypt_credential(cred.fyers_app_id)
                    if cred.fyers_access_token: self.access_token = decrypt_credential(cred.fyers_access_token)
                    
        self.fyers = None
        
        if self.client_id and self.access_token and self.client_id != "YOUR_APP_ID":
            self.fyers = fyersModel.FyersModel(
                client_id=self.client_id,
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
            logger.error(f"Failed to place real Fyers order: {e}")
            return None

    def get_order_status(self, order_id: str) -> dict:
        if not self.fyers:
            return {"order_id": order_id, "status": "mock"}
        try:
            response = self.fyers.orderbook()
            if response and response.get("s") == "ok":
                for order in response.get("orderBook", []):
                    if str(order.get("id")) == str(order_id):
                        return {
                            "order_id": order_id,
                            "status": order.get("status"), # 2 means traded, 6 means cancelled, etc. depending on API
                            "filled_quantity": order.get("filledQty"),
                            "average_price": order.get("tradedPrice"),
                            "raw": order
                        }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.fyers:
            return []
        try:
            response = self.fyers.positions()
            if response and response.get("s") == "ok":
                normalized = []
                for p in response.get("netPositions", []):
                    normalized.append({
                        "symbol": p.get("symbol"),
                        "quantity": p.get("netQty"),
                        "average_price": p.get("avgPrice"),
                        "pnl": p.get("pl"),
                        "product_type": p.get("productType"),
                        "raw": p
                    })
                return normalized
            return []
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_margins(self) -> dict:
        if not self.fyers:
            return {"available": 0.0, "used": 0.0}
        try:
            response = self.fyers.funds()
            if response and response.get("s") == "ok":
                funds = response.get("fund_limit", [])
                # Depending on fyers response structure for funds
                # For now just stubbing parse logic
                available = 0.0
                used = 0.0
                for item in funds:
                    if item.get("title") == "Available Balance":
                        available = float(item.get("equityAmount", 0))
                    elif item.get("title") == "Utilized Amount":
                        used = float(item.get("equityAmount", 0))
                return {
                    "available": available,
                    "used": used,
                    "raw": response
                }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        # Fyers provides CSV links per exchange:
        # https://public.fyers.in/sym_details/NSE_CM.csv
        # https://public.fyers.in/sym_details/NSE_FO.csv
        import requests
        if not self.fyers:
            return []
        try:
            url = "https://public.fyers.in/sym_details/NSE_CM.csv"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                logger.info("Successfully fetched NSE_CM symbols from Fyers")
                # Need CSV parsing, but returning raw text or mock list for now as stub
                return [{"raw_csv": True}]
            return []
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.fyers:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            data = {"symbol": token, "resolution": resolution, "date_format": "1", "range_from": from_date, "range_to": to_date, "cont_flag": "1"}
            res = self.fyers.history(data=data)
            return res.get('candles', []) if res else []
        except Exception as e:
            logger.error(f"Fyers historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.fyers:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            data = {"symbols": token}
            res = self.fyers.depth(data=data)
            return res.get('d', {}).get(token, {}) if res else {}
        except Exception as e:
            logger.error(f"Fyers market depth error: {e}")
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
                        "token": inst.fyers_token,
                        "ltp": inst.ltp
                    }
                    if inst.option_type == "CE":
                        chain["calls"].append(item)
                    elif inst.option_type == "PE":
                        chain["puts"].append(item)

                return chain
        except Exception as e:
            logger.error(f"Error building Fyers option chain: {e}")
            return {"calls": [], "puts": []}
