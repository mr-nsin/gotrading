# Active Context

## Current Focus
- Completed Phase 3B Fully Async Database Engine (`asyncpg`) Architecture:
  1. Configured `create_async_engine` in [`backend/database.py`](file:///Users/nitinsinghal/Documents/project/india-trading/backend/database.py) with `postgresql+asyncpg://` protocol support, `pool_size=20`, `max_overflow=10`, and `pool_pre_ping=True`.
  2. Implemented `get_async_session` dependency for async request handling with graceful driver fallback.
- Verified active backend (`http://127.0.0.1:8000`) and frontend (`http://localhost:3000`).
- Implemented expandable position row accordion on `/positions` table.
- Added live real-time MTM P&L calculation and percentage streaming (e.g. `+₹1,886.00 (+0.36%)`).
- Fixed position accumulation weighted average entry price calculation across multiple BUY orders.
- Database column auto-migration for `virtualtrade.ltp` and `virtualtrade.pnl_pct` in Supabase PostgreSQL (`backend/database.py`).

## Recent Changes
1. **Expandable Order Breakdown Accordion (`frontend/src/app/positions/page.tsx`):**
   - Added chevron toggle buttons next to instrument symbol.
   - Expanding a position opens an inline nested table showing all 49 associated executed orders (Order ID, Timestamp in IST, Side, Quantity, Price, Product, Status).
2. **Real-time LTP & MTM P&L % Streaming (`backend/main.py` & `backend/routes/positions.py`):**
   - Live tick background loop updates `ltp`, `pnl`, and `pnl_pct` for active open trades.
3. **Database Schema Auto-Migration (`backend/database.py`):**
   - Automatically executes `ALTER TABLE virtualtrade ADD COLUMN ltp DOUBLE PRECISION` and `ALTER TABLE virtualtrade ADD COLUMN pnl_pct DOUBLE PRECISION`.
