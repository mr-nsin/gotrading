import asyncio
import logging
import msgpack
from engine.strategies.gamma_scalping import GammaScalpingStrategy
from engine.strategies.delta_hedging import DeltaHedgingStrategy
from engine.strategies.volatility_skew import VolatilitySkewStrategy
from engine.strategies.institutional_dispersion import InstitutionalDispersionStrategy
from engine.broker.fyers_broker import FyersBroker
from engine.broker.zerodha_broker import ZerodhaBroker
from engine.broker.dhan_broker import DhanBroker
from engine.broker.angel_broker import AngelBroker
from database import Session, engine
from models import User
from sqlmodel import select

logger = logging.getLogger(__name__)

class StrategyOrchestrator:
    """
    Consumes live ticks and signals from the FyersDataPipeline queue
    and routes them to active trading strategies.
    """
    def __init__(self, event_queue: asyncio.Queue, redis_client=None, brokers=None):
        self.event_queue = event_queue
        self.redis = redis_client
        
        if brokers is None:
            # Fetch first user for broker initialization
            user_id = None
            try:
                with Session(engine) as session:
                    user = session.exec(select(User)).first()
                    if user:
                        user_id = user.id
            except Exception as e:
                logger.error(f"Failed to fetch user for broker initialization: {e}")
                
            # Initialize Active Brokers
            self.brokers = [
                FyersBroker(user_id=user_id),
                ZerodhaBroker(user_id=user_id),
                DhanBroker(user_id=user_id),
                AngelBroker(user_id=user_id)
            ]
        else:
            self.brokers = brokers
        
        # Initialize Active Strategies for each broker
        self.active_strategies = []
        for broker in self.brokers:
            self.active_strategies.extend([
                GammaScalpingStrategy(broker=broker, symbol="NSE:NIFTY50-INDEX"),
                DeltaHedgingStrategy(broker=broker, symbol="NSE:NIFTY50-INDEX"),
                VolatilitySkewStrategy(broker=broker, symbol="NSE:NIFTY50-INDEX"),
                InstitutionalDispersionStrategy(broker=broker, index_symbol="NSE:NIFTY50-INDEX"),
            ])
        
        self._running = False
        self._consecutive_errors = 0
        self._max_consecutive_errors = 10
        
    async def run_consumer(self):
        """
        Continuously listen for new ticks on the event queue and route them.
        """
        self._running = True
        self._consecutive_errors = 0
        logger.info("Strategy Orchestrator consumer started.")
        
        while self._running:
            try:
                # Wait for next event
                event = await self.event_queue.get()
                
                if event.get("type") == "TICK":
                    tick_data = event.get("data", {})
                    signals = event.get("signals", {})
                    
                    # Log signals if present
                    if signals.get("vwap"):
                        logger.debug(f"Tick received with VWAP: {signals['vwap']}")
                    
                    # PERFORMANCE FIX: Route to ALL strategies in PARALLEL using asyncio.gather
                    # This reduces latency from O(n*time_per_strategy) to O(max_strategy_time)
                    await asyncio.gather(*[
                        asyncio.to_thread(strategy.process_tick, tick_data)
                        for strategy in self.active_strategies
                    ], return_exceptions=True)  # Don't let one strategy failure crash others
                        
                    # Publish to redis for the frontend dashboard (with error handling)
                    if self.redis:
                        try:
                            payload = {
                                "type": "TICK",
                                "data": tick_data,
                                "signals": signals
                            }
                            await self.redis.publish("market_data", msgpack.packb(payload))
                        except Exception as redis_err:
                            # Redis is optional - don't crash trading on Redis failure
                            logger.warning(f"Redis publish failed (non-fatal): {redis_err}")
                        
                # Mark task done
                self.event_queue.task_done()
                
                # Reset error counter on successful processing
                self._consecutive_errors = 0
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._consecutive_errors += 1
                logger.error(f"Error in StrategyOrchestrator consumer loop ({self._consecutive_errors}/{self._max_consecutive_errors}): {e}")
                
                # Circuit breaker: pause if too many consecutive errors
                if self._consecutive_errors >= self._max_consecutive_errors:
                    logger.critical(f"Too many consecutive errors ({self._consecutive_errors}). Pausing consumer for 30 seconds...")
                    await asyncio.sleep(30)
                    self._consecutive_errors = 0
                    logger.info("Consumer resuming after error pause.")
                
    def stop(self):
        self._running = False
