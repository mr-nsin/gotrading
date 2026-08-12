# Backlog Document

## EPIC: Voice Trading Engine
*   **Feature:** Capture Audio
    *   *Story:* As a user, I want a push-to-talk button to record my voice.
        *   *Task:* Implement Web Audio API in Next.js.
        *   *Task:* Build UI recording animation.
*   **Feature:** NLP Translation
    *   *Story:* As a user, I want my Hinglish parsed accurately.
        *   *Task:* Integrate Sarvam AI STT API.
        *   *Task:* Build Prompt Engineering pipeline for LLM JSON generation.

## EPIC: Real-Time Dashboard
*   **Feature:** Portfolio Stream
    *   *Story:* As a user, I want to see my options MTM update live.
        *   *Task:* Setup Redis Pub/Sub for Fyers ticks.
        *   *Task:* Implement MessagePack decoder in Zustand store.
        *   *Task:* Build sticky-header UI grid.

## EPIC: Automated Strategies
*   **Feature:** 0DTE Execution
    *   *Story:* As a user, I want the system to buy breakouts automatically.
        *   *Task:* Load LSTM PyTorch model in FastAPI.
        *   *Task:* Write risk-management (stop-loss) daemon.
