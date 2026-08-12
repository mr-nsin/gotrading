# AlgoDesk Central → GoTrading Sync Tracker

**Purpose:** Track components, files, and patterns copied from `algo-desk-central` to enable easy integration of future upstream changes.

**Last Sync Date:** 2026-08-10  
**Migration Status:** ✅ INITIAL MIGRATION COMPLETE  
**Source Repo:** `d:\project\gotrading\algo-desk-central`

---

## Sync Status Legend

| Status | Meaning |
|--------|---------|
| ✅ SYNCED | Directly ported, matches source |
| 🔄 MODIFIED | Ported with modifications for gotrading |
| ⚡ ENHANCED | Extended beyond source functionality |
| 🆕 NEW | Created new, doesn't exist in source |
| ⏳ PENDING | Not yet migrated |

---

## 1. UI Components (shadcn/ui)

### Source: `algo-desk-central/src/components/ui/`
### Target: `gotrading/frontend/src/components/ui/`

| Component | Source File | Status | Notes |
|-----------|-------------|--------|-------|
| accordion | `accordion.tsx` | ⏳ PENDING | |
| alert | `alert.tsx` | ⏳ PENDING | |
| alert-dialog | `alert-dialog.tsx` | ⏳ PENDING | |
| aspect-ratio | `aspect-ratio.tsx` | ⏳ PENDING | |
| avatar | `avatar.tsx` | ⏳ PENDING | |
| badge | `badge.tsx` | ⏳ PENDING | |
| breadcrumb | `breadcrumb.tsx` | ⏳ PENDING | |
| button | `button.tsx` | ⏳ PENDING | |
| calendar | `calendar.tsx` | ⏳ PENDING | |
| card | `card.tsx` | ⏳ PENDING | |
| carousel | `carousel.tsx` | ⏳ PENDING | |
| chart | `chart.tsx` | ⏳ PENDING | |
| checkbox | `checkbox.tsx` | ⏳ PENDING | |
| collapsible | `collapsible.tsx` | ⏳ PENDING | |
| command | `command.tsx` | ⏳ PENDING | |
| context-menu | `context-menu.tsx` | ⏳ PENDING | |
| dialog | `dialog.tsx` | ⏳ PENDING | |
| drawer | `drawer.tsx` | ⏳ PENDING | |
| dropdown-menu | `dropdown-menu.tsx` | ⏳ PENDING | |
| form | `form.tsx` | ⏳ PENDING | |
| hover-card | `hover-card.tsx` | ⏳ PENDING | |
| input | `input.tsx` | ⏳ PENDING | |
| input-otp | `input-otp.tsx` | ⏳ PENDING | |
| label | `label.tsx` | ⏳ PENDING | |
| menubar | `menubar.tsx` | ⏳ PENDING | |
| navigation-menu | `navigation-menu.tsx` | ⏳ PENDING | |
| pagination | `pagination.tsx` | ⏳ PENDING | |
| popover | `popover.tsx` | ⏳ PENDING | |
| progress | `progress.tsx` | ⏳ PENDING | |
| radio-group | `radio-group.tsx` | ⏳ PENDING | |
| resizable | `resizable.tsx` | ⏳ PENDING | |
| scroll-area | `scroll-area.tsx` | ⏳ PENDING | |
| select | `select.tsx` | ⏳ PENDING | |
| separator | `separator.tsx` | ⏳ PENDING | |
| sheet | `sheet.tsx` | ⏳ PENDING | |
| sidebar | `sidebar.tsx` | ⏳ PENDING | |
| skeleton | `skeleton.tsx` | ⏳ PENDING | |
| slider | `slider.tsx` | ⏳ PENDING | |
| sonner | `sonner.tsx` | ⏳ PENDING | |
| switch | `switch.tsx` | ⏳ PENDING | |
| table | `table.tsx` | ⏳ PENDING | |
| tabs | `tabs.tsx` | ⏳ PENDING | |
| textarea | `textarea.tsx` | ⏳ PENDING | |
| toggle | `toggle.tsx` | ⏳ PENDING | |
| toggle-group | `toggle-group.tsx` | ⏳ PENDING | |
| tooltip | `tooltip.tsx` | ⏳ PENDING | |

---

## 2. Custom Components

### Source: `algo-desk-central/src/components/`
### Target: `gotrading/frontend/src/components/`

| Component | Source File | Status | Modifications |
|-----------|-------------|--------|---------------|
| UI Kit | `ui-kit.tsx` | ✅ SYNCED | Contains: Panel, KpiCard, Sparkline, StatusPill, SideTag, Tag, PageHeader, EmptyState, TableSkeleton |
| Data Table | `data-table.tsx` | ✅ SYNCED | Generic sortable table component |
| Charts | `charts.tsx` | ✅ SYNCED | EquityChart, DonutChart, PnlBarChart |
| App Sidebar | `app-sidebar.tsx` | 🔄 MODIFIED | Updated route links for Next.js app router |
| Top Bar | `top-bar.tsx` | 🔄 MODIFIED | Added real-time clock, notification count from API |
| Settings Provider | `settings-provider.tsx` | 🆕 NEW | Replaced with React Query + Providers component |
| Strategy Builder | `strategy-builder.tsx` | ⏳ PENDING | Basic form created, full builder pending |

---

## 3. Route Pages

### Source: `algo-desk-central/src/routes/`
### Target: `gotrading/frontend/src/app/`

| Page | Source File | Target File | Status | Modifications |
|------|-------------|-------------|--------|---------------|
| Dashboard | `index.tsx` | `page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Strategies List | `strategies.index.tsx` | `strategies/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Strategy Detail | `strategies.$strategyId.tsx` | `strategies/[id]/page.tsx` | ⏳ PENDING | Need to port |
| New Strategy | `strategies.new.tsx` | `strategies/new/page.tsx` | 🔄 MODIFIED | Simplified form, connected to API |
| Positions | `positions.tsx` | `positions/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Orderbook | `orderbook.tsx` | `orders/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Brokers List | `brokers.index.tsx` | `brokers/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Broker Detail | `brokers.$brokerId.tsx` | `brokers/[id]/page.tsx` | ⏳ PENDING | Need to port |
| Logs | `logs.tsx` | `logs/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Notifications | `notifications.tsx` | `notifications/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Profile | `profile.tsx` | `profile/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Risk | `risk.tsx` | `risk/page.tsx` | ✅ SYNCED | Using React Query API hooks |
| Root Layout | `__root.tsx` | `layout.tsx` | 🔄 MODIFIED | Adapted for Next.js app router |

---

## 4. Hooks

### Source: `algo-desk-central/src/hooks/`
### Target: `gotrading/frontend/src/hooks/`

| Hook | Source File | Status | Notes |
|------|-------------|--------|-------|
| use-mobile | `use-mobile.tsx` | ⏳ PENDING | Direct port |
| use-loading | `use-loading.ts` | ⏳ PENDING | Replace with React Query loading states |
| use-tick | `use-tick.ts` | ⏳ PENDING | Direct port for clock |

---

## 5. Utility Libraries

### Source: `algo-desk-central/src/lib/`
### Target: `gotrading/frontend/src/lib/`

| Utility | Source File | Status | Notes |
|---------|-------------|--------|-------|
| Format | `format.ts` | ⏳ PENDING | INR formatting, pnlClass, formatTime, formatPct |
| Utils | `utils.ts` | ⏳ PENDING | cn() function, clsx/tailwind-merge |
| Mock Data | `mock-data.ts` | 🚫 NOT PORTING | Replace with API calls |
| Error Capture | `error-capture.ts` | ⏳ PENDING | Adapt for Next.js error boundary |

---

## 6. Styles

### Source: `algo-desk-central/src/styles.css`
### Target: `gotrading/frontend/src/app/globals.css`

| Style Section | Status | Notes |
|---------------|--------|-------|
| CSS Variables (dark theme) | ⏳ PENDING | oklch color space |
| CSS Variables (light theme) | ⏳ PENDING | `.light` class variant |
| Base styles | ⏳ PENDING | Scrollbar, font smoothing |
| Custom utilities | ⏳ PENDING | `.num`, `.panel`, `.live-dot` |
| Flash animations | ⏳ PENDING | `.flash-up`, `.flash-down` |

---

## 7. Configuration Files

| File | Source | Target | Status | Notes |
|------|--------|--------|--------|-------|
| components.json | `components.json` | `components.json` | ⏳ PENDING | shadcn config |
| Tailwind Config | `vite.config.ts` (inline) | `tailwind.config.ts` | 🔄 MODIFIED | Convert to standalone Tailwind config |
| TypeScript Config | `tsconfig.json` | `tsconfig.json` | 🔄 MODIFIED | Adapt for Next.js |

---

## 8. Data Model Mapping

### Mock Data Types → API Types

| Source Type | Source File | Backend Model | API Endpoint |
|-------------|-------------|---------------|--------------|
| `Broker` | `mock-data.ts:26-44` | `BrokerCredential` | `GET /api/v1/brokers` |
| `Strategy` | `mock-data.ts:173-204` | `Strategy` | `GET /api/v1/strategies` |
| `Position` | `mock-data.ts:286-301` | `VirtualTrade` | `GET /api/v1/positions` |
| `Order` | `mock-data.ts:335-351` | `Order` | `GET /api/v1/orders` |
| `LogEntry` | `mock-data.ts:403-416` | `LogEntry` | `GET /api/v1/logs` |
| `Notification` | `mock-data.ts:451-461` | `Notification` (new) | `GET /api/v1/notifications` |
| `totals` | `mock-data.ts:543-566` | N/A (computed) | `GET /api/v1/dashboard/totals` |
| `equityCurve` | `mock-data.ts:482-492` | N/A (computed) | `GET /api/v1/dashboard/equity-curve` |

---

## 9. Key Differences Log

Track significant changes made during migration that differ from source:

| Date | Component/File | Change | Reason |
|------|----------------|--------|--------|
| 2026-08-10 | - | Migration plan created | Initial setup |
| | app-sidebar.tsx | Routes updated | Next.js app router uses different path format |
| | settings-provider.tsx | Added localStorage persistence | Source uses in-memory only |
| | All pages | Mock data → React Query | Connect to real backend |
| | strategy-builder.tsx | Form submission to API | Source only shows toasts |

---

## 10. Future Sync Checklist

When syncing future changes from `algo-desk-central`:

### Pre-Sync Steps
1. [ ] Note current source commit hash
2. [ ] Run `git log --oneline` in algo-desk-central to see new commits
3. [ ] Review changed files with `git diff <last-sync-commit>..HEAD`

### Component Updates
1. [ ] Check for new shadcn/ui components
2. [ ] Check for modifications to existing ui/ components
3. [ ] Check for changes to ui-kit.tsx, data-table.tsx, charts.tsx
4. [ ] Check for new custom components

### Style Updates
1. [ ] Check styles.css for new CSS variables
2. [ ] Check for new utility classes
3. [ ] Check for animation changes

### Route Updates
1. [ ] Check for new routes
2. [ ] Check for modifications to existing route pages
3. [ ] Note new features/UI patterns

### Post-Sync Steps
1. [ ] Update this document with new sync date and commit
2. [ ] Mark synced items with ✅ status
3. [ ] Document any modifications in "Key Differences Log"
4. [ ] Test all affected pages

---

## 11. File Checksums (for diff detection)

Record SHA256 of key source files at sync time:

```
# Run: Get-FileHash -Algorithm SHA256 <file>
# Record after migration

algo-desk-central/src/components/ui-kit.tsx: <hash>
algo-desk-central/src/components/data-table.tsx: <hash>
algo-desk-central/src/components/charts.tsx: <hash>
algo-desk-central/src/styles.css: <hash>
algo-desk-central/src/lib/format.ts: <hash>
algo-desk-central/src/routes/index.tsx: <hash>
```

---

## 12. Dependencies Version Lock

Track dependency versions from source for compatibility:

| Package | Source Version | Target Version | Notes |
|---------|----------------|----------------|-------|
| react | ^19.2.0 | ^18.3.0 | Next.js 14 uses React 18 |
| @tanstack/react-query | ^5.101.1 | ^5.101.0 | Match version |
| recharts | ^2.15.4 | ^2.12.0 | Minor difference OK |
| lucide-react | ^0.575.0 | ^0.400.0 | Use latest compatible |
| tailwindcss | ^4.2.1 | ^3.4.0 | Tailwind 4 not stable for Next.js |
| date-fns | ^4.1.0 | ^4.1.0 | Match exactly |
| sonner | ^2.0.7 | ^1.5.0 | Use latest compatible |

---

## Contact & Resources

- **Source Repo:** `d:\project\gotrading\algo-desk-central`
- **Target Repo:** `d:\project\gotrading\gotrading`
- **Migration Plan:** `memory-bank/ui-migration-plan.md`
- **This Document:** `memory-bank/algo-desk-central-sync.md`
