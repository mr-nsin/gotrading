# Project Brief: 3Option Voice Trading Platform

## Core Requirements & Goals
- Build a multi-user, multi-asset trading platform named "3Option" focused on advanced multi-leg options strategies and hedging.
- Primary interaction model: Voice commands powered by Sarvam AI (Speech-to-Text and Text-to-Speech) to parse complex Indian financial slang and execute atomic multi-leg basket orders.
- Target Audience: Retail and Pro-Retail traders in India.
- Revenue Model: B2C SaaS platform acting as a wrapper over existing retail broker APIs (e.g., Zerodha, Upstox, Groww), avoiding the need to become a SEBI-registered broker.

## Problem Statement
- Current retail brokers lack native voice-activated trading features and struggle with atomic execution of complex multi-leg option strategies during high volatility.
- Institutional HFT (High-Frequency Trading) tools are inaccessible to retail traders due to massive capital, licensing, and co-location requirements.

## Non-Negotiables
- Strict compliance with SEBI's algorithmic trading regulations (Algo IDs, Static IP whitelisting).
- No unauthorized "copy trading" or Portfolio Management Services (PMS). The platform must act as an agent where users connect their own broker accounts for personal automation.
- Must include a pre-trade risk engine and voice confirmation loop (read-back) before executing live trades to prevent AI hallucination errors.
