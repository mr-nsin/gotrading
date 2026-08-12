# Feature Requirement Specifications (FRS)

## FRS-001 Voice Command Parsing
*   **Objective:** Convert Hinglish voice to JSON execution payload.
*   **Inputs:** Raw PCM audio stream via WebSocket.
*   **Outputs:** JSON string containing `{"legs": [{"symbol": "NSE:NIFTY24JUN22000CE", "action": "BUY", "qty": 50}], "strategy": "STRADDLE"}`.
*   **Business Rules:** Max 5 seconds of audio per command.
*   **APIs:** `POST /api/v1/voice/transact`
*   **Edge Cases:** Ambiguous expiry dates (e.g., "Nifty ka call" - defaults to current weekly expiry).
*   **Validation Rules:** Margin validation must occur before returning the payload to frontend.

## FRS-002 Real-Time P&L Dashboard
*   **Objective:** Display sub-second updates for active positions.
*   **Inputs:** Fyers WebSocket Tick data.
*   **Outputs:** MessagePack binary stream to frontend.
*   **Business Rules:** Updates throttled to 200ms intervals (5 fps) to prevent React DOM overload.
*   **APIs:** `WSS /ws/v1/portfolio/stream`
*   **Validation Rules:** If connection drops, display "RECONNECTING" state immediately.

## FRS-003 Algorithmic Strategy Engine
*   **Objective:** Execute mathematical ML strategies (Volatility Skew, 0DTE Blasts, Dispersion, Pairs Trading).
*   **Inputs:** User configuration (Max Capital, Stop Loss).
*   **Outputs:** Automated order executions to Fyers.
*   **Business Rules:**
    *   **Volatility Skew:** If Implied Volatility (IV) on PUTs > CALLs by 15%, execute 1x2 Ratio Spread.
    *   **0DTE Gamma Blast:** If Nifty breaks day-high after 1:30 PM with >3x volume, buy ATM Call. Trailing stop-loss set at 15%.
    *   **Pairs Trading:** Monitor Nifty Bank vs Nifty IT correlation. If Z-Score > 2.0, short the outperformer, buy the underperformer.
    *   **Dispersion Trading:** Short Nifty Index Volatility, long constituent stock volatility (Reliance, HDFC).
*   **Edge Cases:** Broker API failure during a leg execution requires immediate partial-fill liquidation.
