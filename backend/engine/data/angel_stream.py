import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv
from SmartApi.smartWebSocketV2 import SmartWebSocketV2

from engine.data.indicators import IndicatorEngine
from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class AngelDataPipeline(BaseDataPipeline):
    """
    Connects to AngelOne Live WebSocket and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        self.indicator_engine = IndicatorEngine()
        
        self.client_code = os.getenv("ANGEL_CLIENT_CODE")
        self.feed_token = os.getenv("ANGEL_FEED_TOKEN")
        self.api_key = os.getenv("ANGEL_API_KEY")
        
        if not self.client_code or not self.feed_token or not self.api_key:
            logger.warning("Angel API Credentials missing. Cannot connect to Live WebSocket.")
            
        self.sws = None
        self._running = True

    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse raw broker websocket payloads into a StandardTick dictionary.
        """
        return message

    def _on_message(self, ws, message):
        """Callback triggered by Angel WebSocket on receiving data."""
        if not isinstance(message, dict):
            if isinstance(message, list):
                for msg in message:
                    self._process_single_message(msg)
        else:
            self._process_single_message(message)

    def _process_single_message(self, message: Dict[str, Any]):
        bids = message.get("best_5_buy_data", [])
        asks = message.get("best_5_sell_data", [])
        
        if bids or asks:
            total_bid_qty = sum(bid.get("quantity", 0) for bid in bids)
            total_ask_qty = sum(ask.get("quantity", 0) for ask in asks)
            
            obi = 0.0
            if total_bid_qty + total_ask_qty > 0:
                obi = (total_bid_qty - total_ask_qty) / (total_bid_qty + total_ask_qty)
                
            message["obi"] = obi
            message["total_bid_qty"] = total_bid_qty
            message["total_ask_qty"] = total_ask_qty
            
            event = {
                "type": "DEPTH",
                "data": message,
                "signals": {}
            }
            asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

        ltp = message.get("last_traded_price")
        timestamp = message.get("exchange_timestamp", 0) 
        volume = message.get("volume_trade_for_the_day", 0)
        
        if ltp:
            if timestamp:
                self.indicator_engine.add_tick(timestamp, ltp, volume)
                
            signals = {
                "vwap": self.indicator_engine.get_vwap(),
                "supertrend": self.indicator_engine.get_supertrend()
            }
            
            event = {
                "type": "TICK",
                "data": message,
                "signals": signals
            }
            asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

    def _on_error(self, ws, error):
        logger.error(f"Angel WebSocket Error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        logger.warning(f"Angel WebSocket Closed: {close_msg}")

    def _on_open(self, ws):
        logger.info(f"Angel WebSocket Opened. Subscribing to: {self.symbols}")
        # The prompt specifies mode `mw` for market watch/depth
        token_list = [{"exchangeType": 1, "tokens": self.symbols}] if self.symbols else []
        if token_list:
            self.sws.subscribe("mw", token_list)

    def connect(self):
        """Starts the Angel WebSocket connection in its own thread."""
        if not self.client_code or not self.feed_token or not self.api_key:
            return

        import time
        while self._running:
            try:
                self.sws = SmartWebSocketV2(
                    auth_token=self.feed_token,
                    api_key=self.api_key,
                    client_code=self.client_code,
                    feed_token=self.feed_token
                )
                
                self.sws.on_open = self._on_open
                self.sws.on_message = self._on_message
                self.sws.on_error = self._on_error
                self.sws.on_close = self._on_close
                
                logger.info("Connecting to Angel Live Data Pipeline...")
                self.sws.connect()
            except Exception as e:
                logger.error(f"Angel Stream Error: {e}. Reconnecting in 5s...")
            
            if self._running:
                time.sleep(5)

    async def start_async(self):
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
        if self.sws:
            try:
                self.sws.close_connection()
            except Exception:
                pass
