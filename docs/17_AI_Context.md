# AI Context Document (Knowledge Base)

## Overview
This directory serves as the unified source of truth for all AI agents and human engineers working on the 3Option platform.

## File Index & Purpose
1.  **Product Vision (`01_Product_Vision.md`)**: The "Why" - Read this to understand the core problem (Latency, Complexity) we are solving for Indian traders.
2.  **Market Research (`02_Market_Research.md`)**: The competitive landscape (Sensibull, AlgoTest).
3.  **PRD (`03_PRD.md`)**: The master requirements document defining user personas and core features.
4.  **User Journeys (`04_User_Journeys.md`)**: Step-by-step flows for Voice execution and Auto-strategies.
5.  **FRS (`05_Feature_Requirements.md`)**: Detailed rules and algorithmic triggers for strategies (0DTE, Skew).
6.  **Wireframes & Design (`06_Wireframes.md`, `07_Design_System.md`)**: UI layouts and Tailwind configurations.
7.  **Technical Specs (`08_Architecture.md`, `09_Database_Design.md`, `10_API_Specification.md`)**: The core engineering stack (Next.js, FastAPI, MessagePack, Redis, PostgreSQL).
8.  **Security & Testing (`11_Security.md`, `12_Testing_Strategy.md`)**: SEBI compliance, audit logs, and load testing criteria.
9.  **Project Management (`13_Sprint_Planning.md`, `14_Product_Roadmap.md`, `15_Backlog.md`, `16_Release_Planning.md`)**: The exact execution sequence and roadmap.

## AI Agent Instructions
*   **When scaffolding the frontend:** Refer to `07_Design_System.md` for styling and `02_Frontend_Architecture.md` (if applicable) or `08_Architecture.md` for state management.
*   **When building the database:** Strictly adhere to the schemas in `09_Database_Design.md`.
*   **When implementing logic:** Ensure compliance with `11_Security.md` (Audit Logs).
