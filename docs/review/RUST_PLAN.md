# RUST_PLAN.md

## 1. Ranked Migration Candidates
1. **Options Greeks & Implied Volatility Solver:** (Highest ROI) - Black-Scholes math is extremely CPU heavy and called frequently.
2. **Tick Normalization & Order Book (L2) Maintenance:** (High ROI) - Parsing rapid-fire WebSocket binary/JSON strings and keeping a sorted order book.
3. **NOT WORTH IT:** Strategy Business Logic (e.g., specific entry/exit rules) - Requires rapid iteration and flexibility. Keep in Python.
4. **NOT WORTH IT:** Order Management System / DB Writes - I/O bound. Keep in Python.

## 2. Integration Design
- **Tooling:** Use `PyO3` + `maturin` to build a native Python extension wheel (`gotrading_core`).
- **GIL Management:** Use `Python::allow_threads` in Rust to release the Python GIL during heavy computation, allowing Python to ingest ticks while Rust computes.
- **Data Boundary:** Pass arrays via `rust-numpy` to avoid serialization/copying overhead.

## 3. Parity & Benchmark Strategy
- **Shadow Mode:** Run the Rust Greeks solver alongside the existing Python solver in production for 1 week. Log any discrepancies > 0.0001 (Float Epsilon).
- **Benchmarking:** Use `pytest-benchmark` on the Python side and `criterion` on the Rust side to objectively measure the tick-to-tick improvement.

## 4. Phased Rollout
- **Phase 1:** Scaffold the `gotrading_core` Rust project.
- **Phase 2:** Implement the Black-Scholes pricing model and Greeks.
- **Phase 3:** Write Python-side property tests (`hypothesis`) asserting parity.
- **Phase 4:** Swap the Python calls in `engine/strategies/` to call the new Rust extension.
