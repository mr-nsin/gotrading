import logging
import csv
import io
import requests
from sqlmodel import Session, select
from database import engine
from models import Instrument

logger = logging.getLogger(__name__)

class InstrumentCacheManager:
    """Manager for downloading and caching broker master contract lists."""
    
    def __init__(self):
        self.session_maker = lambda: Session(engine)

    def download_angelone_instruments(self):
        """Downloads Angel One scrip master and updates DB."""
        # Open API URL for Angel One master contracts
        url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
        try:
            logger.info("Downloading Angel One scrip master...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            with self.session_maker() as session:
                count = 0
                for item in data:
                    symbol = item.get("symbol")
                    token = item.get("token")
                    exch_seg = item.get("exch_seg")
                    
                    if not symbol or not token:
                        continue
                        
                    # Find existing or create new
                    # NOTE: for large updates, bulk insert/update is preferred, but this works for PoC
                    stmt = select(Instrument).where(Instrument.symbol == symbol)
                    inst = session.exec(stmt).first()
                    
                    if not inst:
                        inst = Instrument(symbol=symbol, exchange=exch_seg)
                        session.add(inst)
                    
                    inst.angelone_token = token
                    
                    count += 1
                    if count % 10000 == 0:
                        session.commit()
                
                session.commit()
                logger.info(f"Successfully cached {count} Angel One instruments.")
                return count
        except Exception as e:
            logger.error(f"Error caching Angel One instruments: {e}")
            return 0
            
    # Similar methods for other brokers would be implemented here
    # e.g. download_zerodha_instruments, download_dhan_instruments, etc.
