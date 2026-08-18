import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

# Make sure we can import from backend
sys.path.insert(0, os.path.abspath('.'))

from engine.broker.angel_broker import AngelBroker
from engine.broker.zerodha_broker import ZerodhaBroker
from engine.broker.dhan_broker import DhanBroker
from engine.broker.fyers_broker import FyersBroker
from engine.broker.upstox_broker import UpstoxBroker
from engine.broker.aliceblue_broker import AliceBlueBroker
from engine.broker.fivepaisa_broker import FivePaisaBroker
from engine.broker.kotakneo_broker import KotakNeoBroker

def test_angel():
    # Use the broker_id or user_id that has the valid credentials, or rely on .env
    # For test, we will just use .env if we have credentials there, or let it fail
    broker = AngelBroker()
    
    if not broker.smartApi:
        print("AngelBroker is in mock mode. Cannot test real APIs. Ensure .env has valid credentials.")
        return
        
    print("--- Fetching Margins ---")
    margins = broker.get_margins()
    print("Margins:", margins)
    
    print("\n--- Fetching Positions ---")
    positions = broker.get_positions()
    print("Positions:", positions)

    print("\n--- Fetching Instrument List ---")
    instruments = broker.get_instrument_list()
    print(f"Total instruments fetched: {len(instruments)}")
    # Print a sample NSE instrument
    nse_sample = [i for i in instruments if i.get("exch_seg") == "NSE"]
    if nse_sample:
        print("Sample NSE Instrument:", nse_sample[0])
        
if __name__ == "__main__":
    test_angel()
