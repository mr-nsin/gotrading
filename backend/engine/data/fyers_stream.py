import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv
from fyers_apiv3.FyersWebsocket import data_ws
from engine.data.indicators import IndicatorEngine
from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class FyersDataPipeline(BaseDataPipeline):
    """
    Connects to Fyers Live WebSocket and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        self.indicator_engine = IndicatorEngine()
        self._dropped_ticks = 0  # Counter for monitoring queue overflow
        
        self.app_id = os.getenv("FYERS_APP_ID")
        self.access_token = os.getenv("FYERS_ACCESS_TOKEN")
        
        if not self.app_id or not self.access_token or self.app_id == "YOUR_APP_ID":
            logger.warning("Fyers API Credentials missing. Cannot connect to Live WebSocket.")
            self.access_token_full = ""
        else:
            self.access_token_full = f"{self.app_id}:{self.access_token}"

        self.fs = None
        self._running = True

    def parse_tick(self, raw_data: Any) -> Dict[str, Any]:
        """Implement abstract method required by BaseDataPipeline."""
        return raw_data
    
    def _safe_queue_put(self, event: Dict[str, Any]):
        """
        Safely put event into queue without blocking.
        Drops event if queue is full to prevent WebSocket thread blocking.
        """
        try:
            # Use put_nowait to avoid blocking the WebSocket callback thread
            future = asyncio.run_coroutine_threadsafe(
                self._try_put_nowait(event), 
                self.loop
            )
            # Don't wait for result - fire and forget
        except Exception as e:
            self._dropped_ticks += 1
            if self._dropped_ticks % 100 == 0:  # Log every 100 drops
                logger.warning(f"Queue overflow: dropped {self._dropped_ticks} ticks total")
    
    async def _try_put_nowait(self, event: Dict[str, Any]):
        """Async helper to put with nowait semantics."""
        try:
            self.event_queue.put_nowait(event)
        except asyncio.QueueFull:
            self._dropped_ticks += 1
            symbol = event.get('data', {}).get('symbol', 'unknown')
            if self._dropped_ticks % 100 == 0:
                logger.warning(f"Queue full: dropped tick for {symbol}. Total dropped: {self._dropped_ticks}")

    def _on_message(self, message: Dict[str, Any]):
        """Callback triggered by Fyers WebSocket on receiving data in a separate thread."""
        if "bids" in message and "asks" in message:
            bids = message.get("bids") or []
            asks = message.get("asks") or []
            
            total_bid_qty = sum(bid.get("volume", 0) for bid in bids[:5])
            total_ask_qty = sum(ask.get("volume", 0) for ask in asks[:5])
            
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
            # Use non-blocking put to prevent WebSocket thread from blocking
            self._safe_queue_put(event)

        if "symbol" in message and "ltp" in message:
            ltp = message.get("ltp")
            # Fyers timestamp is usually epoch, convert or use directly. We use directly for now.
            timestamp = message.get("timestamp", 0) 
            volume = message.get("vol_traded_today", 0)
            
            if ltp and timestamp:
                self.indicator_engine.add_tick(timestamp, ltp, volume)
                
            # Get real-time signals from OpenAlgo Rust Engine
            signals = {
                "vwap": self.indicator_engine.get_vwap(),
                "supertrend": self.indicator_engine.get_supertrend()
            }
            
            # We wrap the Fyers tick in our own internal event format
            event = {
                "type": "TICK",
                "data": message,
                "signals": signals
            }
            # Safely put the event into the asyncio queue without blocking
            self._safe_queue_put(event)

    def _on_error(self, message: Dict[str, Any]):
        logger.error(f"Fyers WebSocket Error: {message}")

    def _on_close(self, message: Dict[str, Any]):
        logger.warning(f"Fyers WebSocket Closed: {message}")

    def _on_open(self):
        logger.info(f"Fyers WebSocket Opened. Subscribing to: {self.symbols}")
        # data_type = "SymbolUpdate" (Tick data)
        self.fs.subscribe(symbol=self.symbols, data_type="SymbolUpdate")
        # Subscribe to Level 2 Market Depth
        self.fs.subscribe(symbol=self.symbols, data_type="DepthUpdate")

    def add_symbols(self, new_symbols: List[str]):
        """Dynamically add symbols to the subscription."""
        for sym in new_symbols:
            if sym not in self.symbols:
                self.symbols.append(sym)
                
        if self.fs:
            try:
                self.fs.subscribe(symbol=new_symbols, data_type="SymbolUpdate")
                self.fs.subscribe(symbol=new_symbols, data_type="DepthUpdate")
                logger.info(f"Subscribed to new symbols: {new_symbols}")
            except Exception as e:
                logger.error(f"Error subscribing to symbols {new_symbols}: {e}")

    def connect(self):
        """Starts the Fyers WebSocket connection in its own thread."""
        if not self.access_token_full:
            logger.warning("FYERS_APP_ID and FYERS_ACCESS_TOKEN not set. Fyers stream disabled.")
            return

        import time
        while self._running:
            try:
                self.fs = data_ws.FyersDataSocket(
                    access_token=self.access_token_full,
                    log_path="./logs",  # Fyers logs
                    litemode=False,
                    write_to_file=False,
                    reconnect=True,
                    on_connect=self._on_open,
                    on_close=self._on_close,
                    on_error=self._on_error,
                    on_message=self._on_message
                )
                
                logger.info("Connecting to Fyers Live Data Pipeline...")
                # Note: fs.connect() is blocking. We should run it in an executor, 
                # or call fs.keep_running() depending on fyers API structure. 
                # In fyers_apiv3, fs.connect() starts the websocket. We will run it in a thread.
                self.fs.connect()
            except Exception as e:
                logger.error(f"Fyers Stream Error: {e}. Reconnecting in 5s...")
            
            if self._running:
                time.sleep(5)

    async def start_async(self):
        """Async wrapper to start the connection in a thread pool executor to not block the event loop."""
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
        if self.fs:
            try:
                self.fs.unsubscribe(symbol=self.symbols, data_type="SymbolUpdate")
                self.fs.unsubscribe(symbol=self.symbols, data_type="DepthUpdate")
            except Exception:
                pass
            # Currently Fyers api doesn't have an explicit close, but disconnecting network will close it.
            # We could just let the process die.
