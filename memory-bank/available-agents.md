# Available AI Agents & Capabilities

This document indexes all custom agents available for the GoTrading platform. These agents are defined in `.cursor/agents/` and can be invoked for specialized tasks.

## Agent Index

| Agent | Location | Trigger Phrases |
|-------|----------|-----------------|
| **ui-migration** | `.cursor/agents/ui-migration.md` | "port component", "migrate UI", "strategy builder" |
| **backend-endpoint** | `.cursor/agents/backend-endpoint.md` | "create endpoint", "add API", "new route" |
| **api-hook-generator** | `.cursor/agents/api-hook-generator.md` | "create hook", "add query hook", "React Query" |
| **broker-adapter** | `.cursor/agents/broker-adapter.md` | "add broker", "integrate Upstox", "broker adapter" |
| **shadcn-component** | `.cursor/agents/shadcn-component.md` | "add shadcn", "port component", "UI component" |
| **architecture-audit** | `.cursor/agents/architecture-audit.md` | "fix architecture", "audit issues", "critical fix" |
| **test-scaffold** | `.cursor/agents/test-scaffold.md` | "add tests", "create test", "test coverage" |
| **migration-sync** | `.cursor/agents/migration-sync.md` | "sync lovable", "check migration", "update plan" |

## Agent Capabilities

### ui-migration
Ports React components from `algo-desk-central` (TanStack Start, Tailwind v4) to `gotrading/frontend` (Next.js 14, Tailwind v3). Handles Strategy Builder, Strategy Detail, Broker Detail pages.

### backend-endpoint
Creates full-stack API endpoints:
- FastAPI route in `backend/routes/`
- Pydantic models for request/response
- SQLModel table if needed
- TypeScript types in `frontend/src/lib/api.ts`
- React Query hooks in `frontend/src/hooks/use-api.ts`

### api-hook-generator
Generates React Query hooks for existing backend endpoints:
- useQuery hooks for GET requests
- useMutation hooks for POST/PUT/DELETE
- Proper query key conventions
- Toast notifications for feedback

### broker-adapter
Implements Indian stockbroker integrations:
- Broker adapter class extending `BaseBroker`
- WebSocket data stream class
- Environment variable configuration
- Frontend broker type in Add Broker Dialog

Supported: Zerodha, Fyers, Dhan, Angel One (implemented)
Pending: Upstox, Alice Blue, 5paisa, Kotak Neo

### shadcn-component
Manages shadcn/ui components:
- Install new components via `npx shadcn add`
- Port from `algo-desk-central` with Tailwind v4→v3 conversion
- Handle Radix UI dependencies

### architecture-audit
Fixes issues from `CODE_ANALYSIS_REPORT.md`:
- Risk manager fail-closed enforcement
- Order state machine implementation
- Concurrency fixes
- Auth middleware gaps

### test-scaffold
Generates test files:
- Backend: pytest with fixtures, TestClient
- Frontend: Jest + React Testing Library
- Coverage configuration

### migration-sync
Tracks migration progress:
- Diffs `algo-desk-central` vs `gotrading/frontend`
- Updates migration plan documents
- Coordinates with ui-migration agent

## When to Use Each Agent

| Task | Recommended Agent |
|------|-------------------|
| "Add a new API for X" | backend-endpoint |
| "Create React hook for Y endpoint" | api-hook-generator |
| "Port the Sheet component" | shadcn-component or ui-migration |
| "Add Upstox broker support" | broker-adapter |
| "Fix the risk manager bug" | architecture-audit |
| "Add tests for strategies route" | test-scaffold |
| "What changed in Lovable?" | migration-sync |
| "Build Strategy Detail page" | ui-migration |

## Memory Bank Files

All AI context files are in `gotrading/memory-bank/`:

| File | Purpose |
|------|---------|
| `projectbrief.md` | Product vision and goals |
| `productContext.md` | Feature requirements |
| `techContext.md` | Technology stack details |
| `systemPatterns.md` | Code patterns and conventions |
| `activeContext.md` | Current focus and blockers |
| `progress.md` | Migration and feature progress |
| `component-migration-plan.md` | Component-by-component status |
| `ui-migration-plan.md` | Page migration roadmap |
| `backend-api-changes.md` | API changelog |
| `antigravity-rules.md` | Development constraints |
| `algo-desk-central-sync.md` | Lovable sync history |
| `available-agents.md` | This file - agent index |
