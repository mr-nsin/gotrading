import logging
import sys
import os
from datetime import datetime

# Adjust path so we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from sqlmodel import Session, select
from database import engine
from models import VirtualTrade, VirtualPortfolio

logger = logging.getLogger(__name__)

class VirtualBroker:
    def __init__(self, slippage_pct: float = 0.0005):
        self.slippage_pct = slippage_pct
        self._ensure_portfolio()

    def _ensure_portfolio(self):
        """Ensures a portfolio exists in the database."""
        with Session(engine) as session:
            portfolio = session.get(VirtualPortfolio, 1)
            if not portfolio:
                portfolio = VirtualPortfolio(id=1, total_capital=1000000.0, available_margin=1000000.0)
                session.add(portfolio)
                session.commit()

    def execute_order(self, strategy_name: str, symbol: str, side: str, quantity: int, current_market_price: float):
        """
        Simulates an order execution, factoring in slippage and updating the portfolio.
        """
        # Calculate slippage
        slippage_amount = current_market_price * self.slippage_pct
        executed_price = current_market_price + slippage_amount if side == "BUY" else current_market_price - slippage_amount
        
        with Session(engine) as session:
            # Check if this is closing an existing position for this strategy and symbol
            # (Simplified logic: assumes we only hold one direction per strategy/symbol at a time)
            opposite_side = "SELL" if side == "BUY" else "BUY"
            open_trade = session.exec(
                select(VirtualTrade).where(
                    VirtualTrade.strategy_name == strategy_name,
                    VirtualTrade.symbol == symbol,
                    VirtualTrade.status == "OPEN",
                    VirtualTrade.side == opposite_side
                )
            ).first()

            if open_trade:
                # Close the existing position
                open_trade.exit_price = executed_price
                open_trade.status = "CLOSED"
                open_trade.closed_at = datetime.utcnow()
                
                # Calculate PnL (ignoring margin/leverage for this simplified simulation)
                if open_trade.side == "BUY":
                    pnl = (open_trade.exit_price - open_trade.entry_price) * open_trade.quantity
                else: # SELL
                    pnl = (open_trade.entry_price - open_trade.exit_price) * open_trade.quantity
                
                open_trade.pnl = pnl
                
                # Update portfolio
                portfolio = session.get(VirtualPortfolio, 1)
                portfolio.realized_pnl += pnl
                portfolio.total_capital += pnl
                portfolio.available_margin += (open_trade.entry_price * open_trade.quantity) + pnl # Release margin + pnl
                
                logger.info(f"Closed {symbol} {open_trade.side} position for {strategy_name}. PnL: {pnl}")
            else:
                # Open a new position
                new_trade = VirtualTrade(
                    strategy_name=strategy_name,
                    symbol=symbol,
                    side=side,
                    quantity=quantity,
                    entry_price=executed_price
                )
                session.add(new_trade)
                
                # Update portfolio margin
                portfolio = session.get(VirtualPortfolio, 1)
                required_margin = executed_price * quantity
                if portfolio.available_margin < required_margin:
                    logger.error(f"Insufficient margin to open {side} {quantity} {symbol}. Required: {required_margin}, Available: {portfolio.available_margin}")
                    return # Reject order
                
                portfolio.available_margin -= required_margin
                logger.info(f"Opened {side} position on {symbol} for {strategy_name} at {executed_price}")

            session.commit()
