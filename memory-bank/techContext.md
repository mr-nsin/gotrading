# Tech Context

## Tech Stack Overview (Proposed)
- **Frontend:** Next.js (React), Web Audio API for voice capture.
- **Backend (AI/NLP):** Python (FastAPI), LangChain for intent extraction.
- **Backend (Execution):** Go or Rust for low-latency Smart Order Routing (SOR).
- **AI Services:** Sarvam AI (Saaras v3 STT & TTS WebSockets) optimized for Indic languages and Hinglish.
- **Database:** PostgreSQL (Transactional), Redis (In-Memory margin checks/rate limiting).
- **Infrastructure:** AWS (EKS for orchestration, S3 for compliance audio storage).

## External Integrations
- **Sarvam AI API:** For all Voice-to-Text and Text-to-Voice tasks.
- **Broker APIs:** Zerodha Kite Connect, Upstox API, Dhan HQ API.
- **Market Data:** WebSocket feeds via broker APIs or a third-party authorized vendor like TrueData.

## Important Constraints
- Broker APIs enforce strict rate limits (e.g., 10 Orders Per Second). The platform must queue and throttle requests to avoid API bans.
- Retail users must use a Static IP to connect to the broker APIs; the backend infrastructure must route requests through dedicated NAT gateways with Elastic IPs whitelisted with the respective brokers.
