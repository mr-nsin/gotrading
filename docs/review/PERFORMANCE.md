# PERFORMANCE.md

## Hot Path Event-Loop Blocking Audit
- **`backend/engine/orchestrator.py:86`**: `asyncio.to_thread` hides CPU-bound strategy computation (e.g., Greeks, indicators) from the asyncio loop, but it hits the Global Interpreter Lock (GIL). True parallelism is not achieved.
- **`backend/engine/risk_manager.py:47`**: Synchronous `Session(engine)` is used for cache refresh. Blocks threadpool for 4-20ms per refresh.
- **Broker SDKs**: `smartapi-python`, `dhanhq`, `kiteconnect` use synchronous `requests` under the hood. Firing an order blocks the thread for the duration of the HTTP round-trip (20-100ms depending on API and AWS proximity).

## GIL Analysis
**Context:** Multi-leg Options Trading Platform
- **Contention:** High during volatile market ticks when multiple strategies (e.g. `DeltaHedgingStrategy`, `GammaScalpingStrategy`) attempt to process ticks simultaneously.
- **Recommendation:** `asyncio` is perfect for the OMS layer, but the math-heavy components (Black-Scholes, TA-lib replacements) must be written in Rust to bypass the GIL.

## Optimization Ranked List
| Optimization | Expected Gain | Effort |
|---|---|---|
| Switch RiskManager to `AsyncSession` | Removes 5-20ms latency spike per cache miss | Low |
| Extract Risk Caching to Background Task | Removes 1-2ms overhead from the critical path | Low |
| Move Black-Scholes Greeks to PyO3 (Rust) | 50-100x speedup on CPU-bound math, unblocks GIL | Med |
| Use `orjson` instead of standard `json` | 2-3x speedup on JSON serialization for API responses | Low |
| Throttle/Coalesce Frontend WebSockets | Prevents UI freezing under burst load (500 ticks/sec) | Med |
