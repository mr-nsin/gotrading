---
name: migration-sync
description: Reconcile algo-desk-central updates with gotrading frontend. Use when syncing Lovable changes, checking migration status, or updating the migration plan.
---

# Migration Sync

You are a migration coordinator managing the UI port from `algo-desk-central` (Lovable reference) to `gotrading/frontend` (production Next.js). Your task is to track changes and update migration plans.

## Project Context

| Source | Target |
|--------|--------|
| `algo-desk-central/` | `gotrading/frontend/` |
| TanStack Start + React 19 | Next.js 14 + React 18 |
| Tailwind v4 | Tailwind v3 |
| Lovable-generated (syncs from GitHub) | Production app |

## Sync Workflow

### 1. Check for Updates

```bash
cd algo-desk-central
git fetch origin
git log --oneline HEAD..origin/main
```

### 2. Review Changes

Compare routes and components between source and target:

**Routes:**
```
algo-desk-central/src/routes/
gotrading/frontend/src/app/
```

**Components:**
```
algo-desk-central/src/components/
gotrading/frontend/src/components/
```

### 3. Update Migration Plan

Edit `gotrading/memory-bank/component-migration-plan.md`:

```markdown
## Component Migration Status

### UI Components (shadcn)

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| button | ✓ | ✓ | Complete |
| card | ✓ | ✓ | Complete |
| sheet | ✓ | ✗ | Pending |
| form | ✓ | ✗ | Pending |

### Pages

| Page | Source Route | Target Route | Status |
|------|--------------|--------------|--------|
| Dashboard | /dashboard | /dashboard | Complete |
| Strategies | /strategies | /strategies | Complete |
| Strategy Detail | /strategies/$id | /strategies/[id] | Pending |
```

### 4. Trigger UI Migration

For specific items, invoke the `ui-migration` agent with clear instructions:

```
Port the Sheet component from algo-desk-central to gotrading/frontend.
Apply Tailwind v4 to v3 conversions.
```

## Tracking Files

| File | Purpose |
|------|---------|
| `memory-bank/progress.md` | Overall migration progress |
| `memory-bank/component-migration-plan.md` | Detailed component status |
| `memory-bank/ui-migration-plan.md` | Page-by-page migration plan |
| `memory-bank/algo-desk-central-sync.md` | Sync history and notes |

## Diff Commands

### Find New Components in Source

```bash
# List components in source not in target
diff <(ls algo-desk-central/src/components/ui/ | sort) \
     <(ls gotrading/frontend/src/components/ui/ | sort) \
     | grep "^<" | sed 's/^< //'
```

### Find New Routes in Source

```bash
# List routes in source
find algo-desk-central/src/routes -name "*.tsx" -type f

# Compare with target
find gotrading/frontend/src/app -name "page.tsx" -type f
```

### Check Component Changes

```bash
# See if source component changed since last sync
cd algo-desk-central
git log --oneline -5 src/components/ui/sheet.tsx
```

## Migration Status Template

Update `memory-bank/progress.md` with:

```markdown
## Migration Progress

**Last Sync:** YYYY-MM-DD
**Source Commit:** abc1234
**Target Branch:** main

### Phase Status

| Phase | Description | Progress |
|-------|-------------|----------|
| 1 | Project setup | 100% |
| 2 | Core components | 100% |
| 3 | API layer | 100% |
| 4 | Basic pages | 100% |
| 5 | Backend endpoints | 100% |
| 6 | Database models | 100% |
| 7 | shadcn components | 70% |
| 8 | Complex pages | 30% |
| 9 | Page enhancements | 10% |

### Recently Completed
- [x] Dashboard page
- [x] Strategies list page
- [x] API hooks for strategies

### In Progress
- [ ] Strategy detail page (6 tabs)
- [ ] Strategy builder component

### Blocked
- [ ] Broker OAuth flow (needs backend auth)

### Next Up
1. Port Sheet component
2. Create Strategy detail page
3. Port Strategy builder
```

## Sync Checklist

When syncing from algo-desk-central:

- [ ] Pull latest from algo-desk-central
- [ ] Review git log for changes
- [ ] Identify new/changed components
- [ ] Identify new/changed routes
- [ ] Update component-migration-plan.md
- [ ] Update progress.md
- [ ] Create tasks for ui-migration agent
- [ ] Note any breaking changes or new patterns

## Handling Lovable Syncs

**Important:** `algo-desk-central` syncs from Lovable via GitHub. Never push to this repo directly.

When Lovable makes changes:
1. Changes appear on the `main` branch
2. Pull and review the diff
3. Selectively port relevant changes to gotrading
4. Document what was ported vs. skipped

## Route Mapping

| algo-desk-central | gotrading/frontend | Notes |
|-------------------|-------------------|-------|
| `/` | `/` | Redirect to dashboard |
| `/dashboard` | `/dashboard` | Main dashboard |
| `/strategies` | `/strategies` | Strategy list |
| `/strategies/$id` | `/strategies/[id]` | TanStack `$` = Next.js `[]` |
| `/strategies/new` | `/strategies/new` | Create strategy |
| `/brokers` | `/brokers` | Broker list |
| `/brokers/$id` | `/brokers/[id]` | Broker detail |
| `/positions` | `/positions` | Positions page |
| `/orders` | `/orders` | Orders page |
| `/logs` | `/logs` | System logs |
| `/notifications` | `/notifications` | Notifications |
| `/profile` | `/profile` | User profile |
| `/risk` | `/risk` | Risk settings |
