# 3Option Backend: Product Requirements Document (PRD)

## 1. Product Overview
The backend of **3Option** is a high-performance Python application designed to act as the middleware between the Next.js frontend, Sarvam AI (for Hinglish NLP), and the Fyers Broker API. It handles voice intent parsing, pre-trade risk management, and the execution of complex algorithmic trading strategies (Volatility Skew, 0DTE, Pairs Trading).

## 2. Integration Requirements (MVP Phase)

### 2.1. Fyers Broker API Integration
*   **Authentication:** Must implement the Fyers API v3 OAuth 2.0 flow to generate access tokens for the 100 beta users.
*   **Order Execution:** Support for multi-leg basket orders to ensure all legs of an options strategy (e.g., Iron Condor) are fired simultaneously, maximizing SPAN margin benefits.
*   **Market Data:** Must connect to the Fyers Data WebSocket to ingest real-time tick data for Nifty/BankNifty options.

### 2.2. Sarvam AI Voice Integration
*   **Speech-to-Text (STT):** Ingest PCM audio streams from the frontend and proxy them to Sarvam`s Saaras API for Hinglish transcription.
*   **Intent Extraction:** Feed the transcribed text to an LLM (LangChain/OpenAI) with a strict prompt to extract trading parameters into a predefined JSON schema.
    *   *Example JSON:* `{"strategy": "straddle", "action": "sell", "asset": "NIFTY", "strike": "ATM", "expiry": "current_week", "lots": 2}`

## 3. Core Features & Business Logic

### 3.1. Pre-Trade Risk Engine
*   **Margin Validation:** Before executing a basket order, the backend must query the Fyers Margin API to ensure the user has sufficient capital.
*   **Circuit Breakers:** Implement hard stops on 0DTE (Zero Days to Expiry) strategies to prevent infinite losses due to gamma explosions.

### 3.2. Data Transfer (IPC)
*   **Binary JSON:** Tick data from Fyers must be serialized using **MessagePack** before being broadcasted via WebSockets to the Next.js frontend. This reduces payload size by ~40% compared to raw JSON, crucial for lowering latency.

## 4. Scalability (100 Beta Users)
*   The architecture must comfortably handle 100 concurrent WebSocket connections streaming audio up, and streaming MessagePack tick data down, without dropping frames.
