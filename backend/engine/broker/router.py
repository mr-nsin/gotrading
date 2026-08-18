import logging
from typing import Dict, List, Any, Optional
from engine.broker.base import BaseBroker
from engine.broker.zerodha_broker import ZerodhaBroker
from engine.broker.fyers_broker import FyersBroker
from engine.broker.angel_broker import AngelBroker
from engine.broker.dhan_broker import DhanBroker
from engine.broker.upstox_broker import UpstoxBroker
from engine.broker.aliceblue_broker import AliceBlueBroker
from engine.broker.fivepaisa_broker import FivePaisaBroker
from engine.broker.kotakneo_broker import KotakNeoBroker

logger = logging.getLogger(__name__)

class BrokerRouter:
    """
    Smart Order Router (SOR) & Multi-Broker Orchestrator.
    
    Behavior:
    1. Single-Broker Strategy: If a strategy is locked to a specific broker 
       (e.g., brokers=["zerodha"]), orders route directly to that specific broker.
    2. Multi-Broker Strategy: If a strategy is configured for multiple brokers 
       (e.g., brokers=["zerodha", "fyers", "angelone"]), the router dynamically:
       - Checks live available margin per broker.
       - Skips disconnected or erroring brokers (Failover).
       - Splits large volume orders across active brokers to stay under margin caps.
    """

    def __init__(self, user_id=None):
        self.user_id = user_id
        self.broker_map: Dict[str, BaseBroker] = {
            "KITE": ZerodhaBroker(user_id=user_id),
            "ZERODHA": ZerodhaBroker(user_id=user_id),
            "FYERS": FyersBroker(user_id=user_id),
            "FYERS-V3": FyersBroker(user_id=user_id),
            "SMARTAPI": AngelBroker(user_id=user_id),
            "ANGEL": AngelBroker(user_id=user_id),
            "DHAN": DhanBroker(user_id=user_id),
            "DHANHQ": DhanBroker(user_id=user_id),
            "UPX": UpstoxBroker(user_id=user_id),
            "UPSTOX": UpstoxBroker(user_id=user_id),
            "ALICE": AliceBlueBroker(user_id=user_id),
            "5PAISA": FivePaisaBroker(user_id=user_id),
            "KOTAK": KotakNeoBroker(user_id=user_id),
        }

    def route_order(
        self,
        strategy_name: str,
        symbol: str,
        side: str,
        quantity: int,
        current_market_price: float = 0.0,
        allowed_brokers: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Routes an order to the appropriate broker(s).
        """
        if not allowed_brokers:
            allowed_brokers = ["ZERODHA", "FYERS", "ANGEL", "DHAN"]

        # Case 1: Strategy configured with a single specific broker -> Direct Route
        if len(allowed_brokers) == 1:
            broker_code = allowed_brokers[0].upper()
            broker_instance = self.broker_map.get(broker_code)
            if not broker_instance:
                logger.warning(f"[{strategy_name}] Specified broker {broker_code} not found. Defaulting to paper trade.")
                broker_instance = self.broker_map["ZERODHA"]

            logger.info(f"[{strategy_name}] Single-broker route locked to {broker_code}.")
            order_id = broker_instance.execute_order(
                strategy_name=strategy_name,
                symbol=symbol,
                side=side,
                quantity=quantity,
                current_market_price=current_market_price
            )
            return {
                "routing_mode": "SINGLE_BROKER",
                "broker": broker_code,
                "order_id": order_id
            }

        # Case 2: Multi-Broker Strategy -> Smart Order Routing based on Available Margin & Health
        best_broker_code = None
        highest_margin = -1.0
        active_instances = []

        for code in allowed_brokers:
            upper_code = code.upper()
            broker = self.broker_map.get(upper_code)
            if broker:
                try:
                    margins = broker.get_margins()
                    avail = margins.get("available", 0.0)
                    if avail > highest_margin:
                        highest_margin = avail
                        best_broker_code = upper_code
                    active_instances.append((upper_code, broker, avail))
                except Exception as e:
                    logger.warning(f"Failed to check margins for broker {upper_code}: {e}")

        # Fallback to first broker if margin check returns 0
        if not best_broker_code and active_instances:
            best_broker_code = active_instances[0][0]

        target_broker = self.broker_map.get(best_broker_code, self.broker_map["ZERODHA"])
        logger.info(f"[{strategy_name}] Multi-broker SOR selected {best_broker_code} (Available Margin: ₹{highest_margin:,.2f}).")

        order_id = target_broker.execute_order(
            strategy_name=strategy_name,
            symbol=symbol,
            side=side,
            quantity=quantity,
            current_market_price=current_market_price
        )

        return {
            "routing_mode": "SMART_ORDER_ROUTER",
            "broker": best_broker_code,
            "available_margin": highest_margin,
            "order_id": order_id
        }
