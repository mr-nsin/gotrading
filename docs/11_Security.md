# Security Document

## SEBI Compliance & Audit Logs
*   As an algorithmic wrapper, 3Option must maintain an immutable audit trail of the user`s intent.
*   **Voice Logs:** Every voice command is recorded, uploaded to S3 (Standard-IA), and mapped to the resulting order in the `audit_logs` table.

## Authentication & Authorization
*   **Frontend-Backend:** Stateless JWT tokens signed with RS256. 1-hour expiry with refresh token rotation.
*   **RBAC (Role-Based Access Control):** 
    *   `role_user`: Can only execute trades on their linked broker account.
    *   `role_admin`: Access to system-wide telemetry, cannot execute trades on behalf of users.

## Secrets Management
*   Fyers `app_id` and `app_secret` are never exposed to the frontend.
*   User access tokens are encrypted at rest in PostgreSQL using AES-256-GCM.

## Data Privacy (DPDP Act)
*   User audio data is used strictly for transaction parsing and is NOT used to train base NLP models without explicit opt-in.
