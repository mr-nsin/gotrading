import logging
from typing import Optional
from sqlmodel import Session, select
from backend.database import engine
from backend.models import Instrument

logger = logging.getLogger(__name__)

class SymbolResolver:
    """Utility class to resolve standard symbols to broker-specific tokens."""
    
    def __init__(self):
        self.session_maker = lambda: Session(engine)

    def resolve_token(self, symbol: str, broker_code: str, exchange: str = "NSE") -> Optional[str]:
        """
        Resolves a standard symbol (e.g. RELIANCE) to a broker-specific token.
        
        Args:
            symbol (str): The standard symbol (e.g., RELIANCE).
            broker_code (str): The broker code (e.g., SMARTAPI, KITE, FYERS-V3).
            exchange (str): The exchange (e.g., NSE, NFO, BSE).
            
        Returns:
            Optional[str]: The broker-specific token or None if not found.
        """
        try:
            with self.session_maker() as session:
                # Find the instrument
                # The exact mapping depends on how standard symbols are stored
                # We assume exact match or suffix match like RELIANCE-EQ
                
                stmt = select(Instrument).where(
                    (Instrument.symbol == symbol) | (Instrument.symbol == f"{symbol}-EQ") | (Instrument.symbol.startswith(f"{symbol}-"))
                ).where(Instrument.exchange == exchange)
                
                inst = session.exec(stmt).first()
                if not inst:
                    logger.warning(f"Symbol {symbol} not found in instrument cache.")
                    return None
                
                # Get the appropriate token based on broker code
                broker_code = broker_code.upper()
                if broker_code == "SMARTAPI" or broker_code == "ANGELONE":
                    return inst.angelone_token
                elif broker_code == "KITE" or broker_code == "ZERODHA":
                    return inst.zerodha_token
                elif broker_code == "DHANHQ" or broker_code == "DHAN":
                    return inst.dhan_token
                elif broker_code == "FYERS-V3" or broker_code == "FYERS":
                    return inst.fyers_token
                elif broker_code == "UPX" or broker_code == "UPSTOX":
                    return inst.upstox_token
                elif broker_code == "ALICEBLUE":
                    return inst.aliceblue_token
                elif broker_code == "5PAISA" or broker_code == "FIVEPAISA":
                    return inst.fivepaisa_token
                elif broker_code == "KOTAKNEO":
                    return inst.kotakneo_token
                else:
                    logger.warning(f"Unknown broker code: {broker_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error resolving token for {symbol} on {broker_code}: {e}")
            return None
