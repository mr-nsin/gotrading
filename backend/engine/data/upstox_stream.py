import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class UpstoxDataPipeline(BaseDataPipeline):
    """
    Connects to Upstox Live WebSocket Feed and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        
        self.access_token = os.getenv("UPSTOX_ACCESS_TOKEN")
        if not self.access_token:
            logger.warning("Upstox Access Token missing. Cannot connect to Live WebSocket.")
            
        self.ws = None
        self._running = True

    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        return message

    def _on_message(self, ws, message):
        if not isinstance(message, dict):
            return

        ltp = message.get("ltp") or message.get("last_price")
        if ltp:
            event = {
                "type": "TICK",
                "data": message,
                "signals": {}
            }
            asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

    def connect(self):
        if not self.access_token:
            return
            
        import time
        while self._running:
            try:
                logger.info(f"Connecting to Upstox Live Data Pipeline for {self.symbols}...")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Upstox Stream Error: {e}. Reconnecting in 5s...")
                time.sleep(5)

    async def start_async(self):
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
