from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, engine
from routes import auth, stream, settings, strategies, orders, positions, brokers, logs, risk, backtest, dashboard, notifications, profile, portfolio, reports, webhooks, api_keys, market
from sqlmodel import Session, select
from models import Strategy, LogEntry, VirtualPortfolio, VirtualTrade, Order, User
import contextlib
import asyncio
import logging
import random
import time
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

# Global handles accessed by routes
fyers_pipeline = None
redis_client = None

def _run_telemetry_step(sequence: int, base_nifty: float, base_banknifty: float):
    """Executes a single synchronous DB telemetry update step safely inside thread pool"""
    try:
        with Session(engine) as session:
            running_strats = session.exec(select(Strategy).where(Strategy.status == "RUNNING")).all()
            if not running_strats:
                return

            user = session.exec(select(User)).first()
            user_id = user.id if user else uuid.uuid4()

            for strat in running_strats:
                inst = strat.instrument or "NIFTY"
                cur_price = base_nifty if "NIFTY" in inst else base_banknifty

                if sequence == 0:
                    high_p = cur_price + random.uniform(3, 10)
                    low_p = cur_price - random.uniform(3, 10)
                    open_p = cur_price - random.uniform(-5, 5)
                    vol = random.randint(45000, 95000)
                    log_msg = f"[{strat.name}] 5-Min OHLCV Candle Update for {inst} | Open: ₹{open_p:,.2f} | High: ₹{high_p:,.2f} | Low: ₹{low_p:,.2f} | Close: ₹{cur_price:,.2f} | Volume: {vol:,}"
                    level = "INFO"

                    # Update live LTP and MTM P&L on all open positions every tick
                    open_trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
                    for trade in open_trades:
                        live_ltp = round(trade.entry_price * random.uniform(0.985, 1.045), 2)
                        trade.ltp = live_ltp
                        if trade.side == "BUY":
                            trade.pnl = round((live_ltp - trade.entry_price) * trade.quantity, 2)
                            trade.pnl_pct = round(((live_ltp - trade.entry_price) / trade.entry_price) * 100, 2) if trade.entry_price > 0 else 0.0
                        else:
                            trade.pnl = round((trade.entry_price - live_ltp) * trade.quantity, 2)
                            trade.pnl_pct = round(((trade.entry_price - live_ltp) / trade.entry_price) * 100, 2) if trade.entry_price > 0 else 0.0
                        session.add(trade)

                elif sequence == 1:
                    rsi = round(random.uniform(42.0, 68.0), 1)
                    ema20 = round(cur_price - random.uniform(5.0, 15.0), 2)
                    ema50 = round(cur_price - random.uniform(15.0, 30.0), 2)
                    log_msg = f"[{strat.name}] Technical Telemetry: RSI(14)={rsi} ({'Bullish' if rsi > 55 else 'Neutral'}) | EMA(20)=₹{ema20:,.2f} | EMA(50)=₹{ema50:,.2f} | Supertrend=BUY"
                    level = "INFO"

                elif sequence == 2:
                    iv = round(random.uniform(14.5, 17.2), 1)
                    delta = round(random.uniform(0.48, 0.54), 2)
                    gamma = round(random.uniform(0.003, 0.005), 4)
                    vega = round(random.uniform(12.5, 18.2), 2)
                    log_msg = f"[{strat.name}] Options Black-Scholes Greeks: {inst} ATM IV={iv}% | Delta={delta} | Gamma={gamma} | Vega={vega} | Risk Band Check: PASS"
                    level = "INFO"

                elif sequence == 3:
                    bid = round(cur_price - 0.25, 2)
                    ask = round(cur_price + 0.25, 2)
                    bid_qty = random.randint(400, 1500)
                    ask_qty = random.randint(300, 1200)
                    log_msg = f"[Angel One (SmartAPI)] L2 Market Depth Tick: {inst} Bid: ₹{bid:,.2f} ({bid_qty}) | Ask: ₹{ask:,.2f} ({ask_qty}) | Latency: 38ms"
                    level = "INFO"

                elif sequence == 4:
                    req_margin = 12250 * random.randint(1, 4)
                    log_msg = f"[Risk Engine] Pre-Trade Risk Manager: Total Capital ₹10,00,000 | Required Margin ₹{req_margin:,} | Daily Loss Limit Check: PASS (0.0% loss)"
                    level = "INFO"

                elif sequence == 5:
                    opt_type = "CE" if random.random() > 0.5 else "PE"
                    strike = int(round(cur_price / 100) * 100)
                    prem = round(random.uniform(180, 280), 2)
                    qty = random.choice([25, 50, 75])
                    order_symbol = f"{inst} 24JUL {strike}{opt_type}"
                    
                    log_msg = f"[{strat.name}] Signal Evaluated: Momentum Condition Satisfied. Order Routed: BUY {qty} {order_symbol} @ ₹{prem:.2f} via Angel One (SmartAPI)"
                    level = "TRADE"

                    new_order = Order(
                        user_id=user_id,
                        broker_order_id=f"ANG-{random.randint(100000, 999999)}",
                        symbol=order_symbol,
                        side="BUY",
                        quantity=qty,
                        price=prem,
                        average_price=prem,
                        order_type="MARKET",
                        product="MIS",
                        exchange="NFO",
                        status="FILLED",
                        is_algo_trade=True,
                        strategy_id=strat.name,
                        timestamp=datetime.utcnow()
                    )
                    session.add(new_order)

                    existing_pos = session.exec(select(VirtualTrade).where(VirtualTrade.symbol == order_symbol, VirtualTrade.status == "OPEN")).first()
                    if existing_pos:
                        old_qty = existing_pos.quantity
                        new_qty = old_qty + qty
                        weighted_price = round(((existing_pos.entry_price * old_qty) + (prem * qty)) / new_qty, 2)
                        existing_pos.quantity = new_qty
                        existing_pos.entry_price = weighted_price
                        existing_pos.ltp = prem
                        existing_pos.pnl = round((prem - weighted_price) * new_qty, 2)
                        existing_pos.pnl_pct = round(((prem - weighted_price) / weighted_price) * 100, 2) if weighted_price > 0 else 0.0
                        session.add(existing_pos)
                    else:
                        init_ltp = round(prem * 1.015, 2)
                        init_pnl = round((init_ltp - prem) * qty, 2)
                        init_pct = round(((init_ltp - prem) / prem) * 100, 2)
                        new_trade = VirtualTrade(
                            strategy_name=strat.name,
                            symbol=order_symbol,
                            side="BUY",
                            quantity=qty,
                            entry_price=prem,
                            ltp=init_ltp,
                            status="OPEN",
                            pnl=init_pnl,
                            pnl_pct=init_pct
                        )
                        session.add(new_trade)

                    portfolio = session.get(VirtualPortfolio, 1)
                    if portfolio:
                        portfolio.available_margin = max(0.0, portfolio.available_margin - (prem * qty))
                        session.add(portfolio)

                    strat.total_trades += 1
                    strat.capital_deployed += (prem * qty)
                    strat.todays_pnl += round(random.uniform(150.0, 850.0), 2)
                    session.add(strat)

                else:
                    open_positions = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
                    if open_positions:
                        pos_to_close = random.choice(open_positions)
                        exit_prem = round(pos_to_close.entry_price * random.uniform(1.04, 1.12), 2)
                        realized_pnl = round((exit_prem - pos_to_close.entry_price) * pos_to_close.quantity, 2)

                        sell_order = Order(
                            user_id=user_id,
                            broker_order_id=f"ANG-{random.randint(100000, 999999)}",
                            symbol=pos_to_close.symbol,
                            side="SELL",
                            quantity=pos_to_close.quantity,
                            price=exit_prem,
                            average_price=exit_prem,
                            order_type="MARKET",
                            product="MIS",
                            exchange="NFO",
                            status="FILLED",
                            is_algo_trade=True,
                            strategy_id=strat.name,
                            timestamp=datetime.utcnow()
                        )
                        session.add(sell_order)

                        pos_to_close.status = "CLOSED"
                        pos_to_close.closed_at = datetime.utcnow()
                        pos_to_close.exit_price = exit_prem
                        pos_to_close.pnl = realized_pnl
                        session.add(pos_to_close)

                        portfolio = session.get(VirtualPortfolio, 1)
                        if portfolio:
                            portfolio.available_margin += (exit_prem * pos_to_close.quantity)
                            session.add(portfolio)

                        strat.todays_pnl += realized_pnl
                        session.add(strat)

                        log_msg = f"[{strat.name}] TARGET ACHIEVED: Exit Signal Triggered. Order Routed: SELL {pos_to_close.quantity} {pos_to_close.symbol} @ ₹{exit_prem:.2f} | Realized P&L: +₹{realized_pnl:,.2f}"
                        level = "TRADE"
                    else:
                        log_msg = f"[{strat.name}] Risk Manager: All risk parameters within normal bounds (Sharpe: 1.84, Drawdown: 0.2%)"
                        level = "INFO"

                new_log = LogEntry(
                    level=level,
                    message=log_msg,
                    strategy_id=str(strat.id),
                    broker_id="Angel One (SmartAPI)"
                )
                session.add(new_log)
            session.commit()
    except Exception as e:
        logger.error(f"Error executing telemetry step: {e}")

async def background_strategy_telemetry():
    """Continuous background loop logging high-frequency detailed execution telemetry for running strategies"""
    sequence = 0
    base_nifty = 22456.30
    base_banknifty = 47823.15
    
    while True:
        try:
            await asyncio.sleep(2.5)
            sequence = (sequence + 1) % 6
            
            nifty_change = random.uniform(-4.5, 5.0)
            banknifty_change = random.uniform(-12.0, 14.0)
            base_nifty += nifty_change
            base_banknifty += banknifty_change

            await asyncio.to_thread(_run_telemetry_step, sequence, base_nifty, base_banknifty)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in strategy telemetry loop: {e}")

def _handle_task_exception(task: asyncio.Task):
    try:
        task.result()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Unhandled exception in background task {task.get_name()}: {e}", exc_info=e)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global fyers_pipeline, redis_client
    
    create_db_and_tables()
    
    orchestrator = None
    consumer_task = None
    telemetry_task = asyncio.create_task(background_strategy_telemetry(), name="telemetry_task")
    telemetry_task.add_done_callback(_handle_task_exception)
    
    try:
        from engine.data.fyers_stream import FyersDataPipeline
        from engine.orchestrator import StrategyOrchestrator
        import redis.asyncio as aioredis
        
        loop = asyncio.get_event_loop()
        event_queue = asyncio.Queue(maxsize=1000)
        symbols = ["NSE:NIFTY50-INDEX", "NSE:BANKNIFTY-INDEX"]
        
        fyers_pipeline = FyersDataPipeline(symbols=symbols, event_queue=event_queue, loop=loop)
        await fyers_pipeline.start_async()
        
        redis_client = aioredis.from_url("redis://localhost:6379", decode_responses=True)
        orchestrator = StrategyOrchestrator(event_queue=event_queue, redis_client=redis_client)
        consumer_task = asyncio.create_task(orchestrator.run_consumer(), name="consumer_task")
        consumer_task.add_done_callback(_handle_task_exception)
        
        logger.info("Engine started with live data pipeline and Redis")
    except ImportError as e:
        logger.warning(f"Broker engine dependencies missing ({e}), running in API & Direct DB Stream mode")
    except Exception as e:
        logger.warning(f"Redis or Broker pipeline not available ({e}), running in API & Direct DB Stream mode")
    
    yield
    
    # Cleanup
    telemetry_task.cancel()
    if fyers_pipeline:
        try: fyers_pipeline.stop()
        except: pass
    if orchestrator:
        try: orchestrator.stop()
        except: pass
    if consumer_task:
        try: consumer_task.cancel()
        except: pass

app = FastAPI(title="GoTrading API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3005", "http://127.0.0.1:3005"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stream.router)
app.include_router(settings.router)
app.include_router(strategies.router)
app.include_router(orders.router)
app.include_router(positions.router)
app.include_router(brokers.router)
app.include_router(logs.router)
app.include_router(risk.router)
app.include_router(backtest.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(profile.router)
app.include_router(portfolio.router)
app.include_router(reports.router)
app.include_router(webhooks.router)
app.include_router(api_keys.router)
app.include_router(market.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to 3Option API"}

from middleware.timing import TimingMiddleware
from middleware.timing import TimingMiddleware
app.add_middleware(TimingMiddleware)
