import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseDataPipeline(ABC):
    """
    Abstract Base Class for all broker live websocket data pipelines.
    """
    def __init__(self, symbols: List[str], event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self.symbols = symbols
        self.event_queue = event_queue
        self.loop = loop
        
    @abstractmethod
    async def connect(self):
        """
        Connect to the broker's WebSocket and subscribe to the requested symbols.
        """
        pass
        
    @abstractmethod
    def parse_tick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse raw broker websocket payloads into a StandardTick dictionary.
        Must include parsing for Level 2 Market Depth if available.
        """
        pass
