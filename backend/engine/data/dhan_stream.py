import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

try:
    from dhanhq import marketfeed
except ImportError:
    marketfeed = None

from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class DhanDataPipeline(BaseDataPipeline):
    """
    Connects to DhanHQ Live WebSocket and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")
        
        if not self.client_id or not self.access_token:
            logger.warning("Dhan API Credentials missing. Cannot connect to Live WebSocket.")
            
        self.ws = None
        self._running = True

    def _on_message(self, ws, message):
        """Callback triggered by DhanHQ WebSocket on receiving data."""
        if not isinstance(message, dict):
            return

        bids = message.get("bids", [])
        asks = message.get("asks", [])
        
        if not bids and not asks and "depth" in message:
            depth = message.get("depth", {})
            bids = depth.get("buy", []) or depth.get("bids", [])
            asks = depth.get("sell", []) or depth.get("asks", [])

        if bids and asks:
            total_bid_qty = sum(b.get("quantity", b.get("volume", b.get("qty", 0))) for b in bids[:5])
            total_ask_qty = sum(a.get("quantity", a.get("volume", a.get("qty", 0))) for a in asks[:5])
            
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

        # Standard tick processing
        if "LTP" in message or "ltp" in message or "last_price" in message:
            event = {
                "type": "TICK",
                "data": message,
                "signals": {}
            }
            asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

    def _on_error(self, ws, error):
        logger.error(f"Dhan WebSocket Error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        logger.warning(f"Dhan WebSocket Closed: {close_msg}")

    def _on_open(self, ws):
        logger.info(f"Dhan WebSocket Opened. Connection established for {self.symbols}")

    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse raw broker websocket payloads into a StandardTick dictionary.
        """
        return message

    def connect(self):
        """Starts the Dhan WebSocket connection."""
        if not self.client_id or not self.access_token:
            logger.error("DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN must be set")
            return
            
        if marketfeed is None:
            logger.error("dhanhq python package is not installed.")
            return

        import time
        while self._running:
            try:
                # DhanHQ typically requires lists of tuples for instruments e.g. [(1, "1333")] 
                # or similar depending on the SDK version, this matches general Python feed design
                instruments = [(sym.split(':')[0], sym.split(':')[1]) if ':' in sym else (1, sym) for sym in self.symbols]
                
                # 23 = Full Market Depth for DhanHQ
                subscription_code = getattr(marketfeed, 'Ticker', type('Ticker', (), {'FULL': 23})).FULL
                
                self.ws = marketfeed.DhanFeed(
                    client_id=self.client_id,
                    access_token=self.access_token,
                    instruments=instruments,
                    subscription_code=subscription_code,
                    on_connect=self._on_open,
                    on_message=self._on_message,
                    on_close=self._on_close,
                    on_error=self._on_error
                )
                
                logger.info("Connecting to Dhan Live Data Pipeline...")
                self.ws.connect()
                
            except Exception as e:
                logger.error(f"Dhan Stream Error: {e}. Reconnecting in 5s...")
            
            if self._running:
                time.sleep(5)

    async def start_async(self):
        """Async wrapper to start the connection in a thread pool executor."""
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
        if self.ws:
            try:
                if hasattr(self.ws, 'close'):
                    self.ws.close()
                elif hasattr(self.ws, 'disconnect'):
                    self.ws.disconnect()
            except Exception:
                pass
