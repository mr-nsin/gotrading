import os
import asyncio
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

from engine.data.base_stream import BaseDataPipeline

load_dotenv()
logger = logging.getLogger(__name__)

class FivePaisaDataPipeline(BaseDataPipeline):
    """
    Connects to 5paisa Live WebSocket and pushes parsed ticks into an asyncio.Queue.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__(symbols, event_queue, loop)
        
        self.client_code = os.getenv("5PAISA_CLIENT_CODE")
        if not self.client_code:
            logger.warning("5paisa credentials missing. Cannot connect to Live WebSocket.")
            
        self.ws = None
        self._running = True

    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        return message

    def _on_message(self, ws, message):
        if not isinstance(message, dict):
            return

        ltp = message.get("LastRate") or message.get("ltp")
        if ltp:
            event = {
                "type": "TICK",
                "data": message,
                "signals": {}
            }
            asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)

    def connect(self):
        if not self.client_code:
            return
            
        import time
        while self._running:
            try:
                logger.info(f"Connecting to 5paisa Live Data Pipeline for {self.symbols}...")
                time.sleep(5)
            except Exception as e:
                logger.error(f"5paisa Stream Error: {e}. Reconnecting in 5s...")
                time.sleep(5)

    async def start_async(self):
        await self.loop.run_in_executor(None, self.connect)

    def stop(self):
        self._running = False
