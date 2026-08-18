import logging
import uuid
import os
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver

from database import Session, engine
from models import VirtualTrade

logger = logging.getLogger(__name__)

class KotakNeoBroker(BaseBroker):
    """
    Integration for Kotak Neo API.
    """
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.client_code = os.getenv("KOTAK_CLIENT_CODE")
        self.password = os.getenv("KOTAK_PASSWORD")
        self.consumer_key = os.getenv("KOTAK_CONSUMER_KEY")
        self.consumer_secret = os.getenv("KOTAK_CONSUMER_SECRET")
        self.client = None

        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "KOTAK")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.client_id: self.client_code = decrypt_credential(cred.client_id)
                    if cred.zerodha_api_key: self.password = decrypt_credential(cred.zerodha_api_key)

        try:
            from ks_api_client import ks_api
            if self.consumer_key and self.consumer_secret:
                self.client = ks_api.KSApiClient(
                    access_token="",
                    user_id=self.client_code,
                    consumer_key=self.consumer_key,
                    app_id="1",
                    ip="127.0.0.1"
                )
                logger.info("KotakNeoBroker initialized.")
        except Exception as e:
            logger.info(f"KotakNeoBroker initialized in mock mode ({e}).")

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float = 0.0):
        logger.info(f"[KotakNeo] [{strategy_name}] Executing order: {side} {quantity}x {symbol} @ ~{current_market_price}")
        
        is_paper_trading = os.getenv("PAPER_TRADING", "True").lower() in ("true", "1", "yes", "t")
        
        if is_paper_trading or not self.client:
            order_id = f"mock_kotakneo_{uuid.uuid4().hex[:8]}"
            logger.info(f"[{strategy_name}] PAPER TRADING: Mock KotakNeo Order placed! Order ID: {order_id}")
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
            res = self.client.place_order(
                order_type="N",
                asset_code=self.resolver.resolve_token(symbol, "KOTAKNEO") or symbol,
                action="B" if side.upper() == "BUY" else "S",
                quantity=quantity,
                price=current_market_price,
                validity="GFD"
            )
            return str(res.get("nOrdNo")) if isinstance(res, dict) else None
        except Exception as e:
            logger.error(f"Failed to place real KotakNeo order: {e}")
            return None

    def get_order_status(self, order_id: str) -> dict:
        if not self.client:
            return {"order_id": order_id, "status": "mock"}
        try:
            response = self.client.order_report()
            if response and isinstance(response, list):
                for order in response:
                    if str(order.get('nOrdNo')) == str(order_id):
                        return {
                            "order_id": order_id,
                            "status": order.get("ordSt"),
                            "filled_quantity": order.get("fldQty", 0),
                            "average_price": order.get("avgPrc", 0),
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
                        "symbol": p.get("trdSym"),
                        "quantity": p.get("flsQty"),
                        "average_price": p.get("avgPrc"),
                        "pnl": p.get("mtm"),
                        "product_type": p.get("prdType"),
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
            response = self.client.limits()
            if response and isinstance(response, list) and len(response) > 0:
                data = response[0]
                return {
                    "available": float(data.get("marginAvailable", 0)),
                    "used": float(data.get("marginUtilized", 0)),
                    "raw": data
                }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        import requests
        try:
            return [{"mock": True}]
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, "KOTAKNEO", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            return []
        except Exception as e:
            logger.error(f"Kotak Neo historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, "KOTAKNEO", exchange)
        if not token or not self.client:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            return {}
        except Exception as e:
            logger.error(f"Kotak Neo market depth error: {e}")
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
                        "token": inst.kotakneo_token,
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
