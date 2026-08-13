# Phase 6: Testing & Verification Gaps

## Missing Coverage
Based on the codebase analysis, the following critical test scenarios are missing or incomplete:

### 1. Property-Based Testing
- **Invariant:** `Total Capital == Available Margin + Margin Used`.
- **Invariant:** `P&L` path independence (a round trip trade of 100 shares buying at 100, selling 50 at 105 and 50 at 95 must exactly equal zero minus brokerage).
- *Action:* Implement `hypothesis` to generate random tick streams and fuzz the `VirtualTrade` and `RiskManager` state.

### 2. Deterministic Replay Harness
- There is no evidence of a deterministic replay engine. A true algo system must be able to record a day's WebSocket stream to a `.dat` file, replay it through the exact same strategy logic, and get the exact same trade decisions.
- *Action:* Build a `ReplayBroker` that reads from disk and feeds `orchestrator.py`, completely bypassing network I/O.

### 3. Mock/Simulated Broker Edge Cases
The system lacks tests for when the broker behaves badly:
- Broker sends an ACK for order ID 12345, but then never sends a fill.
- Broker sends a partial fill (e.g., 50/100 shares), then the rest is cancelled.
- Broker WebSocket disconnects mid-trade.
- *Action:* The `VirtualBroker` must be enhanced to randomly inject these faults during CI testing.

### 4. Chaos Tests & Recovery
- What happens if the `FastAPI` process is `kill -9`'d immediately after calling `broker.place_order` but before the DB saves the state?
- *Action:* The startup sequence must pull the authoritative open orders and positions from the broker API and reconcile them with the local PostgreSQL database, alerting on any mismatches.
