import asyncio
import logging
import sys
import os

from dotenv import load_dotenv

# Ensure the backend directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engine.data.fyers_stream import FyersDataPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    load_dotenv()
    
    if os.getenv("FYERS_APP_ID") == "YOUR_APP_ID":
        logger.error("Please set FYERS_APP_ID and FYERS_ACCESS_TOKEN in .env")
        return

    # NSE:NIFTY50-INDEX, NSE:BANKNIFTY-INDEX
    symbols = ["NSE:NIFTY50-INDEX", "NSE:NIFTYBANK-INDEX"]
    event_queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    
    pipeline = FyersDataPipeline(symbols, event_queue, loop)
    
    logger.info("Starting Fyers Data Pipeline...")
    # Start the pipeline in the background
    asyncio.create_task(pipeline.start_async())
    
    logger.info("Listening for ticks...")
    try:
        while True:
            event = await event_queue.get()
            if event["type"] == "TICK":
                tick = event["data"]
                # Just print the basic info to verify it's working
                logger.info(f"Received Tick: {tick.get('symbol')} - LTP: {tick.get('ltp')} - Vol: {tick.get('vol_traded_today')}")
    except asyncio.CancelledError:
        logger.info("Stopping pipeline...")
        pipeline.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
