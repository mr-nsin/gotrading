# Phase 5: Data Layer & Infrastructure

## Storage Engine Fit
- **Current Database:** PostgreSQL via Supabase (and `asyncpg` driver in `backend/database.py`).
- **Suitability:** PostgreSQL is excellent for transactional state (`User`, `BrokerCredential`, `Order` lifecycle, `RiskSettings`). However, it is **terrible** for high-frequency tick data storage. If you are saving every BankNifty tick to Postgres, the table bloat and index maintenance will grind the DB to a halt.
- **Recommendation for Ticks:** Do not store raw tick data in Postgres. Use ClickHouse, TimescaleDB, or write directly to Parquet/DuckDB for backtesting history. Keep Postgres strictly for OM/OMS (Order Management).

## Schema & Write Path
- **Order Table Indexing:** `progress.md` indicates indexes were added to `status`, `strategy_id`. Ensure `user_id` and `timestamp` are also heavily indexed, as most queries will be `WHERE user_id = X ORDER BY timestamp DESC`.
- **Write Batching:** Rather than executing an `INSERT` statement for every single `LogEntry` or metric, implement a memory buffer that flushes to Postgres in batches (e.g. every 1 second or 100 records) using `executemany` / `COPY`.

## Observability & Telemetry
In a trading system, logging to `stdout` is not enough. You need:
- **Tick-to-Trade Latency Metrics:** Histogram of exactly how long it takes from WebSocket ingest to Broker API dispatch.
- **Stale Data Alerting:** If the Fyers/Zerodha WebSocket stops emitting ticks for > 5 seconds during market hours, the system MUST halt and alert. 
- **Prometheus/Grafana:** Expose a `/metrics` endpoint in FastAPI tracking `orders_placed_total`, `orders_rejected_total`, `active_websockets`, and `p99_latency_ms`.

## Deployment & Safety
- **Network Proximity:** AWS EKS `ap-south-1` (Mumbai) is critical to minimize latency to Indian broker APIs (Zerodha/Upstox servers are in Mumbai).
- **Graceful Shutdown:** When the EKS pod is scaled down or restarted, there must be a `SIGTERM` handler in FastAPI that cleanly disconnects the Broker WebSockets and decides whether to cancel pending open orders or leave them (Policy must be explicitly defined).
- **Static IP Whitelisting:** Retail broker APIs require static IP whitelisting. The EKS cluster must route outbound broker traffic through an AWS NAT Gateway with a fixed Elastic IP.
