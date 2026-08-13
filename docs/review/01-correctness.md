# Phase 1: Correctness & Money-Losing Bug Audit

## Severity-Ranked Issues Table

| ID | Severity | Category | File:Line | Finding | Impact | Fix | Effort | Confidence |
|---|---|---|---|---|---|---|---|---|
| C-01 | **P0** | Money Correctness | `backend/models.py:111`, `models.py:42` | Uses IEEE-754 `float` for prices, P&L, funds, margin, etc. (e.g., `VirtualTrade.entry_price`, `BrokerCredential.funds`). | Accumulation rounding errors. `0.1 + 0.2 != 0.3`. Severe risk for options trading where tick sizes are 0.05. | Migrate schema & code to `Numeric(precision, scale)` and Python `Decimal` or scaled integers (e.g., paise). | L | 100% |
| C-02 | **P0** | Concurrency / State | `backend/engine/risk_manager.py:34-68` | `_cache` mutation is not thread-safe. `process_tick` runs concurrently via `asyncio.to_thread` (`orchestrator.py:86`). Multiple threads can hit `_refresh_cache_if_needed()` simultaneously, causing duplicate DB queries or corrupting the `_cache` dict. | Race condition in risk checks; possible crash or incorrect risk evaluation during burst ticks. | Add `threading.Lock()` around cache mutation logic in `_refresh_cache_if_needed`. | S | 100% |
| C-03 | **P1** | Concurrency | `backend/engine/orchestrator.py:85-88` | `asyncio.gather` with `asyncio.to_thread` for all active strategies. If one strategy crashes, `return_exceptions=True` catches it, but the exception is SILENTLY ignored. | Silent death of strategy logic; ticks stop being processed, no alerts generated. | Add explicit iteration over results to log exceptions and alert. | S | 100% |
| C-04 | **P1** | Failure Handling | `backend/engine/risk_manager.py:135-139` | Bare `except Exception as e:` catches all DB errors and returns `False` (rejecting order). This is a safe fail, but it blocks *all* trading if the DB disconnects or the query times out. | Total platform trading halt on transient DB blips. | Add a local memory fallback, circuit breaker, or retry logic for DB queries. | M | 100% |
| C-05 | **P1** | Blocking I/O | `backend/engine/risk_manager.py:47` | Synchronous `Session(engine)` is used instead of the new async engine. This blocks the threadpool thread for 4-20ms per refresh. | Limits concurrent strategy evaluation throughput and increases tick-to-trade latency. | Refactor `risk_manager.py` to use `AsyncSession` and `await`. | M | 100% |

## Detailed Audit

### Money & Numeric Correctness
- **Floating Point Arithmetic:** The entire `models.py` uses `float` for critical financial data (`entry_price`, `exit_price`, `pnl`, `funds`, `margin_used`). *Status: Not handled.*
- **Tick-Size Rounding:** No explicit evidence of global tick size rounding before order placement in `risk_manager.py` or `orchestrator.py`. *Status: Not handled.*

### Order Lifecycle
- **Idempotency:** No UUID client order IDs (`broker_order_id` is stored, but it comes *from* the broker). If a network timeout occurs during `broker.place_order`, the system doesn't know if the order executed. *Status: Not handled.*
- **Orphan Orders:** The system lacks a reconciliation process on startup to check actual broker states against the database's `Order` table. *Status: Not handled.*

### Time Correctness
- **Timezones:** `models.py` uses `datetime.utcnow` globally (e.g., `models.py:16`). While UTC is safe for storage, Indian markets operate in IST. Backtests and session boundaries (e.g. `RiskSettings.block_entries_after = "14:45"`) must strictly handle IST localized conversions. *Status: Partially handled.*

### Failure Handling
- **Swallowed Exceptions:** `orchestrator.py:99` swallows Redis publish failures. While non-fatal to trading, the frontend dashboard will silently freeze.
- **Fail Safe Risk Engine:** `risk_manager.py` correctly fails closed (rejects orders) on any exception, preventing runaway strategies if the DB goes down. *Status: Handled.*

### Risk & Safety Controls
- **Max Daily Loss / Max Drawdown:** Implemented globally in `RiskSettings` and evaluated via `unrealized_pnl` + `realized_pnl` across the portfolio. *Status: Handled.*
- **Circuit Breaker:** Implemented in `RiskSettings` and evaluated. *Status: Handled.*
- **Global Kill Switch:** `auto_kill_switch` exists in `RiskSettings`, but the implementation to trigger a rapid "flatten all positions" is missing from the critical path trace. *Status: Partially handled.*
