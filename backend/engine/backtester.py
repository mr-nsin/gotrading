import pandas as pd
import numpy as np
import logging
from .data.indicators import IndicatorEngine

logger = logging.getLogger(__name__)

class HistoricalBacktester:
    """
    Backtester that loads historical OHLCV data, runs it through the IndicatorEngine,
    generates basic signals, and computes Sharpe ratio / PnL.
    """
    def __init__(self, data_path: str = None, dataframe: pd.DataFrame = None):
        if dataframe is not None:
            self.data = dataframe
        elif data_path is not None:
            self.data = pd.read_csv(data_path)
        else:
            raise ValueError("Must provide either data_path or dataframe")
            
        self.indicator_engine = IndicatorEngine(buffer_size=1000)
        self.pnl = []
        self.position = 0 # 1 for Long, -1 for Short, 0 for None
        self.entry_price = 0.0
        
    def run(self):
        logger.info("Starting historical backtest...")
        
        # Ensure data is sorted by timestamp if available
        if 'timestamp' in self.data.columns:
            self.data['timestamp'] = pd.to_datetime(self.data['timestamp'])
            self.data = self.data.sort_values('timestamp')
            
        # Basic signal tracking based on VWAP for demonstration
        for index, row in self.data.iterrows():
            timestamp = row.get('timestamp', index)
            close_price = row['close']
            volume = row.get('volume', 0)
            
            # The IndicatorEngine expects ltp, we pass close_price
            self.indicator_engine.add_tick(timestamp, close_price, volume)
            
            # Get indicators
            vwap = self.indicator_engine.get_vwap()
            
            if vwap is None or pd.isna(vwap):
                continue
                
            # Signal computation: 
            # Trend-following on VWAP
            # If close > vwap, go Long. If close < vwap, go Short.
            if close_price > vwap and self.position <= 0:
                # Close short if exists, open long
                if self.position == -1:
                    trade_pnl = self.entry_price - close_price
                    self.pnl.append(trade_pnl)
                
                self.position = 1
                self.entry_price = close_price
                
            elif close_price < vwap and self.position >= 0:
                # Close long if exists, open short
                if self.position == 1:
                    trade_pnl = close_price - self.entry_price
                    self.pnl.append(trade_pnl)
                    
                self.position = -1
                self.entry_price = close_price
                
        # Close any open position at the end
        if self.position == 1:
            trade_pnl = self.data.iloc[-1]['close'] - self.entry_price
            self.pnl.append(trade_pnl)
        elif self.position == -1:
            trade_pnl = self.entry_price - self.data.iloc[-1]['close']
            self.pnl.append(trade_pnl)
            
        self._print_summary()
        
    def _print_summary(self):
        pnl_array = np.array(self.pnl)
        total_trades = len(pnl_array)
        total_pnl = np.sum(pnl_array)
        
        if total_trades > 0 and np.std(pnl_array) != 0:
            sharpe_ratio = np.mean(pnl_array) / np.std(pnl_array) * np.sqrt(252 * 75)
        else:
            sharpe_ratio = 0.0
            
        win_rate = np.sum(pnl_array > 0) / total_trades if total_trades > 0 else 0
        
        print("--- Backtest Summary ---")
        print(f"Total Trades: {total_trades}")
        print(f"Total PnL: {total_pnl:.2f}")
        print(f"Win Rate: {win_rate:.2%}")
        print(f"Sharpe Ratio: {sharpe_ratio:.2f}")
        print("------------------------")
