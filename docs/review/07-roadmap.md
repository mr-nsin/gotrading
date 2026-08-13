# Phase 7: Missing Features / Roadmap

## Now (Next 30 Days: Safety & Correctness)
1. **Decimal Migration:** Replace all floating-point money calculations with `Decimal` or integer paise. (Impact: Eliminates rounding leakages. Effort: Low).
2. **Startup Reconciliation:** Pull live broker positions and open orders on startup and cross-check against the DB. (Impact: Prevents orphan orders after a crash. Effort: Medium).
3. **Thread-Safe Risk Cache:** Add `threading.Lock` to `RiskManager._cache` mutation. (Impact: Fixes potential race condition crash. Effort: Low).
4. **WebSocket Stale Data Watchdog:** Implement a heartbeat timer that halts trading if no ticks arrive for 5 seconds. (Impact: Prevents trading on stale prices. Effort: Low).

## Next (30-60 Days: Architecture & Scale)
1. **Rust Extension for Greeks:** Implement `gotrading_core` using PyO3 to move Black-Scholes and TA calculations off the GIL. (Impact: Allows true parallel processing of multiple strategies. Effort: Medium).
2. **Next.js WebSocket Integration:** Move LTP and P&L streams from React Query polling to targeted WebSocket/Zustand subscriptions. (Impact: Solves UI freezing and backend polling overload. Effort: Medium).
3. **Async Database Refactor:** Ensure all hot-path DB queries use `AsyncSession` to prevent threadpool starvation. (Impact: Massive latency reduction. Effort: Medium).

## Later (60-90 Days: Advanced Execution)
1. **Smart Execution Algos:** Implement TWAP/VWAP and Iceberg slicing for large options quantities instead of hitting the market with a single massive limit/market order.
2. **Transaction Cost Analysis (TCA):** Track slippage (Expected Price at signal vs Actual Fill Price) and plot it over time to identify hidden losses.
3. **Deterministic Replay Backtester:** Record live tick streams and build a byte-for-byte deterministic replay engine for true backtest parity.
