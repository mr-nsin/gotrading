# Phase 2: Python Performance & GIL Analysis

## 2a. Event-Loop Blocking Audit

### The Faux-Concurrency Trap
In `backend/engine/orchestrator.py:85`:
```python
await asyncio.gather(*[
    asyncio.to_thread(strategy.process_tick, tick_data)
    for strategy in self.active_strategies
], return_exceptions=True)
```
This is a classic trap in Python trading systems. `asyncio.to_thread` runs `process_tick` in the `ThreadPoolExecutor`. However, if `process_tick` contains CPU-bound code (e.g. calculating indicators, evaluating Black-Scholes Greeks for options), **the Global Interpreter Lock (GIL) prevents these threads from running in parallel.** 
Instead of true parallelism, you get context-switching overhead, and a CPU-bound thread can easily starve the event loop that is trying to ingest the WebSocket feed.

### Blocking Synchronous Database Calls
In `backend/engine/risk_manager.py:47`:
```python
with Session(engine) as session:
    settings = session.get(RiskSettings, 1)
```
Even though this is run inside the threadpool (via `process_tick`), the `Session` (SQLAlchemy/SQLModel) is entirely synchronous. Connection acquisition, query execution, and object materialization all block the thread. Under burst tick load, the threadpool can become exhausted with threads waiting on PostgreSQL, leading to massive latency spikes.

*Fix:* Move `RiskManager` to use `AsyncSession` with `await session.get()`.

### Synchronous SDKs
The broker SDKs (`kiteconnect`, `smartapi-python`, `dhanhq`) are synchronous `requests`-based libraries. When `place_order()` is called from the strategy, it blocks the thread for 20-50ms doing TLS handshakes and HTTP round trips.

## 2b. GIL Contention Analysis

For this specific codebase (Multi-leg Options Trading):
- **I/O Bound:** Ingesting WebSocket ticks, sending orders, saving to DB.
- **CPU Bound:** Options Greeks calculations, implied volatility solving, indicator matrix updates.

When 4 strategies run concurrently on a tick update, they serialize on the GIL for the CPU-bound portion. 
**Recommendations for Concurrency Model:**
1. **asyncio single-process:** Best for OMS, API, and I/O routing.
2. **Process-per-strategy (multiprocessing):** Overkill and too slow for IPC (serialization of tick data across processes takes >1ms per tick in Python).
3. **PEP 703 (Free-threaded 3.13):** Promising, but broker SDKs and data-science libs aren't fully ready yet.
4. **Rust Offload (Best Option):** The actual math (Black-Scholes, TA-lib replacements) should be compiled to a Rust PyO3 extension that explicitly releases the GIL (`Python::allow_threads`). This allows the actual compute to run on multiple cores simultaneously while Python handles the routing.

## 2c. General Python / FastAPI Hot-Path Optimization

1. **Indicator Updates (Incremental vs Recompute):**
   `progress.md` notes that `pd.concat` was replaced with an "O(1) ring buffer", which is excellent. Ensure that moving averages and other indicators are updated incrementally (`new_ema = alpha * new_val + (1 - alpha) * old_ema`) rather than re-calculating the entire array on every tick.
   
2. **Object Allocation Churn:**
   Ticks come in as `dict` (e.g., `event.get("data", {})`). Dict key lookups and object allocations inside the hot loop add overhead. 
   *Fix:* Parse incoming ticks into `__slots__` classes or namedtuples immediately upon receipt.

3. **Risk Cache Optimization:**
   The `RiskManager` caches DB values for 100ms. While this reduces DB load, checking `time.time()` and performing dictionary lookups still has overhead. A faster approach is to have an async background task independently update the `RiskManager` state every 100ms, and have the `check_order` method simply read the pre-computed properties without checking time or triggering DB calls itself.
