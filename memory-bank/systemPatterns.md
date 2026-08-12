# System Architecture and Patterns

## System Architecture
The platform is structured into four main layers (as researched):
1.  **Voice Interaction Layer (Frontend):** Next.js/React interface. Captures audio via MediaRecorder and streams directly to Sarvam AI STT WebSockets.
2.  **Intent Parsing Layer (Middleware):** Python/FastAPI service. Receives text from Sarvam, passes it to an LLM (OpenAI/Anthropic) to extract structured JSON (Strategy, Strike, Expiry, Asset).
3.  **Execution & Orchestration Layer (Trading Engine):** Go/Rust high-performance router. Groups JSON intents into broker-specific Basket Orders to ensure atomic execution. Handles pre-trade risk checks.
4.  **Compliance Layer:** PostgreSQL DB for users, HashiCorp Vault for API keys, AWS S3 for storing raw voice commands for SEBI audit logging.

## Key Technical Decisions & Tradeoffs
- **Wrapper vs. DMA:** Chose Wrapper over Retail APIs. *Tradeoff:* We lose microsecond "HFT" latency but save millions in capital and regulatory compliance.
- **Broker Multiplexing:** The execution engine will need a unified interface pattern (Adapter Pattern) to handle differing API structures between Zerodha, Upstox, and Groww.
