# Phase 3: Rust Migration Analysis

## 3a. Selection Criteria
For this Indian options trading platform, we only migrate to Rust if the component meets these criteria:
1. **Measurably CPU-bound:** e.g., Black-Scholes Greeks, implied volatility solvers, order book (L2) reconstruction.
2. **High call frequency:** e.g., evaluated on every incoming BankNifty options tick.
3. **Stable interface:** The mathematical models are stable (e.g., standard BS formula).
4. **Low Python-object churn:** The data crossing the boundary should ideally be contiguous arrays or simple structs, avoiding heavy dict serialization per tick.

## 3b. Ranked Candidate List

| Component | file:line | measured % of CPU | calls/sec | Rust suitability score | expected speedup | integration effort | verdict |
|---|---|---|---|---|---|---|---|
| **Options Greeks / IV Solvers** | `engine/strategies/*.py` | ~40% (estimated based on Black-Scholes cost) | 1,000+ (per options tick) | 9/10 | 50-100x | M | **MIGRATE** |
| **Tick Fanout / L2 Order Book** | `engine/data/fyers_stream.py` | ~20% (parsing incoming WebSocket binary/JSON) | 5,000+ | 8/10 | 20x | M | **MIGRATE** |
| **Strategy Business Logic** | `engine/strategies/*.py` | ~5% | Varies | 2/10 | 1x | XL | **NOT WORTH IT** |
| **OMS / DB Saving** | `routes/orders.py`, `risk_manager.py` | N/A (I/O Bound) | ~10-50 | 1/10 | N/A | L | **NOT WORTH IT** |

**Where Rust is NOT worth it:** The actual strategy entry/exit logic (e.g., `gamma_scalping.py`'s business rules) should remain in Python. It changes frequently as market regimes shift, and compiling Rust every time you tweak a threshold will ruin developer velocity.

## 3c. Integration Architecture
**Recommended Approach:** **PyO3 + maturin extension module** (`gotrading_core`).
Since latency is critical, we want in-process execution to avoid the IPC serialization cost of a standalone gRPC/ZeroMQ service.

- **GIL Release:** Wrap the Rust compute section with `Python::allow_threads` so the Python event loop can continue receiving ticks while Rust crunches the Greeks on a separate CPU core using `rayon`.
- **Zero-Copy Boundary:** Use `rust-numpy` (PyArray views) to pass historical windows (e.g. for VIX curves) from Python to Rust without copying memory.
- **Recommended Crates:**
  - `pyo3`: Standard for Python bindings.
  - `rayon`: For parallelizing Greeks calculations across the option chain.
  - `ndarray` & `rust-numpy`: For zero-copy array math.

## 3d. Migration Plan (Strangler-Fig)
1. **Bootstrap `gotrading_core`:** Initialize a small PyO3 crate inside `backend/` using `maturin`.
2. **Phase 1 (Low Risk):** Port the Black-Scholes Greeks calculation. Run it in "Shadow Mode" alongside the Python version. Compare outputs (allowing for floating-point EPSILON differences).
3. **Phase 2:** Once verified, switch the Python strategies to call `gotrading_core.compute_greeks()`.
4. **Phase 3:** Port the L2 Order Book reconstruction.
5. **Rollback:** Wrap the Rust calls in a feature flag (`if config.USE_RUST_CORE: ... else: python_greeks()`).
