import os
import re

BROKERS_DIR = "engine/broker"

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add SymbolResolver import if not present
    if "from engine.caching.symbol_resolver import SymbolResolver" not in content:
        import_stmt = "\nfrom engine.caching.symbol_resolver import SymbolResolver\n"
        if "from engine.broker.base import BaseBroker" in content:
            content = content.replace("from engine.broker.base import BaseBroker", "from engine.broker.base import BaseBroker" + import_stmt)
        elif "from backend.engine.broker.base import BaseBroker" in content:
            content = content.replace("from backend.engine.broker.base import BaseBroker", "from backend.engine.broker.base import BaseBroker" + import_stmt)
        else:
            print(f"BaseBroker import not found in {filepath}")

    # Ensure SymbolResolver is initialized in __init__
    if "self.resolver = SymbolResolver()" not in content:
        init_pattern = re.compile(r'(def __init__.*?:\n(?: {8}.*\n)*?)', re.MULTILINE)
        match = init_pattern.search(content)
        if match:
            init_block = match.group(1)
            new_init_block = init_block + "        self.resolver = SymbolResolver()\n"
            content = content.replace(init_block, new_init_block)

    # Replace get_historical_data
    hist_pattern = re.compile(r'    def get_historical_data\(.*?\) -> list:.*?return \[\]\n', re.DOTALL)
    new_hist = """    def get_historical_data(self, symbol: str, from_date: str, to_date: str, resolution: str, exchange: str = "NSE") -> list:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token:
            logger.error(f"Could not resolve token for {symbol}")
            return []
        # TODO: Implement actual SDK call using `token`
        logger.info(f"Fetching historical data for {symbol} (Token: {token})")
        return []
"""
    content = hist_pattern.sub(new_hist, content)

    # Replace get_market_depth
    depth_pattern = re.compile(r'    def get_market_depth\(.*?\) -> dict:.*?return \{\}\n', re.DOTALL)
    new_depth = """    def get_market_depth(self, symbol: str, exchange: str = "NSE") -> dict:
        token = self.resolver.resolve_token(symbol, self.__class__.__name__.replace("Broker", ""), exchange)
        if not token:
            logger.error(f"Could not resolve token for {symbol}")
            return {}
        # TODO: Implement actual SDK call using `token`
        logger.info(f"Fetching market depth for {symbol} (Token: {token})")
        return {}
"""
    content = depth_pattern.sub(new_depth, content)

    # Replace get_option_chain
    opt_pattern = re.compile(r'    def get_option_chain\(.*?\) -> dict:.*?return \{\}\n', re.DOTALL)
    new_opt = """    def get_option_chain(self, underlying_symbol: str, expiry_date: str) -> dict:
        # TODO: Implement option chain resolution using InstrumentCache
        logger.info(f"Fetching option chain for {underlying_symbol} expiring {expiry_date}")
        return {}
"""
    content = opt_pattern.sub(new_opt, content)

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Patched {filepath}")

for filename in os.listdir(BROKERS_DIR):
    if filename.endswith("_broker.py") and filename != "base.py":
        patch_file(os.path.join(BROKERS_DIR, filename))

print("Patching complete.")
