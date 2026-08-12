# Market Research Document

## Competitor Analysis

### 1. Sensibull
*   **Strengths:** Industry standard for options analytics in India. Direct broker integration (Zerodha, Upstox). Excellent UI for payoff graphs.
*   **Weaknesses:** Completely manual execution. No voice capabilities. High latency during peak expiry days. No automated HFT strategies for retail.

### 2. AlgoTest.in
*   **Strengths:** Great backtesting engine. Allows deploying static rules (e.g., 9:20 straddle) to brokers.
*   **Weaknesses:** Relies on rigid time-based rules. Does not utilize dynamic Machine Learning (DRL) for hedging. No voice AI interface.

### 3. Tradetron
*   **Strengths:** Massive marketplace for user-generated strategies. Multi-broker support.
*   **Weaknesses:** Severe latency issues. UI is outdated and complex. Heavy reliance on polling rather than WebSockets.

## SWOT Analysis of 3Option
*   **Strengths:** First-mover advantage in Hinglish voice-activated execution. Advanced ML pipelines (DRL/LSTMs) for retail users.
*   **Weaknesses:** High dependency on broker API stability (Fyers). Voice recognition accuracy during extreme market stress.
*   **Opportunities:** Expanding to multi-asset classes (Commodities/MCX). B2B white-labeling.
*   **Threats:** SEBI tightening regulations on algo wrappers. Massive infrastructure costs for low-latency WebSockets.

## Feature Comparison
| Feature | 3Option | Sensibull | AlgoTest | Tradetron |
| :--- | :--- | :--- | :--- | :--- |
| Voice Execution (Hinglish) | Yes | No | No | No |
| Pre-built ML Strategies | Yes | No | No | No |
| Real-time Greeks Dashboard| Yes | Yes | No | No |
| Binary JSON (MessagePack)| Yes | No | No | No |
| Automated Delta Hedging | Yes | Partial | Yes | Yes |

## Pricing Research
*   Sensibull: ~₹800/month
*   AlgoTest: ~₹1200/month (credit system)
*   **3Option Strategy:** ₹1499/month (Premium - positioning as an institutional-grade AI tool).

## TAM/SAM/SOM
*   **TAM (Total Addressable Market):** 10M+ active F&O traders in India.
*   **SAM (Serviceable Addressable Market):** 2M+ active tech-savvy traders using discount brokers like Fyers/Zerodha.
*   **SOM (Serviceable Obtainable Market):** 10,000 paid subscribers in Year 1.
