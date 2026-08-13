# Phase 4: Next.js Frontend Review

## Transport & Real-time Updates
- **Current State:** Using Next.js 14, React Query, and Shadcn UI.
- **Polling vs WebSockets:** The system likely uses polling via React Query (`useQuery(..., { refetchInterval })`) for Dashboard and Portfolio. For an HFT/Intraday system, polling is insufficient and floods the backend. 
- **Recommendation:** Switch strictly to WebSockets or Server-Sent Events (SSE) for market data (`LTP`) and real-time MTM P&L. 
- **Backpressure:** If the UI receives 500 ticks/sec, the browser will freeze. The backend must throttle emitting updates to the frontend (e.g. max 10 updates per second per symbol), or the frontend must coalesce updates before reacting.

## Re-render Storms
In trading UIs, streaming LTP (Last Traded Price) directly into a global React context or a top-level component (like a Redux store or React Context Provider) causes the entire DOM tree to re-render 10 times a second.
- **Fix:** Use an external store like Zustand or Jotai with targeted `useStore(state => state.niftyLTP)` selector subscriptions. This ensures *only* the specific cell in the DataTable re-renders when the tick changes, preserving 60fps performance.

## Charting Constraints
Standard DOM/SVG charting libraries (like Recharts) will choke on high-density intraday tick data.
- **Recommendation:** Use `lightweight-charts` by TradingView (Canvas based) or `uPlot`. They are bundle-light and can handle 100,000+ data points smoothly at 60fps.

## App Router Usage
- **Stale Cache Danger:** Next.js App Router aggressively caches `fetch()` requests by default. If the frontend fetches the current open positions or risk settings and Next.js serves a cached version, it could lead to disastrous UI decisions.
- **Fix:** Audit all `fetch` calls relating to live trade data and ensure `cache: 'no-store'` or `revalidate: 0` is strictly enforced.

## UI as a Control Surface
- **Optimistic UI Risk:** NEVER use optimistic UI for order placement. If a user clicks "Sell Straddle", show a loading spinner until the explicit WebSocket/HTTP ACK is received from the broker. An optimistic UI might trick the user into thinking an order went through when it was actually rejected by the Risk Manager.
- **Kill Switch:** The UI needs a highly visible, instantly accessible "FLATTEN ALL / PANIC" button in the persistent header that completely bypasses any confirmation dialogs (or requires a quick swipe-to-confirm).
