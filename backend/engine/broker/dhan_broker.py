import os
import uuid
import logging
from database import Session, engine
from models import VirtualTrade
from engine.broker.base import BaseBroker
from engine.caching.symbol_resolver import SymbolResolver


try:
    from dhanhq import dhanhq
except ImportError:
    dhanhq = None

logger = logging.getLogger(__name__)

class DhanBroker(BaseBroker):
    """
    Integration for Dhan HQ API.
    """
    def __init__(self, user_id=None, broker_id=None):
        self.resolver = SymbolResolver()
        super().__init__(user_id)
        
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")
        
        if broker_id or user_id:
            from database import Session, engine
            from models import BrokerCredential
            from security import decrypt_credential
            from sqlmodel import select
            with Session(engine) as session:
                query = select(BrokerCredential).where(BrokerCredential.code == "DHANHQ")
                if broker_id:
                    query = query.where(BrokerCredential.id == broker_id)
                elif user_id:
                    query = query.where(BrokerCredential.user_id == user_id)
                cred = session.exec(query).first()
                if cred:
                    if cred.dhan_client_id: self.client_id = decrypt_credential(cred.dhan_client_id)
                    # Currently we don't store dhan_access_token explicitly, but assuming we might:
                    # if cred.dhan_access_token: self.access_token = decrypt_credential(cred.dhan_access_token)
                    
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

    def get_order_status(self, order_id: str) -> dict:
        if not self.dhan:
            return {"order_id": order_id, "status": "mock"}
        try:
            response = self.dhan.get_order_by_id(order_id)
            if response and response.get('status') == 'success':
                data = response.get('data', {})
                return {
                    "order_id": order_id,
                    "status": data.get("orderStatus"),
                    "filled_quantity": data.get("tradedQty", 0),
                    "average_price": data.get("tradedPrice", 0),
                    "raw": data
                }
            return {"order_id": order_id, "status": "NOT_FOUND"}
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            return {}

    def get_positions(self) -> list:
        if not self.dhan:
            return []
        try:
            response = self.dhan.get_positions()
            if response and response.get('status') == 'success':
                normalized = []
                for p in response.get('data', []):
                    normalized.append({
                        "symbol": p.get("tradingSymbol"),
                        "quantity": p.get("netQty"),
                        "average_price": p.get("costPrice"),
                        "pnl": p.get("realizedProfit", 0) + p.get("unrealizedProfit", 0),
                        "product_type": p.get("productType"),
                        "raw": p
                    })
                return normalized
            return []
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_margins(self) -> dict:
        if not self.dhan:
            return {"available": 0.0, "used": 0.0}
        try:
            response = self.dhan.get_fund_limits()
            if response and response.get('status') == 'success':
                data = response.get('data', {})
                return {
                    "available": data.get('availabelBalance', 0.0),
                    "used": data.get('utilizedAmount', 0.0),
                    "raw": data
                }
            return {"available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            return {"available": 0.0, "used": 0.0}

    def get_instrument_list(self) -> list:
        # Dhan provides CSV link for instruments
        # https://images.dhan.co/api-data/api-scrip-master.csv
        import requests
        try:
            url = "https://images.dhan.co/api-data/api-scrip-master.csv"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                logger.info("Successfully fetched scrip master from Dhan")
                return [{"raw_csv": True}]
            return []
        except Exception as e:
            logger.error(f"Error fetching instrument list: {e}")
            return []

    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.dhan:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        try:
            # Dhan API specific historical data fetch
            return []
        except Exception as e:
            logger.error(f"Dhan historical data error: {e}")
            return []

    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token or not self.dhan:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        try:
            # Dhan API specific market depth fetch
            return {}
        except Exception as e:
            logger.error(f"Dhan market depth error: {e}")
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
                        "token": inst.dhan_token,
                        "ltp": inst.ltp
                    }
                    if inst.option_type == "CE":
                        chain["calls"].append(item)
                    elif inst.option_type == "PE":
                        chain["puts"].append(item)

                return chain
        except Exception as e:
            logger.error(f"Error building Dhan option chain: {e}")
            return {"calls": [], "puts": []}
