# Product Requirements Document (PRD)

## Executive Summary
3Option is a B2C SaaS platform that provides retail Indian traders with a voice-activated interface and automated ML strategies, wrapping around the Fyers broker API. 

## What are we building?
A Next.js frontend with a real-time WebSocket dashboard, powered by a Python/FastAPI backend that handles NLP intent parsing (via Sarvam AI) and complex mathematical order routing.

## Why are we building?
To reduce the latency of complex options execution from 10 seconds to 1 second, and to democratize institutional strategies (Dispersion trading, Skew Arbitrage) for retail traders.

## User Personas

### 1. The Retail Pro (Primary)
*   **Profile:** Trades daily. Understands Greeks but struggles with manual execution speed.
*   **Needs:** Fast execution of multi-leg hedges, real-time MTM, trailing stop-losses.

### 2. The Algorithmic Speculator
*   **Profile:** Wants to deploy capital into automated strategies but cannot code.
*   **Needs:** 1-click deployment of ML-trained strategies (e.g., 0DTE Gamma Blasts), payoff visualizers.

### 3. Admin (Internal)
*   **Profile:** System administrator.
*   **Needs:** Monitor WebSocket loads, API rate limits, user error logs, and SEBI compliance audit trails.

## Features

### 1. Authentication & Broker Linking
*   Secure JWT-based login.
*   OAuth 2.0 flow to link the Fyers account and fetch the daily access token.

### 2. Voice Command Engine (The Microphone)
*   Persistent UI button to capture Web Audio.
*   Hinglish NLP processing -> JSON translation.
*   Pre-trade confirmation modal displaying the exact payload before firing.

### 3. Real-Time Dashboard
*   Grid displaying Live Price (LTP), MTM, Delta, Theta.
*   MessagePack binary streaming to handle tick data without freezing the DOM.

### 4. Automated Strategy Deployment
*   UI to select and deploy pre-trained ML models (Volatility Skew, Pairs Trading).
*   Live monitoring of the algorithm`s state (e.g., "Awaiting Breakout", "Hedging").

### 5. SEBI Audit Logging
*   Storage of raw audio files (S3) and transcribed text (Postgres) mapped to every order ID.

## User Stories
*   **As a Retail Pro**, I want to say "Nifty 22000 Straddle sell karo", so that I can instantly deploy the strategy without manually adding strikes to a basket.
*   **As an Algorithmic Speculator**, I want to turn on the "0DTE Gamma Blast" module at 1:00 PM on expiry day, so the system can automatically buy the breakout for me.
*   **As an Admin**, I want to see a dashboard of all active WebSocket connections, so I can scale the Redis nodes before the server crashes.

## Acceptance Criteria
*   **Voice Execution:** Given a valid voice command, when parsed, then the Pre-Trade modal must appear within 1.5 seconds.
*   **Market Data:** Given an active Fyers connection, when the market is open, the UI must reflect price changes with less than 200ms latency.
