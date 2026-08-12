# API Specification Document

## REST API (FastAPI)

### `POST /api/v1/auth/fyers/link`
*   **Description:** Completes the OAuth flow with Fyers.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:**
    ```json
    { "auth_code": "fyers_auth_code_xyz" }
    ```
*   **Response (200 OK):**
    ```json
    { "status": "linked", "expiry": "2024-06-25T15:30:00Z" }
    ```

### `POST /api/v1/voice/transact`
*   **Description:** Accepts a base64 encoded PCM audio blob or form-data audio file, parses it via Sarvam AI, and returns the pre-trade JSON.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** (multipart/form-data) `audio_file: blob`
*   **Response (200 OK):**
    ```json
    {
      "strategy": "IRON_CONDOR",
      "legs": [
        {"symbol": "NSE:NIFTY...", "qty": 50, "side": "SELL"},
        {"symbol": "NSE:NIFTY...", "qty": 50, "side": "SELL"},
        {"symbol": "NSE:NIFTY...", "qty": 50, "side": "BUY"},
        {"symbol": "NSE:NIFTY...", "qty": 50, "side": "BUY"}
      ],
      "margin_required": 120000
    }
    ```

## WebSocket API (FastAPI)

### `WSS /ws/v1/portfolio/stream`
*   **Description:** Streams Live LTP, MTM, and Greeks.
*   **Headers:** Token passed via query string `?token=<JWT>`
*   **Payload Format:** MessagePack (Binary)
*   **Decoded Payload Example:**
    ```json
    {
      "MTM": 1540.50,
      "positions": {
        "NSE:NIFTY24JUN22000CE": {"ltp": 120.5, "pnl": 500}
      }
    }
    ```
