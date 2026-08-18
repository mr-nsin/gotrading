import logging
import uuid
import os
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver

from database import Session, engine
from models import VirtualTrade

logger = logging.getLogger(__name__)

class UpstoxBroker(BaseBroker):
    """
    Integration for Upstox API.
    """
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.api_key = os.getenv("UPSTOX_API_KEY")
        self.api_secret = os.getenv("UPSTOX_API_SECRET")
        self.access_token = os.getenv("UPSTOX_ACCESS_TOKEN")
        self.client = None

        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "UPX")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.fyers_app_id: self.api_key = decrypt_credential(cred.fyers_app_id)
                    if cred.fyers_access_token: self.access_token = decrypt_credential(cred.fyers_access_token)

        try:
            import upstox_client
            if self.access_token:
                configuration = upstox_client.Configuration()
                configuration.access_token = self.access_token
                self.client = upstox_client.OrderApi(upstox_client.ApiClient(configuration))
                logger.info("UpstoxBroker initialized and connected.")
        except Exception as e:
            logger.info(f"UpstoxBroker initialized in mock mode ({e}).")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[Upstox] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        
        if is_paper_trading or not self.client:
            order_id = f"mock_upstox_{uuid.uuid4().hex[:8]}"
            logger.info(f"[{strategy_name}] PAPER TRADING: Mock Upstox Order placed! Order ID: {order_id}")
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
            import upstox_client
            body = upstox_client.PlaceOrderRequest(
                quantity=quantity,
                product="I",
                validity="DAY",
                price=current_market_price if current_market_price > 0 else 0.0,
                tag=strategy_name[:8],
                instrument_token=self.resolver.resolve_token(symbol, "UPX") or symbol,
                order_type="MARKET" if current_market_price == 0 else "LIMIT",
                transaction_type=side.upper(),
                disclosed_quantity=0,
                trigger_price=0.0,
                is_amo=False
            )
            api_response = self.client.place_order(body, api_version='2.0')
            return api_response.data.order_id if hasattr(api_response, 'data') else None
        except Exception as e:
            logger.error(f"Failed to place real Upstox order: {e}")
            return None

    def get_order_status(self, order_id: str) -> dict:
        if not self.client:
            return {"order_id": order_id, "status": "mock"}
        try:
            response = self.client.get_order_details(order_id)
            if response and hasattr(response, "data"):
                data = response.data
                return {
                    "order_id": order_id,
                    "status": getattr(data, "status", "UNKNOWN"),
                    "filled_quantity": getattr(data, "filled_quantity", 0),
                    "average_price": getattr(data, "average_price", 0),
                    "raw": str(data)
                }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.client:
            return []
        try:
            response = self.client.get_positions()
            if response and hasattr(response, "data"):
                normalized = []
                for p in response.data:
                    normalized.append({
                        "symbol": getattr(p, "trading_symbol", ""),
                        "quantity": getattr(p, "quantity", 0),
                        "average_price": getattr(p, "average_price", 0.0),
                        "pnl": getattr(p, "pnl", 0.0),
                        "product_type": getattr(p, "product", ""),
                        "raw": str(p)
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
            response = self.client.get_user_fund_margin()
            if response and hasattr(response, "data"):
                data = getattr(response.data, "equity", None)
                if data:
                    return {
                        "available": float(getattr(data, "available_margin", 0.0)),
                        "used": float(getattr(data, "used_margin", 0.0)),
                        "raw": str(data)
                    }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        import requests
        try:
            url = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                logger.info("Successfully fetched instruments from Upstox")
                return [{"raw_gzip": True}]
            return []
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, "UPX", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            res = self.client.get_historical_candle_data1(instrument_key=token, interval=resolution, to_date=to_date, from_date=from_date, api_version='2.0')
            return res.data.candles if res and hasattr(res, 'data') else []
        except Exception as e:
            logger.error(f"Upstox historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, "UPX", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            res = self.client.get_market_quote_str(instrument_key=token, api_version='2.0')
            return res.data if res and hasattr(res, 'data') else {}
        except Exception as e:
            logger.error(f"Upstox market depth error: {e}")
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
                        "token": inst.upstox_token,
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
