import logging
import requests
import json
import csv
from io import StringIO
from typing import Dict, Any, List
from sqlmodel import Session, select
from database import engine
from models import Instrument

logger = logging.getLogger(__name__)

class ScripMasterSync:
    """
    Downloads daily master contract & scrip files from Indian brokers 
    and populates/updates the Instrument database table with token mappings.
    """

    @staticmethod
    def sync_angelone_instruments() -> int:
        """Download Angel One OpenAPIScripMaster.json and populate angelone_token"""
        url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                logger.error(f"Angel One scrip master download failed: HTTP {resp.status_code}")
                return 0
            
            data = resp.json()
            count = 0
            with Session(engine) as session:
                for item in data[:2000]:  # batch process top instruments
                    symbol = item.get("symbol", "")
                    token = item.get("token", "")
                    exch = item.get("exch_seg", "NSE")
                    if not symbol or not token:
                        continue
                    
                    inst = session.exec(select(Instrument).where(Instrument.symbol == symbol)).first()
                    if not inst:
                        inst = Instrument(
                            symbol=symbol,
                            name=item.get("name", symbol),
                            exchange=exch,
                            segment="OPT" if "OPT" in exch else ("FUT" if "FUT" in exch else "EQ"),
                            angelone_token=token
                        )
                    else:
                        inst.angelone_token = token
                    session.add(inst)
                    count += 1
                session.commit()
            logger.info(f"Successfully synced {count} Angel One instrument tokens.")
            return count
        except Exception as e:
            logger.error(f"Error syncing Angel One instruments: {e}")
            return 0

    @staticmethod
    def sync_zerodha_instruments() -> int:
        """Download Zerodha instruments.csv and populate zerodha_token"""
        url = "https://api.kite.trade/instruments"
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                logger.error(f"Zerodha instruments download failed: HTTP {resp.status_code}")
                return 0

            reader = csv.DictReader(StringIO(resp.text))
            count = 0
            with Session(engine) as session:
                for row in reader:
                    symbol = row.get("tradingsymbol", "")
                    token = row.get("instrument_token", "")
                    exch = row.get("exchange", "NSE")
                    if not symbol or not token:
                        continue

                    inst = session.exec(select(Instrument).where(Instrument.symbol == symbol)).first()
                    if not inst:
                        inst = Instrument(
                            symbol=symbol,
                            name=row.get("name", symbol),
                            exchange=exch,
                            segment=row.get("segment", "EQ"),
                            zerodha_token=token
                        )
                    else:
                        inst.zerodha_token = token
                    session.add(inst)
                    count += 1
                    if count >= 2000:
                        break
                session.commit()
            logger.info(f"Successfully synced {count} Zerodha instrument tokens.")
            return count
        except Exception as e:
            logger.error(f"Error syncing Zerodha instruments: {e}")
            return 0

    @staticmethod
    def sync_dhan_instruments() -> int:
        """Download Dhan scrip master CSV and populate dhan_token"""
        url = "https://images.dhan.co/api-data/api-scrip-master.csv"
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                logger.error(f"Dhan scrip master download failed: HTTP {resp.status_code}")
                return 0

            reader = csv.DictReader(StringIO(resp.text))
            count = 0
            with Session(engine) as session:
                for row in reader:
                    symbol = row.get("SEM_TRADING_SYMBOL", "") or row.get("SEM_CUSTOM_SYMBOL", "")
                    token = row.get("SEM_SM_ID", "")
                    exch = row.get("SEM_EXM_EXCH_ID", "NSE")
                    if not symbol or not token:
                        continue

                    inst = session.exec(select(Instrument).where(Instrument.symbol == symbol)).first()
                    if not inst:
                        inst = Instrument(
                            symbol=symbol,
                            name=symbol,
                            exchange=exch,
                            dhan_token=token
                        )
                    else:
                        inst.dhan_token = token
                    session.add(inst)
                    count += 1
                    if count >= 2000:
                        break
                session.commit()
            logger.info(f"Successfully synced {count} Dhan instrument tokens.")
            return count
        except Exception as e:
            logger.error(f"Error syncing Dhan instruments: {e}")
            return 0

    @staticmethod
    def sync_fivepaisa_instruments() -> int:
        """Download 5paisa SCRIPMASTER.csv and populate fivepaisa_token"""
        url = "https://images.5paisa.com/Master/SCRIPMASTER.csv"
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                logger.error(f"5paisa scrip master download failed: HTTP {resp.status_code}")
                return 0

            reader = csv.DictReader(StringIO(resp.text))
            count = 0
            with Session(engine) as session:
                for row in reader:
                    symbol = row.get("ScripName", "") or row.get("Symbol", "")
                    token = row.get("ScripCode", "")
                    if not symbol or not token:
                        continue

                    inst = session.exec(select(Instrument).where(Instrument.symbol == symbol)).first()
                    if not inst:
                        inst = Instrument(
                            symbol=symbol,
                            name=symbol,
                            exchange="NSE",
                            fivepaisa_token=token
                        )
                    else:
                        inst.fivepaisa_token = token
                    session.add(inst)
                    count += 1
                    if count >= 2000:
                        break
                session.commit()
            logger.info(f"Successfully synced {count} 5paisa instrument tokens.")
            return count
        except Exception as e:
            logger.error(f"Error syncing 5paisa instruments: {e}")
            return 0

    @classmethod
    def sync_all_brokers(cls) -> Dict[str, int]:
        """Runs scrip master sync across all supported brokers"""
        logger.info("Starting daily scrip master database sync...")
        results = {
            "angelone": cls.sync_angelone_instruments(),
            "zerodha": cls.sync_zerodha_instruments(),
            "dhan": cls.sync_dhan_instruments(),
            "fivepaisa": cls.sync_fivepaisa_instruments(),
        }
        logger.info(f"Scrip master sync completed: {results}")
        return results
