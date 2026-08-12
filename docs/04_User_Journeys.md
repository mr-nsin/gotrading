# User Journey Document

## 1. Onboarding & Broker Linking Journey
*   **Signup:** User lands on homepage -> Clicks "Start Trading" -> Signs up via Google/Email.
*   **Link Broker:** User redirected to Fyers OAuth page -> Logs into Fyers -> Authorizes 3Option -> Redirected back to 3Option dashboard.
*   **Initialization:** Backend exchanges auth code for Access Token -> Backend fetches User Profile, Margin Available, and Active Positions from Fyers -> Frontend populates dashboard.

## 2. Voice Execution Journey (Manual Hedging)
*   **Intent:** User wants to deploy an Iron Condor.
*   **Action:** User holds the "Microphone" button and says: *"Nifty ka 24000 call aur put becho, aur 24500 call aur 23500 put kharido."*
*   **Processing:**
    *   Frontend streams PCM audio to FastAPI.
    *   FastAPI proxies to Sarvam AI STT.
    *   FastAPI sends Hindi text to LLM.
    *   LLM returns strict JSON Basket Order.
*   **Confirmation:** Frontend displays the 4 legs, required margin (₹1.5 Lakhs), and estimated max profit/loss.
*   **Execution:** User clicks "Confirm" (or says "Execute"). Backend fires the 4 legs simultaneously to Fyers API. Frontend updates P&L grid.

## 3. Automated Strategy Deployment Journey (0DTE Gamma Blast)
*   **Intent:** User wants the ML model to trade the afternoon expiry breakout.
*   **Action:** User navigates to "Algorithmic Strategies" tab -> Selects "0DTE Gamma Blast" -> Clicks "Deploy."
*   **Configuration:** User sets Max Capital Allocation (e.g., ₹50,000) and Max Drawdown limit.
*   **Monitoring:** The strategy state changes to `SCANNING_ORDERBOOK`. The UI displays a live chart of the Nifty with the LSTM prediction probability.
*   **Execution:** At 2:00 PM, a volume spike occurs. The LSTM predicts a 90% continuation. The backend automatically buys ATM Calls. The UI state changes to `IN_POSITION`.
*   **Exit:** The trailing stop-loss is hit. The backend sells the position. The UI state changes to `CLOSED`, displaying the net profit.

## 4. Admin Journey (System Monitoring)
*   **Login:** Admin authenticates via internal portal.
*   **Dashboard:** Views real-time metrics: Active WebSockets, Fyers API rate limit status (e.g., 80/100 requests per second), ML model server latency.
*   **Audit Check:** Admin searches a specific Order ID to playback the raw audio file and verify the NLP translation for SEBI compliance.
