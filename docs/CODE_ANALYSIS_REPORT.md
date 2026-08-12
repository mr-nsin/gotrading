# GoTrading Code Analysis Report

Generated: August 12, 2026

---

## 1. TRADING ENGINE ANALYSIS

### [SEVERITY: CRITICAL] Sequential Strategy Processing Creates Latency

**Location:** `backend/engine/orchestrator.py:82-83`
**Category:** Performance
**Impact:** With 16 strategies (4 brokers × 4 strategies), each tick processes sequentially. In fast markets, strategy signals lag behind price action, causing slippage and missed opportunities.
**Root Cause:** The loop `for strategy in self.active_strategies: await asyncio.to_thread(...)` processes each strategy one-by-one.
**Fix:** Use `asyncio.gather()` with concurrent execution:
```python
await asyncio.gather(*[
    asyncio.to_thread(strategy.process_tick, tick_data) 
    for strategy in self.active_strategies
])
```
**Effort:** Small (hours)

---

### [SEVERITY: CRITICAL] Risk Manager Silently Bypasses Checks on Database Errors

**Location:** `backend/engine/risk_manager.py:62-65`
**Category:** Reliability / Security
**Impact:** If any database operation fails (connection timeout, lock contention), the `except Exception` block logs the error but then continues to line 65 returning `True` (order allowed). This means orders can bypass ALL risk checks during database issues.
**Root Cause:** Broad exception handler with implicit fallthrough to `return True`.
**Fix:** Return `False` (reject order) on any exception:
```python
except Exception as e:
    logger.error(f"Error evaluating risk settings: {e}")
    return False  # Fail-safe: reject orders when risk checks can't be evaluated
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] No Order State Machine - Missing Transitions

**Location:** `backend/engine/broker/fyers_broker.py:88-98, 113-124`
**Category:** Reliability
**Impact:** Orders jump directly to "PLACED" status. No tracking of PENDING → SUBMITTED → ACCEPTED → FILLED/REJECTED lifecycle. If broker API fails after local DB commit, state becomes inconsistent.
**Root Cause:** Simplified order flow without proper state machine.
**Fix:** Implement order state machine with idempotency keys and async status polling:
```python
class OrderState(Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
```
**Effort:** Medium (days)

---

### [SEVERITY: HIGH] Race Conditions in Multi-Strategy Order Execution

**Location:** `backend/engine/orchestrator.py:82-83`, all strategy files
**Category:** Reliability
**Impact:** Multiple strategies process the same tick concurrently and may place conflicting orders (e.g., one strategy buys while another sells the same instrument). No mutex protects position state or capital allocation.
**Root Cause:** Concurrent strategy execution without coordination.
**Fix:** Implement order aggregation layer or per-symbol locks:
```python
self._symbol_locks: Dict[str, asyncio.Lock] = {}

async def execute_with_lock(self, symbol: str, order_func):
    lock = self._symbol_locks.setdefault(symbol, asyncio.Lock())
    async with lock:
        return await order_func()
```
**Effort:** Medium (days)

---

### [SEVERITY: HIGH] Event Queue Backpressure Can Block WebSocket Thread

**Location:** `backend/engine/data/fyers_stream.py:59, 83`
**Category:** Reliability
**Impact:** When `event_queue` is full (maxsize=1000), `asyncio.run_coroutine_threadsafe(...put(event))` blocks the WebSocket callback thread. This can cause the WebSocket to disconnect due to missed heartbeats.
**Root Cause:** No backpressure handling when queue is full.
**Fix:** Use `put_nowait()` with overflow handling:
```python
try:
    self.event_queue.put_nowait(event)
except asyncio.QueueFull:
    logger.warning("Event queue full - dropping tick")
    # Or maintain a latest-tick-only buffer per symbol
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] No WebSocket Reconnection Data Recovery

**Location:** `backend/engine/data/fyers_stream.py:138-142`
**Category:** Reliability
**Impact:** On reconnection after disconnect, there's no mechanism to request missed ticks. Strategies may act on stale data or miss signals entirely.
**Root Cause:** Simple reconnect loop without gap detection.
**Fix:** Implement sequence number tracking and request historical data to fill gaps on reconnect.
**Effort:** Medium (days)

---

### [SEVERITY: MEDIUM] OBI HFT Strategy Uses Random Simulation

**Location:** `backend/engine/strategies/obi_hft.py:33-36`
**Category:** Code Quality
**Impact:** The strategy uses `random.uniform(-0.1, 0.1)` to simulate order book imbalance instead of actual L2 data. Will place random trades in production.
**Root Cause:** Placeholder simulation code not connected to real data.
**Fix:** Wire OBI calculation from the DEPTH events in fyers_stream.py:
```python
def process_tick(self, tick_data: dict):
    obi = tick_data.get('obi')  # Use real OBI from fyers_stream
    if obi is not None:
        self.current_imbalance = (obi + 1) / 2  # Convert [-1,1] to [0,1]
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Memory Inefficiency in IndicatorEngine

**Location:** `backend/engine/data/indicators.py:32-34`
**Category:** Performance
**Impact:** `pd.concat()` creates a new DataFrame on every tick. With 1000+ ticks/second, this creates significant GC pressure and memory churn.
**Root Cause:** Pandas concat is O(n) and copies the entire DataFrame.
**Fix:** Use a pre-allocated numpy ring buffer:
```python
class IndicatorEngine:
    def __init__(self, buffer_size=1000):
        self.buffer_size = buffer_size
        self.prices = np.zeros(buffer_size)
        self.volumes = np.zeros(buffer_size)
        self.index = 0
        self.count = 0
    
    def add_tick(self, timestamp, ltp, volume=0):
        self.prices[self.index] = ltp
        self.volumes[self.index] = volume
        self.index = (self.index + 1) % self.buffer_size
        self.count = min(self.count + 1, self.buffer_size)
```
**Effort:** Medium (days)

---

### [SEVERITY: MEDIUM] Hardcoded Lot Sizes

**Location:** `backend/engine/strategies/gamma_scalping.py:79`, `delta_hedging.py:74,88`, `obi_hft.py:45,56`
**Category:** Code Quality
**Impact:** Lot size of 25 is hardcoded. NIFTY lot size changes (was 50, now 25, may change again). BANKNIFTY has different lot size.
**Root Cause:** No lot size lookup by instrument.
**Fix:** Create instrument master with lot sizes:
```python
LOT_SIZES = {
    "NSE:NIFTY50-INDEX": 25,
    "NSE:BANKNIFTY-INDEX": 15,
}
qty = LOT_SIZES.get(symbol, 25)
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] No Position Reconciliation with Broker

**Location:** Throughout broker adapters
**Category:** Reliability
**Impact:** Local position state can diverge from broker's actual positions (manual trades, partial fills, API failures). Risk calculations become inaccurate.
**Root Cause:** No periodic reconciliation mechanism.
**Fix:** Implement periodic position sync:
```python
async def reconcile_positions(self):
    broker_positions = await self.broker.get_positions()
    local_positions = await self.get_local_positions()
    discrepancies = self._compare(broker_positions, local_positions)
    if discrepancies:
        logger.error(f"Position mismatch: {discrepancies}")
        # Auto-correct or alert
```
**Effort:** Medium (days)

---

### [SEVERITY: LOW] Black-Scholes TTE is Static

**Location:** `backend/engine/strategies/gamma_scalping.py:21`, `delta_hedging.py:23`
**Category:** Code Quality
**Impact:** `self.tte = 14 / 365.0` is a fixed value. As time passes, the TTE should decrement toward expiry. This affects delta/gamma accuracy.
**Root Cause:** Simplified implementation.
**Fix:** Calculate TTE dynamically from expiry date:
```python
def get_tte(self, expiry_date: datetime) -> float:
    return max(0, (expiry_date - datetime.now()).total_seconds() / (365 * 24 * 3600))
```
**Effort:** Small (hours)

---

### [SEVERITY: LOW] Volatility Annualization Factor is Arbitrary

**Location:** `backend/engine/strategies/gamma_scalping.py:57`, `delta_hedging.py:56`
**Category:** Code Quality
**Impact:** The factor `94500` (supposedly 252 trading days × 375 minutes/day) doesn't account for tick frequency or actual time intervals. Volatility estimates will be inaccurate.
**Root Cause:** Simplified tick-to-annual volatility conversion.
**Fix:** Calculate based on actual tick timestamps and frequency.
**Effort:** Small (hours)

---

## 2. SECURITY AUDIT

### [SEVERITY: CRITICAL] Broker Credentials Stored in Plain Text

**Location:** `backend/models.py` (BrokerCredential model)
**Category:** Security
**Impact:** API keys, secrets, and access tokens are stored without encryption. Database compromise exposes all broker credentials.
**Root Cause:** No encryption-at-rest implementation.
**Fix:** Use Fernet encryption for sensitive fields:
```python
from cryptography.fernet import Fernet

class BrokerCredential(SQLModel, table=True):
    _encrypted_api_key: str = Field(alias="api_key")
    
    @property
    def api_key(self) -> str:
        return decrypt(self._encrypted_api_key)
    
    @api_key.setter
    def api_key(self, value: str):
        self._encrypted_api_key = encrypt(value)
```
**Effort:** Medium (days)

---

### [SEVERITY: HIGH] No Rate Limiting on Authentication Endpoints

**Location:** `backend/routes/auth.py`
**Category:** Security
**Impact:** Brute force attacks on login endpoints can succeed. No protection against credential stuffing.
**Root Cause:** Missing rate limiting middleware.
**Fix:** Add slowapi or custom rate limiter:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] API Keys Potentially Logged in Error Messages

**Location:** `backend/engine/broker/fyers_broker.py:59`, various logger calls
**Category:** Security
**Impact:** Exception messages may include credential values. Logs could expose secrets.
**Root Cause:** Logging full exception context without sanitization.
**Fix:** Sanitize logs and use structured logging without sensitive data:
```python
logger.error(f"Order failed for symbol={symbol}", extra={"order_id": order_id})
# Never: logger.error(f"API call failed: {full_response}")
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] Hardcoded CORS Origins

**Location:** `backend/main.py:287-293`
**Category:** Security
**Impact:** CORS allows only localhost origins. Production deployment will fail or require code changes.
**Root Cause:** Development configuration in production code.
**Fix:** Use environment variable for allowed origins:
```python
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, ...)
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Missing Input Validation on Order Parameters

**Location:** `backend/engine/risk_manager.py:19-29`
**Category:** Security
**Impact:** While quantity is checked for > 0 and max limit, there's no validation for:
- Symbol format injection
- Negative prices
- Invalid side values
**Root Cause:** Incomplete input validation.
**Fix:** Add comprehensive validation:
```python
VALID_SIDES = {"BUY", "SELL"}
if side.upper() not in VALID_SIDES:
    raise ValueError(f"Invalid side: {side}")
if current_market_price < 0:
    raise ValueError("Price cannot be negative")
if not re.match(r'^[A-Z]+:[A-Z0-9-]+$', symbol):
    raise ValueError(f"Invalid symbol format: {symbol}")
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] No JWT Token Expiry Validation

**Location:** `backend/routes/auth.py` (need to verify)
**Category:** Security
**Impact:** If JWT tokens don't have proper expiry validation, stolen tokens can be used indefinitely.
**Root Cause:** Missing or misconfigured token validation.
**Fix:** Ensure JWT decode validates expiry:
```python
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"verify_exp": True})
```
**Effort:** Small (hours)

---

## 3. DATABASE PERFORMANCE

### [SEVERITY: HIGH] N+1 Query in Risk Manager

**Location:** `backend/engine/risk_manager.py:45-46, 54`
**Category:** Performance
**Impact:** Two separate queries for open trades (lines 45 and 54). Called on every order check, creating database pressure.
**Root Cause:** Sequential queries instead of joined query.
**Fix:** Single query with all needed data:
```python
stmt = select(VirtualTrade).where(VirtualTrade.status == "OPEN")
open_trades = session.exec(stmt).all()
# Use same result for both position count and PnL calculation
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] Missing Database Indexes

**Location:** `backend/models.py`
**Category:** Performance
**Impact:** Queries filtering by `status`, `user_id`, `symbol`, `strategy_id` will do full table scans as data grows.
**Root Cause:** No index definitions on frequently queried columns.
**Fix:** Add indexes to models:
```python
class Order(SQLModel, table=True):
    status: str = Field(index=True)
    user_id: uuid.UUID = Field(index=True)
    symbol: str = Field(index=True)
    
    class Config:
        indexes = [
            Index("ix_order_user_status", "user_id", "status"),
        ]
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Synchronous Database Sessions in Async Context

**Location:** `backend/engine/risk_manager.py:33`, `orchestrator.py:31`, `fyers_broker.py:21`
**Category:** Performance
**Impact:** Using synchronous `Session(engine)` in code called from async context blocks the event loop.
**Root Cause:** Mixing sync and async database access.
**Fix:** Use async sessions consistently:
```python
async with AsyncSession(async_engine) as session:
    result = await session.exec(select(User))
```
**Effort:** Medium (days)

---

### [SEVERITY: MEDIUM] Unbounded Queries Without Pagination

**Location:** `backend/engine/risk_manager.py:45`, various route handlers
**Category:** Performance
**Impact:** `session.exec(select(VirtualTrade).where(...)).all()` loads all matching rows into memory. With many trades, this can exhaust memory.
**Root Cause:** No LIMIT clause on queries.
**Fix:** Always paginate or limit queries:
```python
stmt = select(VirtualTrade).where(VirtualTrade.status == "OPEN").limit(1000)
```
**Effort:** Small (hours)

---

## 4. REAL-TIME PIPELINE

### [SEVERITY: HIGH] No Duplicate Tick Filtering

**Location:** `backend/engine/data/fyers_stream.py:61-83`
**Category:** Reliability
**Impact:** Same tick may be received multiple times (network retries, API behavior). Strategies will process duplicates, potentially double-counting signals.
**Root Cause:** No deduplication logic.
**Fix:** Track last timestamp per symbol:
```python
self._last_tick: Dict[str, int] = {}

def _on_message(self, message):
    symbol = message.get("symbol")
    timestamp = message.get("timestamp")
    if self._last_tick.get(symbol) == timestamp:
        return  # Duplicate
    self._last_tick[symbol] = timestamp
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Redis Pub/Sub Message Ordering Not Guaranteed

**Location:** `backend/engine/orchestrator.py:86-92`
**Category:** Reliability
**Impact:** Redis pub/sub doesn't guarantee message ordering across multiple publishers. Frontend may receive out-of-order ticks.
**Root Cause:** Redis pub/sub design limitation.
**Fix:** Include sequence numbers in messages:
```python
self._sequence = 0
payload = {
    "type": "TICK",
    "seq": self._sequence,
    "data": tick_data,
}
self._sequence += 1
```
**Effort:** Small (hours)

---

## 5. SECURITY AUDIT (CONTINUED)

### [SEVERITY: CRITICAL] Hardcoded JWT Secret Key

**Location:** `backend/routes/auth.py:12`
**Category:** Security
**Impact:** If `JWT_SECRET_KEY` environment variable is not set, the system uses "supersecret" as the default. This allows anyone to forge valid JWT tokens.
**Root Cause:** Insecure default value in production code.
**Fix:** Fail startup if secret is not configured:
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable must be set")
```
**Effort:** Small (hours)

---

### [SEVERITY: HIGH] No Authentication on API Endpoints

**Location:** `backend/routes/brokers.py`, `backend/routes/orders.py`, etc.
**Category:** Security
**Impact:** All broker and order endpoints are publicly accessible. Anyone can view credentials, place orders, or modify strategies.
**Root Cause:** Missing authentication dependency injection.
**Fix:** Add authentication middleware:
```python
from fastapi import Depends
from auth import get_current_user

@router.get("")
def list_brokers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # Add this
):
```
**Effort:** Medium (days)

---

### [SEVERITY: HIGH] Hardcoded Seed Credentials in Code

**Location:** `backend/routes/brokers.py:142-241`
**Category:** Security
**Impact:** Function `seed_default_brokers()` creates fake but plausible broker credentials. If accidentally deployed, could expose demo credentials or confuse production data.
**Root Cause:** Development convenience code in production routes.
**Fix:** Move to separate seeding script, never auto-seed in production:
```python
if os.getenv("ENVIRONMENT") == "development":
    brokers = seed_default_brokers(session)
else:
    return []  # Empty list in production
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] SQL Echo Enabled in Production

**Location:** `backend/database.py:12`
**Category:** Security / Performance
**Impact:** `echo=True` logs all SQL queries including potentially sensitive data (credentials, user info).
**Root Cause:** Debug setting left enabled.
**Fix:** Disable in production:
```python
engine = create_engine(DATABASE_URL, echo=os.getenv("DEBUG", "").lower() == "true", ...)
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] No WebSocket Authentication

**Location:** `backend/routes/stream.py:141-151`
**Category:** Security
**Impact:** WebSocket endpoint `/stream/ws/dashboard` accepts any connection. Portfolio data, positions, and P&L are broadcast to unauthorized clients.
**Root Cause:** Missing token validation on WebSocket connect.
**Fix:** Validate token in connection handshake:
```python
@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket, token: str = Query(...)):
    user = validate_token(token)
    if not user:
        await websocket.close(code=4001)
        return
    await manager.connect(websocket)
```
**Effort:** Small (hours)

---

## 6. DATABASE PERFORMANCE (CONTINUED)

### [SEVERITY: MEDIUM] Database Queries Inside WebSocket Broadcast Loop

**Location:** `backend/routes/stream.py:62-121`
**Category:** Performance
**Impact:** Every second, `fetch_snapshot()` makes 4 separate database queries for all connected clients. With many clients, this creates significant database load.
**Root Cause:** Fetching fresh data on every broadcast instead of caching.
**Fix:** Cache snapshot with short TTL:
```python
_cached_snapshot = None
_cache_time = 0

def fetch_snapshot():
    global _cached_snapshot, _cache_time
    now = time.time()
    if _cached_snapshot and (now - _cache_time) < 0.5:  # 500ms cache
        return _cached_snapshot
    # ... fetch from DB ...
    _cached_snapshot = result
    _cache_time = now
    return result
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Missing Composite Indexes

**Location:** `backend/models.py`
**Category:** Performance
**Impact:** Common query patterns like "orders by user and status" or "trades by strategy and status" require composite indexes for efficiency.
**Root Cause:** Only single-column indexes defined.
**Fix:** Add composite indexes:
```python
class VirtualTrade(SQLModel, table=True):
    __table_args__ = (
        Index("ix_virtualtrade_status_strategy", "status", "strategy_name"),
    )
```
**Effort:** Small (hours)

---

## 7. FRONTEND PERFORMANCE

### [SEVERITY: HIGH] Dashboard Uses Mock Data Instead of Live API

**Location:** `frontend/src/app/page.tsx:24-37`
**Category:** Code Quality
**Impact:** The dashboard imports from `@/lib/mock-data` instead of using the API client. Real trading data is not displayed.
**Root Cause:** Incomplete integration - mock data for development not replaced.
**Fix:** Replace mock data imports with React Query hooks:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { data: strategies } = useQuery({
  queryKey: ['strategies'],
  queryFn: api.getStrategies,
  refetchInterval: 5000,
});
```
**Effort:** Medium (days)

---

### [SEVERITY: MEDIUM] Missing React Query Configuration for Real-Time Data

**Location:** `frontend/src/lib/api.ts`
**Category:** Performance
**Impact:** API client doesn't include React Query hooks. Each component will need to implement its own caching strategy.
**Root Cause:** Basic fetch wrapper without query integration.
**Fix:** Add pre-configured React Query hooks:
```typescript
export const useStrategies = () => useQuery({
  queryKey: ['strategies'],
  queryFn: api.getStrategies,
  staleTime: 5000,
  refetchInterval: 10000,
});
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] No WebSocket Hook Implementation

**Location:** Frontend codebase
**Category:** Performance
**Impact:** No React hook for WebSocket connection to `/stream/ws/dashboard`. Real-time updates require manual implementation in each component.
**Root Cause:** Missing WebSocket integration layer.
**Fix:** Create WebSocket hook with MessagePack decoder:
```typescript
import msgpack from '@msgpack/msgpack';

export function useDashboardStream() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/stream/ws/dashboard`);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (event) => {
      const decoded = msgpack.decode(new Uint8Array(event.data));
      setData(decoded);
    };
    return () => ws.close();
  }, []);
  return data;
}
```
**Effort:** Small (hours)

---

### [SEVERITY: MEDIUM] Large Bundle Size Risk

**Location:** `frontend/package.json`
**Category:** Performance
**Impact:** 15+ Radix UI packages, Recharts, and motion library may create large bundle. No evidence of tree-shaking optimization.
**Root Cause:** Many UI dependencies without bundle analysis.
**Fix:** 
1. Run `ANALYZE=true next build` to generate bundle report
2. Dynamically import heavy components (charts, dialogs)
3. Consider replacing Recharts with lightweight-charts for trading data
**Effort:** Medium (days)

---

### [SEVERITY: LOW] No Memoization on Expensive Computations

**Location:** `frontend/src/app/page.tsx:51-78`
**Category:** Performance
**Impact:** `filteredStrategies`, `recentOrders`, `pnlByStrategy`, `allocation`, `movers` are recomputed on every render, not just when dependencies change.
**Root Cause:** Using plain variables instead of useMemo consistently.
**Fix:** Wrap all derived data in useMemo:
```typescript
const filteredStrategies = useMemo(() => 
  strategies.filter(s => ...),
  [strategies, strategyFilter, brokerFilter]
);
```
**Effort:** Small (hours)

---

## 8. TESTING GAPS

### Current Test Coverage: ~0%

No test files found in the repository. The following tests are critically needed:

### 1. Risk Manager Unit Tests (CRITICAL)

```python
# tests/test_risk_manager.py
class TestRiskManager:
    def test_rejects_zero_quantity(self):
        """Quantity <= 0 should be rejected"""
        
    def test_rejects_over_max_quantity(self):
        """Quantity over max_qty_per_order should be rejected"""
        
    def test_circuit_breaker_blocks_orders(self):
        """Orders rejected when drawdown exceeds threshold"""
        
    def test_max_positions_blocks_buy(self):
        """BUY rejected when max_open_positions reached"""
        
    def test_daily_loss_limit_blocks_orders(self):
        """Orders rejected when daily loss limit exceeded"""
        
    def test_database_error_fails_safe(self):
        """CRITICAL: Must return False on database errors"""
        
    def test_concurrent_order_checks(self):
        """Race condition handling with multiple strategies"""
```

### 2. Broker Adapter Integration Tests

```python
# tests/test_broker_adapters.py
class TestFyersBroker:
    def test_order_placement_success(self):
        """Mock successful order placement"""
        
    def test_order_placement_api_error(self):
        """Handle Fyers API rejection gracefully"""
        
    def test_paper_trading_mode(self):
        """PAPER_TRADING=True creates mock orders"""
        
    def test_symbol_resolution(self):
        """Correct symbol format for Fyers API"""
        
    def test_missing_credentials(self):
        """Graceful degradation without API keys"""
```

### 3. Strategy Unit Tests

```python
# tests/test_strategies.py
class TestGammaScalpingStrategy:
    def test_delta_calculation_accuracy(self):
        """Black-Scholes delta within 1% of reference"""
        
    def test_threshold_trigger_long(self):
        """BUY signal when delta <= -threshold"""
        
    def test_threshold_trigger_short(self):
        """SELL signal when delta >= +threshold"""
        
    def test_volatility_calculation(self):
        """Realized vol calculation correctness"""
        
    def test_ignores_wrong_symbol(self):
        """No action on ticks for other symbols"""
```

### 4. WebSocket/Streaming Tests

```python
# tests/test_streaming.py
class TestFyersDataPipeline:
    def test_tick_parsing(self):
        """Correctly parse Fyers tick format"""
        
    def test_indicator_enrichment(self):
        """VWAP/Supertrend added to events"""
        
    def test_queue_full_handling(self):
        """Graceful handling when queue is full"""
        
    def test_reconnection_after_disconnect(self):
        """Reconnects within 5 seconds"""
        
    def test_duplicate_tick_filtering(self):
        """Same timestamp filtered out"""
```

### 5. API Endpoint Tests

```python
# tests/test_api.py
class TestAuthEndpoints:
    def test_fyers_link_creates_user(self):
        """New user created on first OAuth"""
        
    def test_jwt_token_expiry(self):
        """Token expires after configured time"""
        
class TestBrokerEndpoints:
    def test_list_brokers_requires_auth(self):
        """401 without valid token"""
        
    def test_credentials_masked_in_response(self):
        """API keys not exposed in list response"""
```

### 6. Load Tests (Locust/k6)

```python
# tests/load/locustfile.py
class TradingUser(HttpUser):
    @task
    def get_positions(self):
        """Simulate dashboard polling"""
        
    @task
    def place_order(self):
        """Concurrent order submission"""
        
# Targets:
# - 100 concurrent users
# - < 100ms p95 latency for reads
# - < 500ms p95 latency for order placement
# - No errors under load
```

### 7. End-to-End Tests

```python
# tests/e2e/test_trading_flow.py
class TestTradingFlow:
    def test_strategy_signal_to_order(self):
        """Full flow: tick → strategy → risk check → order"""
        
    def test_position_mtm_update(self):
        """Position P&L updated on price change"""
        
    def test_circuit_breaker_stops_all(self):
        """All strategies paused on circuit breaker"""
```

### Recommended Test Setup

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run tests with coverage
pytest --cov=backend --cov-report=html

# Target: 80% coverage minimum
```

### Priority Test Files to Create:

1. `tests/test_risk_manager.py` - Highest priority (financial safety)
2. `tests/test_broker_adapters.py` - Order execution correctness
3. `tests/test_strategies.py` - Trading logic validation
4. `tests/test_api.py` - Security and endpoint contracts
5. `tests/test_streaming.py` - Data pipeline reliability

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 14 |
| MEDIUM | 16 |
| LOW | 4 |

**Total Issues Found: 40**

### Top Priority Fixes (Do First - CRITICAL):
1. **Fix risk manager silent bypass on exceptions** - Orders bypass all risk checks on DB errors
2. **Remove hardcoded JWT secret** - Anyone can forge tokens with default "supersecret"
3. **Add authentication to API endpoints** - All endpoints publicly accessible
4. **Encrypt broker credentials at rest** - Plain text API keys in database
5. **Implement concurrent strategy processing** - Sequential processing adds latency
6. **Add event queue backpressure handling** - Can block WebSocket thread

### High Priority Fixes (Do Soon):
7. Add rate limiting to auth endpoints
8. Fix WebSocket authentication
9. Add order state machine
10. Implement position reconciliation
11. Fix N+1 queries in risk manager
12. Replace mock data with live API in frontend
13. Add database indexes on frequently queried columns
14. Implement WebSocket reconnection with data recovery

### Quick Wins (Low Effort, High Impact):
- Disable SQL echo in production
- Move seed data to dev-only script
- Add input validation on order parameters
- Implement duplicate tick filtering
- Add sequence numbers to Redis messages
