# Sprint Planning Document

## Sprint 1: Foundation & Infrastructure (Weeks 1-2)
*   **Sprint Goal:** Initialize monorepo, setup PostgreSQL, and establish Fyers OAuth flow.
*   **Deliverables:** Working backend database, successful Fyers login on Frontend, JWT generation.
*   **Tasks:**
    *   Initialize Next.js and FastAPI repos.
    *   Implement Database schema (Alembic/SQLModel).
    *   Build `POST /api/v1/auth/fyers/link`.

## Sprint 2: Core Data Pipeline (Weeks 3-4)
*   **Sprint Goal:** Connect to Fyers WebSocket and stream data to the frontend using MessagePack.
*   **Deliverables:** Real-time P&L dashboard updating at 5fps.
*   **Tasks:**
    *   Backend Fyers WSS client.
    *   Redis Pub/Sub setup.
    *   FastAPI `WSS /ws/v1/portfolio/stream`.
    *   Frontend Zustand store implementation.

## Sprint 3: Voice Execution Engine (Weeks 5-6)
*   **Sprint Goal:** Implement the microphone UI and Sarvam AI NLP parsing.
*   **Deliverables:** Ability to speak a trade and see the pre-trade confirmation modal.
*   **Tasks:**
    *   Frontend Web Audio API integration.
    *   Backend integration with Sarvam AI.
    *   Margin calculation logic before displaying modal.

## Sprint 4: Automated ML Strategies (Weeks 7-8)
*   **Sprint Goal:** Integrate the pre-trained PyTorch models into the FastAPI runtime.
*   **Deliverables:** Working "0DTE Gamma Blast" and "Volatility Skew" auto-trading modules.
*   **Tasks:**
    *   Load `.pt` models into memory on backend startup.
    *   Build feature-engineering pipeline for real-time inference.
    *   Implement automated order routing and trailing stop-losses.
