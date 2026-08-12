# Product Context

## Why This Product Exists
The Indian derivatives market is the largest in the world by volume, yet the execution tools for retail traders remain highly manual. A Voice AI-driven platform solves the latency of manual multi-leg execution and bridges the gap between retail platforms and institutional-grade algorithmic orchestration.

## Target Users and Pain Points
- **Pro-Retail Options Traders:** Struggle with slippage when executing 4-leg Iron Condors manually.
- **HNI Portfolio Hedgers:** Need quick, calculated cross-asset hedging (e.g., "Hedge my banking portfolio with BankNifty puts") without doing the manual beta-weighted math.
- **Pain Points:** Complex UI navigations on mobile during market open, lack of forced risk management limits, and inability to simultaneously route trades across multiple brokers.

## High-Level Operations
Users speak into the app ("Sell a Nifty 22000 Straddle"). The app streams the audio via WebSocket to Sarvam AI. The resulting text is parsed by an LLM into a JSON intent. The backend calculates the required margin, reads the order back to the user for confirmation, and upon saying "Yes", fires a Basket Order via the user's connected broker API.

## Experience Goals
- Frictionless, hands-free trading interface.
- Ultra-low latency voice-to-JSON parsing.
- Absolute clarity and safety (read-back confirmations) before any capital is deployed.
