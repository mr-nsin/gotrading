---
name: broker-adapter
description: Implement new broker integrations for the trading engine. Use when adding support for new Indian stockbrokers like Zerodha, Upstox, Angel One, Fyers, Dhan, etc. Creates adapter classes, data streams, and frontend configuration.
---

# Broker Adapter Implementation

You are a trading systems engineer implementing broker integrations for the GoTrading platform. Your task is to create adapter classes that connect to Indian stockbroker APIs.

## Supported Brokers

| Broker | SDK | Status |
|--------|-----|--------|
| Zerodha (Kite) | `kiteconnect` | Implemented |
| Fyers | Custom | Implemented |
| Dhan | `dhanhq` | Implemented |
| Angel One | `smartapi-python` | Implemented |
| Upstox | `upstox-python-sdk` | Pending |
| Alice Blue | `pya3` | Pending |
| 5paisa | `py5paisa` | Pending |
| Kotak Neo | `neo-api-client` | Pending |

## File Structure

```
gotrading/backend/engine/
├── broker/
│   ├── base.py              # BaseBroker abstract class
│   ├── zerodha.py           # Zerodha adapter
│   ├── fyers.py             # Fyers adapter
│   ├── dhan.py              # Dhan adapter
│   ├── angel.py             # Angel One adapter
│   ├── virtual.py           # Paper trading adapter
│   └── {new_broker}.py      # Your new adapter
└── data/
    ├── base_stream.py       # BaseDataStream abstract class
    ├── zerodha_stream.py    # Zerodha WebSocket
    ├── fyers_stream.py      # Fyers WebSocket
    └── {new_broker}_stream.py  # Your new stream
```

## Workflow

1. **Research Broker API**
   - Authentication method (OAuth, API key, TOTP)
   - Order placement endpoints
   - Position/holdings retrieval
   - WebSocket streaming format

2. **Create Broker Adapter**
   - Extend `BaseBroker` in `engine/broker/`
   - Implement required abstract methods

3. **Create Data Stream**
   - Extend `BaseDataStream` in `engine/data/`
   - Handle WebSocket connection and message parsing

4. **Add Environment Variables**
   - Document in `.env.example`
   - Add to broker configuration

5. **Update Frontend**
   - Add broker type to Add Broker Dialog
   - Add credential fields

## Adapter Template

```python
# gotrading/backend/engine/broker/{broker_name}.py

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from .base import BaseBroker, BrokerCredentials, OrderRequest, OrderResponse, Position, Holding

logger = logging.getLogger(__name__)

class {BrokerName}Broker(BaseBroker):
    """
    Adapter for {Broker Name} trading API.
    
    Environment variables:
    - {BROKER}_CLIENT_ID: Client ID
    - {BROKER}_ACCESS_TOKEN: Access token (from OAuth)
    - {BROKER}_API_KEY: API key (if applicable)
    """
    
    def __init__(self, credentials: BrokerCredentials):
        super().__init__(credentials)
        self.client_id = credentials.client_id or os.getenv('{BROKER}_CLIENT_ID')
        self.access_token = credentials.access_token or os.getenv('{BROKER}_ACCESS_TOKEN')
        self.api_key = credentials.api_key or os.getenv('{BROKER}_API_KEY')
        self._client = None
    
    @property
    def name(self) -> str:
        return "{broker_name}"
    
    def connect(self) -> bool:
        """Initialize connection to broker API."""
        try:
            # Initialize SDK client
            # self._client = BrokerSDK(api_key=self.api_key)
            # self._client.set_access_token(self.access_token)
            logger.info(f"{self.name} broker connected")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.name}: {e}")
            return False
    
    def disconnect(self) -> None:
        """Clean up broker connection."""
        self._client = None
        logger.info(f"{self.name} broker disconnected")
    
    def authenticate(self, credentials: Dict[str, str]) -> str:
        """
        Perform OAuth authentication flow.
        Returns access token on success.
        """
        # Implement OAuth flow specific to broker
        raise NotImplementedError("Implement OAuth flow")
    
    def place_order(self, order: OrderRequest) -> OrderResponse:
        """Place an order with the broker."""
        try:
            # Map OrderRequest to broker's format
            broker_order = {
                'tradingsymbol': order.symbol,
                'exchange': order.exchange,
                'transaction_type': order.side.upper(),  # BUY/SELL
                'quantity': order.quantity,
                'product': self._map_product_type(order.product_type),
                'order_type': self._map_order_type(order.order_type),
                'price': order.price,
                'trigger_price': order.trigger_price,
            }
            
            # response = self._client.place_order(**broker_order)
            
            return OrderResponse(
                order_id=response['order_id'],
                status='SUBMITTED',
                message='Order placed successfully',
            )
        except Exception as e:
            logger.error(f"Order placement failed: {e}")
            return OrderResponse(
                order_id=None,
                status='REJECTED',
                message=str(e),
            )
    
    def cancel_order(self, order_id: str) -> bool:
        """Cancel a pending order."""
        try:
            # self._client.cancel_order(order_id=order_id)
            return True
        except Exception as e:
            logger.error(f"Order cancellation failed: {e}")
            return False
    
    def modify_order(self, order_id: str, modifications: Dict[str, Any]) -> bool:
        """Modify a pending order."""
        try:
            # self._client.modify_order(order_id=order_id, **modifications)
            return True
        except Exception as e:
            logger.error(f"Order modification failed: {e}")
            return False
    
    def get_positions(self) -> List[Position]:
        """Fetch current positions."""
        try:
            # positions = self._client.positions()
            return [
                Position(
                    symbol=p['tradingsymbol'],
                    exchange=p['exchange'],
                    quantity=p['quantity'],
                    average_price=p['average_price'],
                    pnl=p['pnl'],
                    product_type=p['product'],
                )
                for p in positions
            ]
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            return []
    
    def get_holdings(self) -> List[Holding]:
        """Fetch holdings (delivery positions)."""
        try:
            # holdings = self._client.holdings()
            return [
                Holding(
                    symbol=h['tradingsymbol'],
                    exchange=h['exchange'],
                    quantity=h['quantity'],
                    average_price=h['average_price'],
                    current_price=h['last_price'],
                )
                for h in holdings
            ]
        except Exception as e:
            logger.error(f"Failed to fetch holdings: {e}")
            return []
    
    def get_margins(self) -> Dict[str, float]:
        """Fetch margin/funds information."""
        try:
            # margins = self._client.margins()
            return {
                'available': margins['available']['cash'],
                'used': margins['utilised']['debits'],
                'total': margins['net'],
            }
        except Exception as e:
            logger.error(f"Failed to fetch margins: {e}")
            return {'available': 0, 'used': 0, 'total': 0}
    
    def _map_order_type(self, order_type: str) -> str:
        """Map generic order type to broker-specific."""
        mapping = {
            'MARKET': 'MARKET',
            'LIMIT': 'LIMIT',
            'SL': 'SL',
            'SL-M': 'SL-M',
        }
        return mapping.get(order_type, 'MARKET')
    
    def _map_product_type(self, product_type: str) -> str:
        """Map generic product type to broker-specific."""
        mapping = {
            'INTRADAY': 'MIS',
            'DELIVERY': 'CNC',
            'MARGIN': 'NRML',
        }
        return mapping.get(product_type, 'MIS')
```

## Data Stream Template

```python
# gotrading/backend/engine/data/{broker_name}_stream.py

import asyncio
import logging
from typing import Callable, List, Optional
import websockets
import json

from .base_stream import BaseDataStream, Tick

logger = logging.getLogger(__name__)

class {BrokerName}Stream(BaseDataStream):
    """WebSocket data stream for {Broker Name}."""
    
    WS_URL = "wss://api.{broker}.com/stream"
    
    def __init__(self, access_token: str, on_tick: Callable[[Tick], None]):
        super().__init__(on_tick)
        self.access_token = access_token
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._subscribed_symbols: List[str] = []
    
    async def connect(self) -> bool:
        """Establish WebSocket connection."""
        try:
            self._ws = await websockets.connect(
                f"{self.WS_URL}?token={self.access_token}"
            )
            asyncio.create_task(self._listen())
            logger.info("{BrokerName} stream connected")
            return True
        except Exception as e:
            logger.error(f"Stream connection failed: {e}")
            return False
    
    async def disconnect(self) -> None:
        """Close WebSocket connection."""
        if self._ws:
            await self._ws.close()
            self._ws = None
        logger.info("{BrokerName} stream disconnected")
    
    async def subscribe(self, symbols: List[str]) -> None:
        """Subscribe to tick data for symbols."""
        if not self._ws:
            return
        
        message = {
            'action': 'subscribe',
            'symbols': symbols,
        }
        await self._ws.send(json.dumps(message))
        self._subscribed_symbols.extend(symbols)
    
    async def unsubscribe(self, symbols: List[str]) -> None:
        """Unsubscribe from symbols."""
        if not self._ws:
            return
        
        message = {
            'action': 'unsubscribe',
            'symbols': symbols,
        }
        await self._ws.send(json.dumps(message))
        self._subscribed_symbols = [s for s in self._subscribed_symbols if s not in symbols]
    
    async def _listen(self) -> None:
        """Listen for incoming messages."""
        try:
            async for message in self._ws:
                tick = self._parse_tick(message)
                if tick:
                    self._on_tick(tick)
        except websockets.ConnectionClosed:
            logger.warning("{BrokerName} stream disconnected")
            await self._reconnect()
    
    def _parse_tick(self, message: str) -> Optional[Tick]:
        """Parse broker message into Tick object."""
        try:
            data = json.loads(message)
            return Tick(
                symbol=data['symbol'],
                ltp=data['last_price'],
                volume=data.get('volume', 0),
                bid=data.get('bid', 0),
                ask=data.get('ask', 0),
                timestamp=data.get('timestamp'),
            )
        except Exception as e:
            logger.error(f"Failed to parse tick: {e}")
            return None
    
    async def _reconnect(self) -> None:
        """Attempt to reconnect after disconnect."""
        await asyncio.sleep(5)
        if await self.connect():
            await self.subscribe(self._subscribed_symbols)
```

## Environment Variables

Add to `.env.example`:

```bash
# {Broker Name} Configuration
{BROKER}_CLIENT_ID=your_client_id
{BROKER}_API_KEY=your_api_key
{BROKER}_ACCESS_TOKEN=your_access_token
{BROKER}_API_SECRET=your_api_secret  # if needed
```

## Frontend Integration

Add broker type to Add Broker Dialog in `gotrading/frontend/src/components/add-broker-dialog.tsx`:

```typescript
const BROKER_TYPES = [
  // ... existing brokers
  {
    id: '{broker_name}',
    name: '{Broker Name}',
    logo: '/brokers/{broker_name}.png',
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'text' },
      { name: 'apiKey', label: 'API Key', type: 'password' },
      { name: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
];
```

## Checklist

- [ ] Broker adapter extends `BaseBroker`
- [ ] All abstract methods implemented
- [ ] Data stream class for WebSocket
- [ ] Environment variables documented
- [ ] Error handling with logging
- [ ] Frontend broker type added
- [ ] SDK added to `requirements.txt`
- [ ] Tested with paper trading mode
