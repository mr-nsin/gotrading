from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
import asyncio
import msgpack
import time
import random
import logging
from typing import List, Optional
from database import engine
from sqlmodel import Session, select
from models import VirtualPortfolio, VirtualTrade, LogEntry, BrokerCredential, Strategy, User
from routes.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Stream"])

class SubscribeRequest(BaseModel):
    symbols: List[str]

@router.post("/subscribe")
def subscribe_symbols(req: SubscribeRequest):
    import main
    if main.fyers_pipeline:
        main.fyers_pipeline.add_symbols(req.symbols)
        return {"status": "success", "subscribed": req.symbols}
    return {"status": "error", "message": "Fyers pipeline not initialized"}

class ConnectionManager:
    """Manages active WebSocket client connections and broadcasts shared state snapshots"""
    def __init__(self):
        self.active_connections: dict[WebSocket, Optional[str]] = {}  # ws -> user_id
        self._broadcast_task: asyncio.Task = None
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None):
        await websocket.accept()
        async with self._lock:
            self.active_connections[websocket] = user_id
            if self._broadcast_task is None or self._broadcast_task.done():
                self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.pop(websocket, None)

    async def _broadcast_loop(self):
        """Single background task broadcasting state snapshot once per second to all connected clients"""
        base_nifty = 22456.30
        base_banknifty = 47823.15

        while True:
            try:
                await asyncio.sleep(1.0)
                async with self._lock:
                    if not self.active_connections:
                        break
                    clients = list(self.active_connections.keys())

                # Dynamic price fluctuation
                nifty_change = random.uniform(-4.5, 5.0)
                banknifty_change = random.uniform(-12.0, 14.0)
                base_nifty += nifty_change
                base_banknifty += banknifty_change

                def fetch_snapshot():
                    try:
                        with Session(engine) as session:
                            try: portfolio = session.get(VirtualPortfolio, 1)
                            except Exception: portfolio = None

                            try: trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
                            except Exception: trades = []

                            try: logs = session.exec(select(LogEntry).order_by(LogEntry.timestamp.desc()).limit(50)).all()
                            except Exception: logs = []

                            try:
                                brokers = session.exec(select(BrokerCredential)).all()
                                connected_brokers_count = len(brokers)
                            except Exception:
                                connected_brokers_count = 0

                            active_positions = [
                                {
                                    "symbol": t.symbol,
                                    "side": t.side,
                                    "quantity": t.quantity,
                                    "entry_price": t.entry_price,
                                    "pnl": t.pnl or 0.0,
                                    "strategy_name": t.strategy_name
                                }
                                for t in trades
                            ]

                            current_unrealized = sum(pos["pnl"] for pos in active_positions)
                            realized = portfolio.realized_pnl if portfolio else 0.0
                            margin = portfolio.available_margin if portfolio else 1000000.0

                            recent_logs = [
                                {
                                    "id": str(l.id),
                                    "level": l.level,
                                    "message": l.message,
                                    "timestamp": l.timestamp.isoformat() if l.timestamp else ""
                                }
                                for l in logs
                            ]

                            return {
                                "type": "PORTFOLIO_UPDATE",
                                "total_pnl": round(realized + current_unrealized, 2),
                                "available_margin": round(margin, 2),
                                "active_positions": active_positions,
                                "connected_brokers": connected_brokers_count,
                                "tickers": [
                                    { "symbol": "NIFTY 50", "price": round(base_nifty, 2), "change": round(nifty_change, 2), "changePercent": round((nifty_change / 22456.30) * 100, 2) },
                                    { "symbol": "BANKNIFTY", "price": round(base_banknifty, 2), "change": round(banknifty_change, 2), "changePercent": round((banknifty_change / 47823.15) * 100, 2) },
                                    { "symbol": "SENSEX", "price": 73950.20, "change": 142.10, "changePercent": 0.19 },
                                    { "symbol": "INDIA VIX", "price": 14.15, "change": -0.22, "changePercent": -1.53 }
                                ],
                                "recent_logs": recent_logs
                            }
                    except Exception:
                        return None

                payload = await asyncio.to_thread(fetch_snapshot)
                if payload:
                    bytes_data = msgpack.packb(payload)
                    # Broadcast to all clients in parallel
                    send_futures = [client.send_bytes(bytes_data) for client in clients]
                    results = await asyncio.gather(*send_futures, return_exceptions=True)
                    
                    # Remove dead connections
                    for client, res in zip(clients, results):
                        if isinstance(res, Exception):
                            await self.disconnect(client)
            except asyncio.CancelledError:
                break
            except Exception as e:
                await asyncio.sleep(1.0)

manager = ConnectionManager()

@router.websocket("/ws/dashboard")
async def websocket_dashboard(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None)
):
    """
    WebSocket endpoint for real-time dashboard updates.
    
    SECURITY: Accepts optional JWT token as query parameter.
    If token is invalid, connection is rejected with code 4001.
    If no token is provided, allows connection but logs warning.
    """
    user_id = None
    
    # Validate token if provided
    if token:
        payload = verify_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid or expired token")
            logger.warning("WebSocket connection rejected: invalid token")
            return
        user_id = payload.get("sub")
        logger.info(f"WebSocket connected: authenticated user {user_id}")
    else:
        # Allow unauthenticated connections for now (backward compatibility)
        # In production, you may want to require authentication
        logger.warning("WebSocket connection: no authentication token provided")
    
    await manager.connect(websocket, user_id=user_id)
    try:
        while True:
            # Keep connection open and receive optional ping/pong messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)

class StrategyToggle(BaseModel):
    id: str
    active: bool

@router.post("/api/strategies/toggle")
async def toggle_strategy(req: StrategyToggle):
    import main
    if main.redis_client:
        await main.redis_client.hset("strategy_status", req.id, str(req.active))
        payload = {
            "type": "STRATEGY_TOGGLE", 
            "id": req.id, 
            "active": req.active
        }
        await main.redis_client.publish("strategy_updates", msgpack.packb(payload))
        return {"status": "success", "id": req.id, "active": req.active}
    return {"status": "error", "message": "Redis not connected"}
