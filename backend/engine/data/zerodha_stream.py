import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv
from kiteconnect import KiteTicker
from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class ZerodhaDataPipeline(BaseDataPipeline):
    """
    Connects to Zerodha Live WebSocket and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        
        self.api_key = os.getenv("ZERODHA_API_KEY")
        self.access_token = os.getenv("ZERODHA_ACCESS_TOKEN")
        
        if not self.api_key or not self.access_token:
            logger.warning("Zerodha API Credentials missing. Cannot connect to Live WebSocket.")
        
        self.kws = None
        self._running = True

    def _on_ticks(self, ws, ticks):
        """Callback triggered by Zerodha WebSocket on receiving ticks."""
        for tick in ticks:
            # Parse depth if available (Requires MODE_FULL)
            depth = tick.get("depth")
            if depth:
                bids = depth.get("buy", [])
                asks = depth.get("sell", [])
                
                total_bid_qty = sum(level.get("quantity", 0) for level in bids[:5])
                total_ask_qty = sum(level.get("quantity", 0) for level in asks[:5])
                
                obi = 0.0
                if total_bid_qty + total_ask_qty > 0:
                    obi = (total_bid_qty - total_ask_qty) / (total_bid_qty + total_ask_qty)
                    
                tick["obi"] = obi
                tick["total_bid_qty"] = total_bid_qty
                tick["total_ask_qty"] = total_ask_qty
                
                event = {
                    "type": "DEPTH",
                    "data": tick,
                    "signals": {}
                }
                asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

            # Standard Tick parsing
            ltp = tick.get("last_price")
            timestamp = tick.get("timestamp")
            
            if ltp:
                event = {
                    "type": "TICK",
                    "data": tick,
                    "signals": {}
                }
                asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

    def _on_connect(self, ws, response):
        logger.info(f"Zerodha WebSocket Opened. Subscribing to tokens (need token list, not symbol): {self.symbols}")
        # Note: Zerodha requires instrument tokens, not symbols. For simplicity, we assume `self.symbols` contains instrument tokens.
        try:
            tokens = [int(sym) for sym in self.symbols]
            ws.subscribe(tokens)
            ws.set_mode(ws.MODE_FULL, tokens)
        except ValueError:
            logger.error("Zerodha requires integer instrument tokens. Could not subscribe.")

    def _on_close(self, ws, code, reason):
        logger.warning(f"Zerodha WebSocket Closed: {code} - {reason}")

    def _on_error(self, ws, code, reason):
        logger.error(f"Zerodha WebSocket Error: {code} - {reason}")

    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Required by BaseDataPipeline, but parsing is done natively in _on_ticks.
        """
        return message

    def connect(self):
        """Starts the Zerodha WebSocket connection in its own thread."""
        if not self.api_key or not self.access_token:
            raise ValueError("ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN must be set in .env")

        import time
        while self._running:
            try:
                self.kws = KiteTicker(self.api_key, self.access_token)
                self.kws.on_ticks = self._on_ticks
                self.kws.on_connect = self._on_connect
                self.kws.on_close = self._on_close
                self.kws.on_error = self._on_error
                
                logger.info("Connecting to Zerodha Live Data Pipeline...")
                self.kws.connect(threaded=False)
            except Exception as e:
                logger.error(f"Zerodha Stream Error: {e}. Reconnecting in 5s...")
            
            if self._running:
                time.sleep(5)

    async def start_async(self):
        """Async wrapper to start the connection in a thread pool executor to not block the event loop."""
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
        if self.kws and self.kws.is_connected():
            self.kws.close()
