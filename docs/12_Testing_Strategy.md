# Testing Strategy Document

## 1. Unit Testing
*   **Backend (Pytest):** 
    *   Mock Fyers API responses.
    *   Test JSON parser logic for extreme edge cases (e.g., user says "Nifty bees hazar" - ensure it maps to 20000).
    *   Coverage Target: 85% for routing, 100% for Margin calculation logic.
*   **Frontend (Jest/React Testing Library):**
    *   Test Zustand state mutations on simulated MessagePack tick data.
    *   Ensure UI does not freeze when 100 ticks arrive per second.

## 2. Integration Testing
*   **Broker Sandbox:** Run automated trades against the Fyers Paper Trading / Sandbox environment to verify order placement and webhook callbacks.

## 3. Performance & Load Testing
*   **Tool:** Locust / k6.
*   **Scenario:** 100 concurrent users opening WebSockets and receiving 5 updates per second.
*   **Target:** Server CPU utilization < 60%, Redis latency < 5ms.

## 4. ML Model Validation
*   **Backtesting:** All DRL models (PPO) and LSTMs must be backtested on 5 years of historical tick data (2019-2024).
*   **Metric:** Sharpe Ratio > 1.5, Max Drawdown < 15% inclusive of slippage and STT.
