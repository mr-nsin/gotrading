import re
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class SymbolResolver:
    """
    NSE / NFO Symbol Master Resolver.
    Translates standard option/futures contract descriptions into broker-specific trading symbols
    for Zerodha (Kite), Fyers (v3), Angel One (SmartAPI), and Dhan.
    """
    
    @staticmethod
    def resolve_symbol(symbol_str: str) -> Dict[str, str]:
        """
        Input examples:
          - "NIFTY 24JUL 22500CE"
          - "BANKNIFTY 24JUL 48000PE"
          - "NIFTY 22500 CE"
          - "NSE:NIFTY50-INDEX"
        Returns dictionary of broker-specific tokens.
        """
        symbol_str = symbol_str.strip().upper()
        
        # Check if index ticker
        if "NIFTY50-INDEX" in symbol_str or symbol_str == "NIFTY":
            return {
                "fyers": "NSE:NIFTY50-INDEX",
                "zerodha": "NIFTY 50",
                "angel": "NIFTY",
                "dhan": "NIFTY 50",
                "display": "NIFTY 50"
            }
        if "BANKNIFTY-INDEX" in symbol_str or symbol_str == "BANKNIFTY":
            return {
                "fyers": "NSE:BANKNIFTY-INDEX",
                "zerodha": "NIFTY BANK",
                "angel": "BANKNIFTY",
                "dhan": "NIFTY BANK",
                "display": "BANKNIFTY"
            }

        # Match Option contract regex: (NIFTY|BANKNIFTY) (24JUL|AUG|...) (22500)(CE|PE)
        match = re.search(r"^(NIFTY|BANKNIFTY|FINNIFTY)\s*(\d{2}[A-Z]{3})?\s*(\d+)\s*(CE|PE)$", symbol_str)
        if match:
            inst, expiry, strike, opt_type = match.groups()
            expiry = expiry or "24AUG"
            clean_ticker = f"{inst}{expiry}{strike}{opt_type}"
            
            return {
                "fyers": f"NSE:{clean_ticker}",
                "zerodha": clean_ticker,
                "angel": clean_ticker,
                "dhan": f"{inst}-{expiry}-{strike}-{opt_type}",
                "display": f"{inst} {expiry} {strike}{opt_type}"
            }

        # Fallback to standard symbol
        return {
            "fyers": f"NSE:{symbol_str}",
            "zerodha": symbol_str,
            "angel": symbol_str,
            "dhan": symbol_str,
            "display": symbol_str
        }
