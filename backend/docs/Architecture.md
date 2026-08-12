# 3Option Backend: System Architecture

## 1. Technology Stack
*   **Language & Framework:** Python 3.11+, FastAPI (for high-concurrency async performance).
*   **Database:** PostgreSQL (for relational data: users, OAuth tokens, trade history, SEBI audit logs).
*   **Caching & Pub/Sub:** Redis (for rate limiting broker API calls and distributing WebSocket messages).
*   **Data Serialization:** `msgpack` library for binary JSON encoding over WebSockets.
*   **ORM:** SQLAlchemy or SQLModel (async).

## 2. System Components

### 2.1. FastAPI Web Server
*   **ASGI Server:** Uvicorn/Gunicorn.
*   **Endpoints:** REST APIs for Authentication, Portfolio Sync, and Strategy configuration.
*   **WebSockets:** Dedicated async WebSocket endpoints for:
    1.  `ws/audio`: Receiving raw PCM audio chunks from the frontend.
    2.  `ws/marketdata`: Broadcasting MessagePack-encoded tick data and live Greeks.

### 2.2. The Smart Order Router (SOR)
*   **Role:** Translates the AI-generated JSON intent into Fyers-specific API calls.
*   **Concurrency:** Uses Python`s `asyncio` to fire multiple API requests (e.g., placing 4 legs of an Iron Condor) concurrently to minimize slippage.

### 2.3. PostgreSQL Schema Design (High Level)
*   `Users`: ID, Name, Email, Fyers_Access_Token (encrypted).
*   `AuditLogs`: Timestamp, User_ID, Raw_Audio_S3_Link, Transcribed_Text, Generated_JSON (Required for SEBI compliance regarding algo/voice trading).
*   `Strategies`: User_ID, Strategy_Name, Status (Active/Paused), Max_Loss_Limit.

## 3. Real-Time Data Pipeline
1.  **Ingestion:** Python worker connects to Fyers WebSocket for Nifty Options chain data.
2.  **Processing:** Calculates real-time Greeks (Black-Scholes model) in memory.
3.  **Serialization:** Packs the combined payload using `msgpack.packb()`.
4.  **Distribution:** Publishes the binary payload to a Redis channel. The FastAPI WebSocket servers subscribe to this channel and push the payload to the 100 connected clients.
