# Release Planning Document

## Versioning Strategy
*   Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH` (e.g., `v1.2.0`).

## Alpha Release (v0.1.0)
*   **Date:** End of Sprint 3.
*   **Features:** Voice execution, Fyers login, basic P&L.
*   **Audience:** Internal testing only (Paper Trading).

## Beta Release (v1.0.0-beta)
*   **Date:** End of Sprint 4.
*   **Features:** Automated strategies, Live market trading.
*   **Audience:** Waitlisted 100 concurrent retail pros.
*   **Rollback Plan:** If severe latency occurs, a server-side kill switch will disable all API keys and flatten all open algorithmic positions at market price.

## Deployment Strategy (AWS)
*   **Frontend:** Vercel (Edge network for low latency).
*   **Backend:** AWS EKS (Kubernetes) or ECS, utilizing T4g (Graviton) instances for general compute and G4dn (GPU) instances for ML inference.
*   **Database:** AWS RDS PostgreSQL (Multi-AZ).
