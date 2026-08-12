# GoTrading Multi-Expert Analysis Report

**Generated:** August 12, 2026  
**Repository:** GoTrading (FastAPI + Next.js Algorithmic Trading Platform)

---

## Executive Summary

| Expert Role | Critical | High | Medium | Low | Total |
|-------------|----------|------|--------|-----|-------|
| 1. HFT Systems Engineer | 2 | 3 | 2 | 1 | 8 |
| 2. Distributed Systems Architect | 1 | 4 | 2 | 0 | 7 |
| 3. Full-Stack Integration Specialist | 0 | 2 | 3 | 1 | 6 |
| 4. Application Security Engineer | 3 | 3 | 2 | 0 | 8 |
| 5. Database Performance Engineer | 1 | 2 | 3 | 0 | 6 |
| 6. Quantitative Trading Expert | 2 | 2 | 3 | 1 | 8 |
| 7. QA Lead | 1 | 3 | 2 | 0 | 6 |
| **TOTAL** | **10** | **19** | **17** | **3** | **49** |

---

# ROLE 1: HFT Systems Engineer

*"Sequential is the enemy. Everything must be parallel."*

## Findings

### ⏱️ LATENCY ISSUE #1: Sequential Strategy Processing [CRITICAL]

**Location:** `backend/engine/orchestrator.py:82-83`

**Current:**
```python
for strategy in self.active_strategies:
    await asyncio.to_thread(strategy.process_tick, tick_data)
```

**Impact:** With 16 strategies (4 brokers × 4 strategies), each tick is processed sequentially. If each strategy takes 5ms, total latency = 80ms per tick. During fast market moves, strategies receive stale data.

**Fix:**
```python
await asyncio.gather(*[
    asyncio.to_thread(strategy.process_tick, tick_data)
    for strategy in self.active_strategies
])
```

**Expected Improvement:** 80ms → 5ms (16x faster)

---

### ⏱️ LATENCY ISSUE #2: Memory Allocation Per Tick [CRITICAL]

**Location:** `backend/engine/data/indicators.py:23-34`

**Current:**
```python
new_row = pd.DataFrame([{...}])  # New DataFrame allocation
self.history = pd.concat([self.history, new_row], ignore_index=True)  # Full copy
```

**Impact:** `pd.concat()` copies the entire DataFrame on every tick. With 1000 rows buffer and 10 ticks/second:
- 1000 × 6 columns × 8 bytes × 10/sec = ~480KB/sec allocations
- Triggers Python GC, causing latency spikes of 10-50ms

**Fix:**
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

**Expected Improvement:** Eliminates GC spikes, reduces memory churn by 99%

---

### ⏱️ LATENCY ISSUE #3: Database Query in Hot Path [HIGH]

**Location:** `backend/engine/risk_manager.py:33-60`

**Current:** Every order check executes 3-4 database queries:
- Line 34: `session.get(RiskSettings, 1)`
- Line 45: `session.exec(select(VirtualTrade).where(...))`
- Line 51: `session.get(VirtualPortfolio, 1)`
- Line 54: `session.exec(select(VirtualTrade).where(...))` (duplicate!)

**Impact:** Each DB query adds 1-5ms. Total: 4-20ms per order check × 16 strategies = up to 320ms added latency.

**Fix:** Cache risk settings and positions in memory, refresh every 100ms:
```python
class RiskManager:
    def __init__(self):
        self._cache = {}
        self._cache_time = 0
        
    def _refresh_cache(self):
        if time.time() - self._cache_time > 0.1:  # 100ms TTL
            with Session(engine) as session:
                self._cache['settings'] = session.get(RiskSettings, 1)
                self._cache['open_trades'] = session.exec(...).all()
            self._cache_time = time.time()
```

**Expected Improvement:** 4-20ms → <1ms per check

---

### ⏱️ LATENCY ISSUE #4: Synchronous DB in Async Context [HIGH]

**Location:** `backend/engine/orchestrator.py:31-34`, `backend/engine/risk_manager.py:33`

**Current:**
```python
with Session(engine) as session:  # Blocks event loop!
    user = session.exec(select(User)).first()
```

**Impact:** Synchronous `Session()` in async code blocks the entire event loop. All WebSocket clients and strategies freeze during DB access.

**Fix:** Use async sessions consistently:
```python
async with AsyncSession(async_engine) as session:
    result = await session.exec(select(User))
```

**Expected Improvement:** Eliminates event loop blocking

---

### ⏱️ LATENCY ISSUE #5: VWAP/Supertrend Recalculation [HIGH]

**Location:** `backend/engine/data/indicators.py:36-89`

**Current:** Full VWAP and Supertrend recalculated on entire history every tick.

**Impact:** O(n) calculation where n=1000 buffer size. Adds 1-2ms per tick.

**Fix:** Incremental VWAP calculation:
```python
def add_tick(self, timestamp, ltp, volume):
    self.cumulative_tpv += ltp * volume
    self.cumulative_volume += volume
    self.vwap = self.cumulative_tpv / self.cumulative_volume if self.cumulative_volume > 0 else ltp
```

**Expected Improvement:** O(n) → O(1), saves 1-2ms per tick

---

### ⏱️ LATENCY ISSUE #6: Broker API Not Async [MEDIUM]

**Location:** `backend/engine/broker/fyers_broker.py:105`

**Current:**
```python
response = self.fyers.place_order(data=data)  # Blocking HTTP call
```

**Impact:** Synchronous HTTP call to broker API. Takes 50-200ms and blocks strategy execution.

**Fix:** Use async HTTP client:
```python
async def execute_order_async(self, ...):
    async with httpx.AsyncClient() as client:
        response = await client.post(...)
```

**Expected Improvement:** Non-blocking order execution

---

### ⏱️ LATENCY ISSUE #7: Redis Publish Per Tick [MEDIUM]

**Location:** `backend/engine/orchestrator.py:86-92`

**Current:**
```python
await self.redis.publish("market_data", msgpack.packb(payload))
```

**Impact:** Redis publish adds 0.5-2ms per tick. With high tick rate, this becomes significant.

**Fix:** Batch publishes or use Redis streams:
```python
self._publish_buffer.append(payload)
if len(self._publish_buffer) >= 10 or time.time() - self._last_publish > 0.1:
    await self.redis.publish("market_data", msgpack.packb(self._publish_buffer))
    self._publish_buffer = []
```

**Expected Improvement:** 10x fewer Redis calls

---

### ⏱️ LATENCY ISSUE #8: No Tick Deduplication [LOW]

**Location:** `backend/engine/data/fyers_stream.py:61-83`

**Current:** No check for duplicate ticks with same timestamp.

**Impact:** Duplicate processing wastes CPU cycles.

**Fix:**
```python
if self._last_tick.get(symbol) == timestamp:
    return  # Skip duplicate
self._last_tick[symbol] = timestamp
```

---

# ROLE 2: Distributed Systems Architect

*"What happens when this component fails?"*

## Findings

### 💥 FAILURE MODE #1: Event Queue Overflow Blocks WebSocket [CRITICAL]

**Location:** `backend/engine/data/fyers_stream.py:59,83`

**Trigger:** Market moves fast, queue fills to maxsize=1000

**Current behavior:**
```python
asyncio.run_coroutine_threadsafe(self.event_queue.put(event), self.loop)
```
`put()` blocks when queue is full. This blocks the WebSocket callback thread, causing:
- Missed heartbeats → WebSocket disconnect
- Data loss during reconnection

**Blast radius:** All strategies stop receiving data. Trading halts.

**Fix:**
```python
try:
    self.event_queue.put_nowait(event)
except asyncio.QueueFull:
    logger.warning(f"Queue full, dropping tick for {message.get('symbol')}")
    self._dropped_ticks += 1
```

---

### 💥 FAILURE MODE #2: Redis Unavailable Crashes System [HIGH]

**Location:** `backend/engine/orchestrator.py:86-92`, `backend/main.py:260`

**Trigger:** Redis server stops or network issue

**Current behavior:**
```python
await self.redis.publish("market_data", ...)  # Throws exception
```
Exception propagates up, potentially crashing consumer loop.

**Blast radius:** Strategy orchestrator dies, all trading stops.

**Fix:**
```python
if self.redis:
    try:
        await self.redis.publish("market_data", msgpack.packb(payload))
    except Exception as e:
        logger.error(f"Redis publish failed: {e}")
        # Continue processing - Redis is optional for core trading
```

---

### 💥 FAILURE MODE #3: No WebSocket Reconnection Data Recovery [HIGH]

**Location:** `backend/engine/data/fyers_stream.py:119-142`

**Trigger:** Network blip, Fyers API restart

**Current behavior:**
```python
while self._running:
    try:
        self.fs.connect()
    except Exception as e:
        time.sleep(5)  # Wait and retry
```
After reconnect, no mechanism to request missed ticks.

**Blast radius:** Strategies operate on stale data, potentially making wrong decisions.

**Fix:** Track sequence numbers, request gap fill on reconnect:
```python
def _on_open(self):
    if self._last_sequence:
        # Request missed data from last sequence
        self.fs.request_history(since=self._last_sequence)
```

---

### 💥 FAILURE MODE #4: Broker API Timeout Blocks All Strategies [HIGH]

**Location:** `backend/engine/broker/fyers_broker.py:105`

**Trigger:** Fyers API slow response (>30s)

**Current behavior:** Synchronous call with no timeout. Blocks until response or TCP timeout.

**Blast radius:** The strategy thread is blocked. With sequential processing, ALL strategies are blocked.

**Fix:**
```python
response = self.fyers.place_order(data=data, timeout=5)  # 5 second timeout
```

---

### 💥 FAILURE MODE #5: Consumer Exception Kills Trading [HIGH]

**Location:** `backend/engine/orchestrator.py:99-100`

**Trigger:** Any unhandled exception in consumer loop

**Current behavior:**
```python
except Exception as e:
    logger.error(f"Error in StrategyOrchestrator consumer loop: {e}")
    # Loop continues, but what if it's a persistent error?
```
Persistent errors cause infinite error logging with no recovery.

**Blast radius:** Consumer may get stuck in error state.

**Fix:** Add circuit breaker and backoff:
```python
self._consecutive_errors = 0
MAX_CONSECUTIVE_ERRORS = 10

except Exception as e:
    self._consecutive_errors += 1
    if self._consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
        logger.critical("Too many errors, pausing consumer")
        await asyncio.sleep(30)
        self._consecutive_errors = 0
```

---

### 💥 FAILURE MODE #6: WebSocket Broadcast Fails Silently [MEDIUM]

**Location:** `backend/routes/stream.py:127-133`

**Trigger:** Client connection in bad state

**Current behavior:**
```python
results = await asyncio.gather(*send_futures, return_exceptions=True)
for client, res in zip(clients, results):
    if isinstance(res, Exception):
        await self.disconnect(client)
```
Dead connections are removed, but no logging of why clients are failing.

**Fix:** Add monitoring:
```python
if isinstance(res, Exception):
    logger.warning(f"WebSocket send failed: {type(res).__name__}")
    await self.disconnect(client)
```

---

### 💥 FAILURE MODE #7: Database Pool Exhaustion [MEDIUM]

**Location:** `backend/database.py:87-93`

**Trigger:** Many concurrent requests, slow queries

**Current behavior:** Pool size = 20, max_overflow = 10. If all 30 connections are used, new requests block.

**Fix:** Add pool monitoring and timeout:
```python
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_timeout=5,  # Fail fast if no connection available
    pool_pre_ping=True
)
```

---

# ROLE 3: Full-Stack Integration Specialist

*"The frontend and backend must speak the same language."*

## Findings

### 🔗 INTEGRATION GAP #1: No WebSocket Integration in Frontend [HIGH]

**Location:** `frontend/src/hooks/use-api.ts` (missing), `backend/routes/stream.py:141`

**Backend provides:** WebSocket at `/stream/ws/dashboard` with MessagePack binary frames

**Frontend expects:** The frontend uses React Query polling (5-30 second intervals) instead of WebSocket.

**User impact:** Data is 5-30 seconds stale instead of real-time. In fast markets, positions and P&L displayed are outdated.

**Fix frontend:**
```typescript
// hooks/use-websocket.ts
export function useDashboardStream() {
  const [data, setData] = useState<DashboardUpdate | null>(null);
  
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

---

### 🔗 INTEGRATION GAP #2: Missing staleTime for Critical Data [HIGH]

**Location:** `frontend/src/hooks/use-api.ts:8-13, 151-157`

**Frontend current:**
```typescript
export function useDashboardTotals() {
  return useQuery({
    queryKey: ['dashboard', 'totals'],
    queryFn: api.getDashboardTotals,
    refetchInterval: 5000,
    // No staleTime - data considered stale immediately
  });
}
```

**User impact:** Every component mount triggers a new API call even if data was just fetched. Unnecessary API load.

**Fix:**
```typescript
export function useDashboardTotals() {
  return useQuery({
    queryKey: ['dashboard', 'totals'],
    queryFn: api.getDashboardTotals,
    refetchInterval: 5000,
    staleTime: 3000,  // Data fresh for 3 seconds
  });
}
```

---

### 🔗 INTEGRATION GAP #3: Field Naming Inconsistency [MEDIUM]

**Location:** `frontend/src/lib/api.ts:21-54` vs `backend/models.py`

**Backend provides (snake_case):**
```python
class Strategy:
    todays_pnl: float
    total_pnl: float
    win_rate: float
```

**Frontend expects (mixed):**
```typescript
interface Strategy {
  todayPnl: number;      // camelCase
  todays_pnl?: number;   // Also accepts snake_case
  win_rate?: number;     // snake_case
  winRate?: number;      // Also camelCase
}
```

**User impact:** Confusing dual field support, potential bugs if backend changes format.

**Fix:** Standardize on one convention with transformer:
```typescript
function transformStrategy(raw: RawStrategy): Strategy {
  return {
    todayPnl: raw.todays_pnl ?? raw.todayPnl,
    winRate: raw.win_rate ?? raw.winRate,
    // ...
  };
}
```

---

### 🔗 INTEGRATION GAP #4: No Error Boundary for API Failures [MEDIUM]

**Location:** `frontend/src/app/page.tsx`

**Current:** If API fails, React Query shows loading forever or crashes.

**User impact:** User sees blank screen or infinite spinner on network error.

**Fix:**
```typescript
const { data, isLoading, error } = useDashboardTotals();

if (error) {
  return <ErrorBoundary message="Failed to load dashboard" onRetry={refetch} />;
}
```

---

### 🔗 INTEGRATION GAP #5: No Optimistic Updates for Trading Actions [MEDIUM]

**Location:** `frontend/src/hooks/use-api.ts:159-168`

**Current:**
```typescript
export function useSquareOffPosition() {
  return useMutation({
    mutationFn: api.squareOffPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
```

**User impact:** After clicking "Square Off", UI waits for API response before updating. User doesn't know if click registered.

**Fix:**
```typescript
export function useSquareOffPosition() {
  return useMutation({
    mutationFn: api.squareOffPosition,
    onMutate: async (id) => {
      await queryClient.cancelQueries(['positions']);
      const previous = queryClient.getQueryData(['positions']);
      queryClient.setQueryData(['positions'], (old) => 
        old.map(p => p.id === id ? {...p, status: 'SQUARING_OFF'} : p)
      );
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['positions'], context.previous);
    },
  });
}
```

---

### 🔗 INTEGRATION GAP #6: WebSocket Reconnection Not Handled [LOW]

**Location:** Not implemented

**User impact:** If WebSocket disconnects (when implemented), user sees stale data without notification.

**Fix:** Add connection status indicator and auto-reconnect with exponential backoff.

---

# ROLE 4: Application Security Engineer

*"Trust nothing. Validate everything."*

## Findings

### 🔓 VULNERABILITY #1: Hardcoded JWT Secret [CRITICAL - CVSS 9.8]

**Location:** `backend/routes/auth.py:12`

**Current:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecret")
```

**Attack vector:** If env var not set, attacker can forge any JWT token with `"supersecret"` and impersonate any user.

**Proof of concept:**
```python
import jwt
token = jwt.encode({"sub": "admin-uuid", "exp": 9999999999}, "supersecret", algorithm="HS256")
# Use token to access any endpoint
```

**Remediation:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "supersecret":
    raise RuntimeError("JWT_SECRET_KEY must be set to a secure random value")
```

**Priority:** CRITICAL - Fix immediately

---

### 🔓 VULNERABILITY #2: No Authentication on API Endpoints [CRITICAL - CVSS 9.1]

**Location:** `backend/routes/brokers.py`, `backend/routes/orders.py`, all routes

**Current:** No `Depends(get_current_user)` on any endpoint.

**Attack vector:** Anyone can:
- View all broker credentials: `GET /api/v1/brokers`
- View all orders: `GET /api/v1/orders`
- Modify strategies: `PUT /api/v1/strategies/{id}`
- Access user data without authentication

**Proof of concept:**
```bash
curl http://localhost:8000/api/v1/brokers
# Returns all broker credentials including API keys
```

**Remediation:** Add auth dependency to all routes:
```python
@router.get("")
def list_brokers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # ADD THIS
):
```

**Priority:** CRITICAL - Fix immediately

---

### 🔓 VULNERABILITY #3: Broker Credentials Stored in Plain Text [CRITICAL - CVSS 8.6]

**Location:** `backend/models.py:25-29`

**Current:**
```python
class BrokerCredentialBase(SQLModel):
    fyers_app_id: Optional[str] = None
    fyers_access_token: Optional[str] = None  # Plain text!
    zerodha_api_key: Optional[str] = None     # Plain text!
```

**Attack vector:** Database breach exposes all broker API keys. Attacker can place trades on user accounts.

**Remediation:** Encrypt sensitive fields:
```python
from cryptography.fernet import Fernet

class BrokerCredential(BrokerCredentialBase, table=True):
    _encrypted_access_token: str = Field(alias="fyers_access_token")
    
    @property
    def fyers_access_token(self) -> str:
        return decrypt(self._encrypted_access_token)
```

**Priority:** CRITICAL

---

### 🔓 VULNERABILITY #4: No WebSocket Authentication [HIGH - CVSS 7.5]

**Location:** `backend/routes/stream.py:141-151`

**Current:**
```python
@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)  # No auth check!
```

**Attack vector:** Anyone can connect to WebSocket and receive:
- Real-time P&L
- Open positions
- Trading activity
- Broker connection status

**Remediation:**
```python
@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket, token: str = Query(...)):
    user = validate_jwt_token(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    await manager.connect(websocket, user_id=user.id)
```

**Priority:** HIGH

---

### 🔓 VULNERABILITY #5: Risk Manager Allows Orders on Exception [HIGH - CVSS 7.2]

**Location:** `backend/engine/risk_manager.py:62-66`

**Current:**
```python
except Exception as e:
    logger.error(f"Error evaluating risk settings: {e}")
    # Falls through to...
logger.info(f"Risk Check Passed: {side} {quantity} {symbol}")
return True  # ORDER ALLOWED!
```

**Attack vector:** If attacker can cause database error (connection exhaustion, malformed data), ALL risk checks are bypassed.

**Remediation:**
```python
except Exception as e:
    logger.error(f"Error evaluating risk settings: {e}")
    return False  # FAIL SAFE - Reject order on any error
```

**Priority:** HIGH

---

### 🔓 VULNERABILITY #6: No Rate Limiting [HIGH - CVSS 6.5]

**Location:** All routes

**Attack vector:** Brute force attacks on:
- Auth endpoints (password guessing)
- Order endpoints (order flooding)
- API in general (DoS)

**Remediation:**
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(...):
```

**Priority:** HIGH

---

### 🔓 VULNERABILITY #7: SQL Echo Enabled [MEDIUM - CVSS 4.3]

**Location:** `backend/database.py:12`

**Current:**
```python
engine = create_engine(DATABASE_URL, echo=True, ...)
```

**Attack vector:** All SQL queries logged including potentially sensitive data. Logs may be accessible.

**Remediation:**
```python
engine = create_engine(DATABASE_URL, echo=os.getenv("DEBUG") == "true", ...)
```

---

### 🔓 VULNERABILITY #8: No Input Validation on Order Parameters [MEDIUM - CVSS 5.3]

**Location:** `backend/engine/risk_manager.py:19-30`

**Current:** Only checks quantity > 0 and < max. No validation for:
- Symbol format (could be SQL injection vector if used in raw queries)
- Side value (only "BUY"/"SELL" valid)
- Negative prices

**Remediation:**
```python
VALID_SIDES = {"BUY", "SELL"}
SYMBOL_PATTERN = re.compile(r'^[A-Z]+:[A-Z0-9-]+$')

def check_order(self, symbol: str, side: str, quantity: int, price: float):
    if side.upper() not in VALID_SIDES:
        raise ValueError(f"Invalid side: {side}")
    if not SYMBOL_PATTERN.match(symbol):
        raise ValueError(f"Invalid symbol: {symbol}")
    if price < 0:
        raise ValueError("Price cannot be negative")
```

---

# ROLE 5: Database Performance Engineer

*"Every query in a loop is a crime."*

## Findings

### 🗄️ QUERY ISSUE #1: N+1 Query Pattern in Risk Manager [CRITICAL]

**Location:** `backend/engine/risk_manager.py:45, 54`

**Current query:**
```python
# Line 45: First query for open trades
open_trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()

# Line 54: SAME QUERY AGAIN!
open_trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
```

**Frequency:** Called on EVERY order check

**Problem:** Duplicate query in same function. With 16 strategies placing orders, this is 32 queries per tick.

**Fix:**
```python
def check_order(self, ...):
    with Session(engine) as session:
        settings = session.get(RiskSettings, 1)
        portfolio = session.get(VirtualPortfolio, 1)
        open_trades = session.exec(select(VirtualTrade).where(VirtualTrade.status == "OPEN")).all()
        
        # Reuse open_trades for both checks
        if len(open_trades) >= settings.max_open_positions:
            return False
        unrealized = sum(t.pnl or 0.0 for t in open_trades)
```

---

### 🗄️ QUERY ISSUE #2: WebSocket Broadcast Queries [HIGH]

**Location:** `backend/routes/stream.py:64-78`

**Current query:**
```python
def fetch_snapshot():
    with Session(engine) as session:
        portfolio = session.get(VirtualPortfolio, 1)           # Query 1
        trades = session.exec(select(VirtualTrade)...).all()    # Query 2
        logs = session.exec(select(LogEntry)...).all()          # Query 3
        brokers = session.exec(select(BrokerCredential)).all()  # Query 4
```

**Frequency:** Every 1 second × number of connected clients

**Problem:** 4 queries per second per client. With 100 clients = 400 queries/second.

**Fix:** Cache with short TTL:
```python
_snapshot_cache = None
_cache_time = 0

async def _broadcast_loop(self):
    global _snapshot_cache, _cache_time
    
    if time.time() - _cache_time > 0.5:  # Refresh every 500ms
        _snapshot_cache = await asyncio.to_thread(fetch_snapshot)
        _cache_time = time.time()
    
    # Broadcast cached snapshot to all clients
```

---

### 🗄️ QUERY ISSUE #3: Missing Indexes [HIGH]

**Location:** `backend/models.py`

**Problem:** Frequently filtered columns lack indexes:

| Table | Column | Query Pattern | Impact |
|-------|--------|---------------|--------|
| VirtualTrade | status | `WHERE status = 'OPEN'` | Full scan |
| Order | status | `WHERE status = ?` | Full scan |
| Order | strategy_id | `WHERE strategy_id = ?` | Full scan |
| LogEntry | timestamp | `ORDER BY timestamp DESC` | Slow sort |

**Fix:**
```python
class VirtualTrade(SQLModel, table=True):
    status: str = Field(default="OPEN", index=True)  # ADD index=True

class Order(SQLModel, table=True):
    status: str = Field(default="PENDING", index=True)
    strategy_id: Optional[str] = Field(default=None, index=True)
```

---

### 🗄️ QUERY ISSUE #4: Synchronous Sessions in Async Code [MEDIUM]

**Location:** `backend/engine/orchestrator.py:31`, `backend/engine/risk_manager.py:33`

**Problem:** Using `Session(engine)` (sync) in async context blocks the event loop.

**Fix:** Use async sessions:
```python
async with AsyncSession(async_engine) as session:
    result = await session.exec(select(User))
```

---

### 🗄️ QUERY ISSUE #5: Unbounded SELECT for Logs [MEDIUM]

**Location:** `backend/routes/stream.py:71`

**Current:**
```python
logs = session.exec(select(LogEntry).order_by(LogEntry.timestamp.desc()).limit(50)).all()
```

**Problem:** `ORDER BY timestamp DESC` without index on timestamp causes full table sort.

**Fix:** Add index and consider partitioning for log table:
```python
class LogEntry(SQLModel, table=True):
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
```

---

### 🗄️ QUERY ISSUE #6: No Connection Pool Monitoring [MEDIUM]

**Location:** `backend/database.py`

**Problem:** No visibility into connection pool health. Pool exhaustion causes silent failures.

**Fix:**
```python
from sqlalchemy import event

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug(f"Connection checked out. Pool size: {engine.pool.size()}")
```

---

# ROLE 6: Quantitative Trading Domain Expert

*"Wrong delta calculation = wrong hedge = real money loss."*

## Findings

### 📈 TRADING LOGIC ISSUE #1: OBI Strategy Uses Random Numbers [CRITICAL]

**Location:** `backend/engine/strategies/obi_hft.py:35-36`

**Current implementation:**
```python
drift = random.uniform(-0.1, 0.1)
self.current_imbalance = max(0.0, min(1.0, self.current_imbalance + drift))
```

**Correct implementation:** Should use actual order book imbalance from DEPTH events:
```python
def process_tick(self, tick_data: dict):
    obi = tick_data.get('obi')  # Real OBI from fyers_stream.py line 48
    if obi is not None:
        self.current_imbalance = (obi + 1) / 2  # Convert [-1,1] to [0,1]
```

**Financial impact:** Strategy places RANDOM trades. Will lose money consistently due to bid-ask spread.

**Example:** With 25 lots × ₹0.50 spread × 10 trades/day = ₹125/day guaranteed loss

---

### 📈 TRADING LOGIC ISSUE #2: Risk Manager Exception Allows Orders [CRITICAL]

**Location:** `backend/engine/risk_manager.py:62-66`

**Current implementation:**
```python
except Exception as e:
    logger.error(f"Error evaluating risk settings: {e}")
# Falls through to return True - ORDER ALLOWED
```

**Financial impact:** During database outage, ALL orders bypass risk checks:
- Daily loss limit ignored
- Max positions ignored  
- Circuit breaker ignored

**Example:** If daily loss limit is ₹50,000 and strategies keep trading during DB outage, losses could be unlimited.

---

### 📈 TRADING LOGIC ISSUE #3: TTE is Static [HIGH]

**Location:** `backend/engine/strategies/gamma_scalping.py:21`, `delta_hedging.py:23`

**Current implementation:**
```python
self.tte = 14 / 365.0  # Hardcoded 14 days
```

**Correct implementation:**
```python
def get_tte(self, expiry_date: datetime) -> float:
    days_to_expiry = (expiry_date - datetime.now()).days
    return max(0.001, days_to_expiry / 365.0)
```

**Financial impact:** As expiry approaches:
- Delta calculation becomes increasingly wrong
- On expiry day, using 14-day TTE when actual TTE is 0 gives completely wrong delta
- Hedging trades are mis-sized

---

### 📈 TRADING LOGIC ISSUE #4: Volatility Calculation Error [HIGH]

**Location:** `backend/engine/strategies/gamma_scalping.py:57`

**Current implementation:**
```python
sigma = math.sqrt(var) * math.sqrt(94500)  # Arbitrary annualization
```

**Problem:** Factor 94500 assumes specific tick frequency that may not match reality:
- If ticks come every second: annualization = √(252 × 6.5 × 3600) = √5,896,800 ≠ 94500
- If ticks come every 0.1 seconds: annualization would be √58,968,000

**Correct implementation:** Calculate based on actual time intervals:
```python
def calculate_annualized_vol(self, returns, timestamps):
    time_deltas = np.diff(timestamps)
    avg_interval_seconds = np.mean(time_deltas)
    periods_per_year = (365 * 24 * 3600) / avg_interval_seconds
    return np.std(returns) * np.sqrt(periods_per_year)
```

---

### 📈 TRADING LOGIC ISSUE #5: No Position Reconciliation [MEDIUM]

**Location:** Throughout broker adapters

**Current:** Local position state is updated only when orders are placed. Never verified against broker.

**Financial impact:**
- Manual trades not reflected
- Partial fills not handled
- Risk calculations based on wrong positions

**Fix:** Periodic reconciliation:
```python
async def reconcile_positions(self):
    broker_positions = await self.broker.get_net_positions()
    local_positions = await self.get_local_positions()
    
    for symbol, broker_qty in broker_positions.items():
        local_qty = local_positions.get(symbol, 0)
        if broker_qty != local_qty:
            logger.error(f"Position mismatch {symbol}: local={local_qty}, broker={broker_qty}")
            await self.correct_position(symbol, broker_qty)
```

---

### 📈 TRADING LOGIC ISSUE #6: Hardcoded Lot Sizes [MEDIUM]

**Location:** `backend/engine/strategies/gamma_scalping.py:79`, `obi_hft.py:45,56`

**Current:**
```python
quantity=25,  # 1 Nifty Lot
```

**Problem:** NIFTY lot size was 75, then 50, now 25. BANKNIFTY is 15. Lot sizes change.

**Fix:**
```python
LOT_SIZES = {
    "NSE:NIFTY50-INDEX": 25,
    "NSE:BANKNIFTY-INDEX": 15,
}
quantity = LOT_SIZES.get(self.symbol, 25)
```

---

### 📈 TRADING LOGIC ISSUE #7: Paper Trading Doesn't Match Live [MEDIUM]

**Location:** `backend/engine/broker/fyers_broker.py:79-103`

**Current:** Paper trading generates instant fills with no slippage:
```python
if is_paper_trading:
    order_id = f"mock_{uuid.uuid4().hex[:8]}"
    # No slippage, no partial fills, instant execution
```

**Financial impact:** Backtests and paper trading show unrealistic performance.

**Fix:** Add realistic slippage model:
```python
if is_paper_trading:
    slippage_pct = random.uniform(0.01, 0.05)  # 1-5 bps
    fill_price = current_market_price * (1 + slippage_pct if side == "BUY" else 1 - slippage_pct)
    fill_delay = random.uniform(0.05, 0.2)  # 50-200ms
    await asyncio.sleep(fill_delay)
```

---

### 📈 TRADING LOGIC ISSUE #8: Sharpe Ratio Calculation [LOW]

**Location:** `backend/engine/backtester.py:86`

**Current:**
```python
sharpe_ratio = np.mean(pnl_array) / np.std(pnl_array) * np.sqrt(252 * 75)
```

**Problem:** Multiplier 252 × 75 = 18,900 assumes 75 trades per day for 252 days. Should be based on actual trade frequency.

---

# ROLE 7: QA Lead

*"If it's not tested, it doesn't work."*

## Findings

### 🧪 MISSING TEST #1: Risk Manager Edge Cases [CRITICAL]

**Critical path:** Order validation before execution

**Risk if untested:** The exception-allows-order bug could ship to production

**Test cases needed:**
```python
class TestRiskManager:
    def test_rejects_zero_quantity(self):
        rm = RiskManager()
        assert rm.check_order("NIFTY", "BUY", 0) == False
    
    def test_rejects_negative_quantity(self):
        rm = RiskManager()
        assert rm.check_order("NIFTY", "BUY", -10) == False
    
    def test_rejects_over_max_quantity(self):
        rm = RiskManager(max_qty_per_order=100)
        assert rm.check_order("NIFTY", "BUY", 150) == False
    
    def test_circuit_breaker_blocks_orders(self):
        rm = RiskManager()
        rm.update_drawdown(0.06)  # 6% drawdown
        # Should reject when threshold is 5%
        assert rm.check_order("NIFTY", "BUY", 10) == False
    
    def test_database_error_rejects_order(self):
        """CRITICAL: Must return False on any database error"""
        rm = RiskManager()
        with mock.patch('database.Session', side_effect=Exception("DB Error")):
            assert rm.check_order("NIFTY", "BUY", 10) == False  # CURRENTLY FAILS!
```

**Priority:** CRITICAL

---

### 🧪 MISSING TEST #2: Broker Adapter Tests [HIGH]

**Critical path:** Order execution

**Test cases needed:**
```python
class TestFyersBroker:
    def test_order_placement_success(self):
        broker = FyersBroker()
        with mock.patch.object(broker.fyers, 'place_order', return_value={'s': 'ok', 'id': '123'}):
            result = broker.execute_order("TEST", "NIFTY", "BUY", 25)
            assert result == '123'
    
    def test_order_rejected_by_fyers(self):
        broker = FyersBroker()
        with mock.patch.object(broker.fyers, 'place_order', return_value={'s': 'error', 'message': 'Insufficient margin'}):
            result = broker.execute_order("TEST", "NIFTY", "BUY", 25)
            assert result is None
    
    def test_paper_trading_mode(self):
        with mock.patch.dict(os.environ, {'PAPER_TRADING': 'True'}):
            broker = FyersBroker()
            result = broker.execute_order("TEST", "NIFTY", "BUY", 25)
            assert result.startswith('mock_')
    
    def test_api_timeout(self):
        broker = FyersBroker()
        with mock.patch.object(broker.fyers, 'place_order', side_effect=TimeoutError):
            result = broker.execute_order("TEST", "NIFTY", "BUY", 25)
            assert result is None
```

**Priority:** HIGH

---

### 🧪 MISSING TEST #3: Strategy Signal Tests [HIGH]

**Critical path:** Trading logic

**Test cases needed:**
```python
class TestGammaScalpingStrategy:
    def test_ignores_wrong_symbol(self):
        strategy = GammaScalpingStrategy(mock_broker, symbol="NSE:NIFTY50-INDEX")
        strategy.process_tick({'symbol': 'OTHER', 'ltp': 22000})
        mock_broker.execute_order.assert_not_called()
    
    def test_delta_threshold_long(self):
        strategy = GammaScalpingStrategy(mock_broker)
        # Setup state where delta is very negative
        strategy.current_simulated_delta = -0.20
        strategy.process_tick({'symbol': 'NSE:NIFTY50-INDEX', 'ltp': 22000})
        mock_broker.execute_order.assert_called_with(
            strategy_name="GAMMA_SCALPING",
            symbol="NSE:NIFTY50-INDEX-FUT",
            side="BUY",
            quantity=25,
            current_market_price=22000
        )
    
    def test_delta_calculation_accuracy(self):
        """Verify Black-Scholes delta within 1% of reference"""
        # Use known inputs with verified output
        pass
```

**Priority:** HIGH

---

### 🧪 MISSING TEST #4: WebSocket Integration Tests [HIGH]

**Critical path:** Real-time data delivery

**Test cases needed:**
```python
class TestWebSocket:
    async def test_connection_accepted(self):
        async with websockets.connect(f"{WS_URL}/stream/ws/dashboard") as ws:
            # Should connect without error
            assert ws.open
    
    async def test_receives_portfolio_update(self):
        async with websockets.connect(f"{WS_URL}/stream/ws/dashboard") as ws:
            data = await asyncio.wait_for(ws.recv(), timeout=5)
            decoded = msgpack.unpackb(data)
            assert decoded['type'] == 'PORTFOLIO_UPDATE'
    
    async def test_reconnection_after_disconnect(self):
        # Verify client can reconnect after server restart
        pass
```

---

### 🧪 MISSING TEST #5: API Endpoint Tests [MEDIUM]

**Test cases needed:**
```python
class TestBrokerEndpoints:
    def test_list_brokers_returns_array(self):
        response = client.get("/api/v1/brokers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_credentials_masked_in_response(self):
        response = client.get("/api/v1/brokers")
        for broker in response.json():
            # Full API keys should never be returned
            assert '••••' in broker.get('apiKey', '')
```

---

### 🧪 MISSING TEST #6: Load Tests [MEDIUM]

**Test scenarios needed:**
```python
# locustfile.py
class TradingUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(10)
    def get_dashboard(self):
        self.client.get("/api/v1/dashboard/totals")
    
    @task(5)
    def get_positions(self):
        self.client.get("/api/v1/positions")
    
    @task(1)
    def place_order(self):
        self.client.post("/api/v1/orders", json={...})

# Targets:
# - 100 concurrent users
# - p95 latency < 200ms for reads
# - p95 latency < 500ms for order placement
# - 0% error rate
```

---

# CONSOLIDATED PRIORITY LIST

## Fix Immediately (Before Any Trading)

| # | Issue | Location | Role |
|---|-------|----------|------|
| 1 | Hardcoded JWT secret "supersecret" | auth.py:12 | Security |
| 2 | No authentication on API endpoints | All routes | Security |
| 3 | Risk manager allows orders on exception | risk_manager.py:62-66 | Security/Quant |
| 4 | Broker credentials in plain text | models.py:25-29 | Security |
| 5 | OBI strategy uses random numbers | obi_hft.py:35-36 | Quant |
| 6 | Sequential strategy processing | orchestrator.py:82-83 | HFT |
| 7 | Event queue overflow blocks WebSocket | fyers_stream.py:59 | Distributed |

## Fix Within 1 Week

| # | Issue | Location | Role |
|---|-------|----------|------|
| 8 | Memory allocation per tick (pd.concat) | indicators.py:32 | HFT |
| 9 | Database queries in hot path | risk_manager.py:33-60 | HFT/DB |
| 10 | No WebSocket authentication | stream.py:141 | Security |
| 11 | Duplicate N+1 query | risk_manager.py:45,54 | DB |
| 12 | Missing database indexes | models.py | DB |
| 13 | No rate limiting | All routes | Security |
| 14 | TTE is static (14 days hardcoded) | gamma_scalping.py:21 | Quant |
| 15 | No WebSocket in frontend | Missing | Integration |
| 16 | Redis unavailable crashes system | orchestrator.py:86-92 | Distributed |

## Recommended Test Coverage

| Area | Priority | Estimated Tests |
|------|----------|-----------------|
| Risk Manager | CRITICAL | 10 tests |
| Broker Adapters | HIGH | 15 tests |
| Strategies | HIGH | 20 tests |
| WebSocket | HIGH | 8 tests |
| API Endpoints | MEDIUM | 30 tests |
| Load Tests | MEDIUM | 5 scenarios |

---

## Engineering Effort Estimate

| Priority | Issue Count | Estimated Days |
|----------|-------------|----------------|
| CRITICAL | 10 | 5-7 days |
| HIGH | 19 | 10-14 days |
| MEDIUM | 17 | 8-12 days |
| LOW | 3 | 1-2 days |
| **TOTAL** | **49** | **24-35 days** |

---

*Report generated by multi-expert analysis system*
