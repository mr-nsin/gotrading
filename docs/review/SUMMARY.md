# SUMMARY.md

## Overview
The architecture is well-structured for a modern trading platform, utilizing FastAPI, Next.js, and a solid routing layer. However, the system currently treats algorithmic trading as a standard web application, inheriting several classic pitfalls related to Python concurrency, floating-point math, and I/O blocking.

### The 5 Things That Will Hurt You Most
1. **Floating Point Money:** Using `float` for `entry_price`, `pnl`, and `funds`. This will inevitably lead to rounding errors, especially in options where tick sizes are exactly 0.05. It makes precise reconciliation with broker ledgers impossible over time.
2. **Silent Strategy Death:** The orchestrator's `asyncio.gather` swallows exceptions (`return_exceptions=True`). If a strategy encounters a divide-by-zero or `KeyError`, it dies silently, and you will stop trading without knowing why.
3. **Thread-Unsafe Risk Cache:** The `RiskManager` relies on a local `_cache` dict updated from concurrent threads (`asyncio.to_thread`). This is a race condition waiting to corrupt your risk limits under burst market data loads.
4. **Synchronous DB Blocking:** The risk manager makes synchronous `Session(engine)` DB calls inside the threadpool. This will exhaust your threadpool and cause massive latency spikes on the critical path.
5. **No Startup Reconciliation:** If the app crashes and restarts, it assumes the DB is truth. It MUST pull open orders and positions directly from the broker API to detect "orphan orders" placed just before the crash.

### The Highest-ROI Performance Wins
1. **Async Database Driver in Risk Manager:** Switch to `AsyncSession`. (ROI: Massive reduction in tick-to-order latency).
2. **Move Risk Caching to Background Task:** Have a background asyncio task update the `RiskManager` state every 100ms, and make the `check_order` method purely memory-based and lock-free (or properly locked).
3. **Rust Greeks Offload:** Move Black-Scholes and TA calculations to a PyO3 Rust extension.

### The Single Most Valuable Rust Migration
**The Options Greeks & IV Solver.** 
Calculating Greeks for a full option chain on every Nifty tick is extremely CPU intensive. Python's GIL prevents `asyncio.to_thread` from providing actual parallel speedups here. A Rust extension that releases the GIL will allow true multi-core processing of the options chain while the Python event loop continues receiving WebSockets unhindered.

### 30/60/90-Day Plan
- **30 Days (Correctness):** Migrate floats to `Decimal`/integers, fix the RiskManager concurrency lock, implement `AsyncSession` for risk checks, and add startup broker reconciliation.
- **60 Days (Performance):** Implement the `gotrading_core` Rust module for Greeks. Migrate frontend LTP/P&L from polling to WebSockets + Zustand.
- **90 Days (Scale & Advanced):** Implement deterministic replay testing harness and TCA (Transaction Cost Analysis) to track slippage.
