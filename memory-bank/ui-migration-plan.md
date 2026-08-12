# UI Migration Plan: algo-desk-central → gotrading

**Created:** 2026-08-10  
**Source Repository:** `algo-desk-central` (TanStack Start + React 19)  
**Target Repository:** `gotrading` (FastAPI backend, needs frontend)  
**Objective:** Port the modern trading dashboard UI from algo-desk-central to gotrading while adapting to real API data

---

## Executive Summary

This plan outlines the complete migration of the professional-grade trading UI from `algo-desk-central` to `gotrading`. The migration involves:
- Creating a new `frontend/` directory in gotrading with Next.js 14 (as per existing docs)
- Porting 68 React components and 13 route pages
- Adapting mock data patterns to real FastAPI endpoints
- Extending backend APIs and database schema to support UI requirements

---

## Phase 1: Frontend Setup & Infrastructure

### 1.1 Create Next.js Project Structure

```
gotrading/
├── backend/           # Existing FastAPI backend
├── frontend/          # NEW: Next.js 14 application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Ported from algo-desk-central
│   │   │   ├── ui/        # shadcn/ui primitives (~40 components)
│   │   │   ├── charts.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── ui-kit.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── top-bar.tsx
│   │   │   ├── settings-provider.tsx
│   │   │   └── strategy-builder.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts     # NEW: API client for FastAPI
│   │   │   ├── format.ts  # Port from algo-desk-central
│   │   │   └── utils.ts
│   │   └── styles/
│   │       └── globals.css  # Dark terminal theme
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.js
└── memory-bank/
```

### 1.2 Dependencies to Install

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.101.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^1.0.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.3.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.23.0"
  }
}
```

### 1.3 Theme & Styling Migration

Port `styles.css` from algo-desk-central with these key elements:
- Dark terminal theme (oklch color space)
- Trading-specific colors: `--profit`, `--loss`, `--warn`
- Custom utilities: `.num`, `.panel`, `.live-dot`
- Light theme variant

---

## Phase 2: Component Migration

### 2.1 Core UI Components (Direct Port)

| Source File | Target File | Changes Required |
|-------------|-------------|------------------|
| `components/ui/*.tsx` (40 files) | `components/ui/*.tsx` | Minimal - path aliases only |
| `components/ui-kit.tsx` | `components/ui-kit.tsx` | None |
| `components/data-table.tsx` | `components/data-table.tsx` | None |
| `components/charts.tsx` | `components/charts.tsx` | None |
| `components/app-sidebar.tsx` | `components/app-sidebar.tsx` | Update routes for Next.js |
| `components/top-bar.tsx` | `components/top-bar.tsx` | Add API auth status |
| `components/settings-provider.tsx` | `components/settings-provider.tsx` | Add persistence |
| `components/strategy-builder.tsx` | `components/strategy-builder.tsx` | Connect to API |

### 2.2 Route Pages Migration

| algo-desk-central Route | Next.js Route | API Integration |
|-------------------------|---------------|-----------------|
| `routes/index.tsx` | `app/page.tsx` | Dashboard aggregates |
| `routes/strategies.index.tsx` | `app/strategies/page.tsx` | GET /api/v1/strategies |
| `routes/strategies.new.tsx` | `app/strategies/new/page.tsx` | POST /api/v1/strategies |
| `routes/strategies.$strategyId.tsx` | `app/strategies/[id]/page.tsx` | GET/PUT /api/v1/strategies/{id} |
| `routes/positions.tsx` | `app/positions/page.tsx` | GET /api/v1/positions |
| `routes/orderbook.tsx` | `app/orders/page.tsx` | GET /api/v1/orders |
| `routes/brokers.index.tsx` | `app/brokers/page.tsx` | GET /api/v1/brokers |
| `routes/brokers.$brokerId.tsx` | `app/brokers/[id]/page.tsx` | GET /api/v1/brokers/{id} |
| `routes/logs.tsx` | `app/logs/page.tsx` | GET /api/v1/logs |
| `routes/notifications.tsx` | `app/notifications/page.tsx` | NEW: notifications API |
| `routes/profile.tsx` | `app/profile/page.tsx` | NEW: user profile API |
| `routes/risk.tsx` | `app/risk/page.tsx` | GET/PUT /api/v1/risk |

### 2.3 Hooks Migration

| Source | Target | Changes |
|--------|--------|---------|
| `hooks/use-loading.ts` | `hooks/use-loading.ts` | Remove - use React Query loading |
| `hooks/use-mobile.tsx` | `hooks/use-mobile.tsx` | Direct port |
| `hooks/use-tick.ts` | `hooks/use-tick.ts` | Direct port |
| N/A | `hooks/use-api.ts` | NEW: API client hooks |

### 2.4 Utility Functions Migration

| Source | Target | Changes |
|--------|--------|---------|
| `lib/format.ts` | `lib/format.ts` | Direct port |
| `lib/utils.ts` | `lib/utils.ts` | Direct port |
| `lib/mock-data.ts` | DELETE | Replace with API calls |
| N/A | `lib/api.ts` | NEW: FastAPI client |

---

## Phase 3: Backend API Changes Required

### 3.1 New Endpoints Needed

#### Dashboard Aggregates API
```python
# routes/dashboard.py - NEW FILE
@router.get("/api/v1/dashboard/totals")
def get_dashboard_totals():
    """
    Returns aggregated metrics for dashboard KPI cards:
    - portfolioValue, deployed, todayPnl, overallPnl
    - activeStrategies, totalStrategies, openPositions
    - winRate, maxDrawdown, marginAvailable, marginUsed, funds
    """

@router.get("/api/v1/dashboard/equity-curve")
def get_equity_curve(range: str = "3M"):
    """
    Returns equity curve data points for charting
    Ranges: 1D, 1W, 1M, 3M, 1Y, All
    """

@router.get("/api/v1/dashboard/intraday-curve")
def get_intraday_curve():
    """Returns today's intraday P&L curve"""
```

#### Notifications API
```python
# routes/notifications.py - NEW FILE
@router.get("/api/v1/notifications")
def list_notifications():
    """List notifications with category, level, read status"""

@router.put("/api/v1/notifications/{id}/read")
def mark_notification_read(id: uuid.UUID):
    """Mark notification as read"""

@router.post("/api/v1/notifications/settings")
def update_notification_settings():
    """Update notification channel preferences"""
```

#### User Profile API
```python
# routes/profile.py - NEW FILE
@router.get("/api/v1/profile")
def get_profile():
    """Get user profile with sessions, settings"""

@router.put("/api/v1/profile")
def update_profile():
    """Update profile settings"""

@router.get("/api/v1/profile/sessions")
def list_sessions():
    """List active sessions with device info"""
```

### 3.2 Existing Endpoint Enhancements

#### Strategies API Enhancements
```python
# routes/strategies.py - MODIFY
# Add to Strategy response model:
{
    "segment": str,           # "Equity Cash" | "Futures" | "Options"
    "description": str,
    "brokers": List[str],     # List of connected broker IDs
    "todayPnl": float,
    "overallPnl": float,
    "openPositions": int,
    "winRate": float,
    "sharpe": float,
    "maxDd": float,
    "trades": int,
    "lastSignal": datetime,
    "mode": str,              # "Live" | "Paper" | "Backtest"
    "instruments": List[str],
    "entryRules": List[Rule],
    "exitRules": List[Rule],
    "risk": RiskConfig,
    "sizing": SizingConfig,
    "schedule": ScheduleConfig,
    "webhook": bool,
    "spark": List[float]      # Last 24 data points for sparkline
}
```

#### Brokers API Enhancements
```python
# routes/brokers.py - MODIFY
# Add to Broker response model:
{
    "code": str,              # "KITE", "UPX", "SMARTAPI", etc.
    "apiKeyMasked": str,      # Masked API key for display
    "tokenExpiry": str,       # Token expiration datetime
    "funds": float,
    "marginUsed": float,
    "marginAvailable": float,
    "strategies": int,        # Count of connected strategies
    "clientId": str,
    "autoSquareOff": str,     # Time string "15:20"
    "maxDailyLoss": float,
    "maxMarginUtil": float,   # Percentage
    "maxPositions": int,
    "leverageCap": float
}
```

#### Positions API Enhancements
```python
# routes/positions.py - MODIFY
# Add to Position response model:
{
    "segment": str,           # "OPT", "FUT", "EQ"
    "strategyId": str,
    "brokerId": str,
    "avgPrice": float,
    "ltp": float,
    "unrealized": float,
    "realized": float,
    "dayChange": float,       # Day % change
    "type": str,              # "Intraday" | "Carry Forward"
    "side": str               # "BUY" | "SELL"
}
```

#### Orders API Enhancements
```python
# routes/orders.py - MODIFY
# Add to Order response model:
{
    "segment": str,
    "strategyId": str,
    "brokerId": str,
    "type": str,              # "MARKET" | "LIMIT" | "SL" | "SL-M"
    "avgFill": float,
    "reason": Optional[str],  # Rejection reason
    "product": str,           # "MIS" | "NRML" | "CNC"
    "lifecycle": List[{       # Order lifecycle events
        "t": datetime,
        "label": str
    }]
}
```

#### Logs API Enhancements
```python
# routes/logs.py - MODIFY
# Add to LogEntry response model:
{
    "source": str,            # "strategy" | "broker" | "system" | "order" | "webhook"
    "brokerId": Optional[str]
}

# Add filtering:
@router.get("/api/v1/logs")
def list_logs(
    level: Optional[str] = None,
    source: Optional[str] = None,
    strategy_id: Optional[str] = None,
    broker_id: Optional[str] = None
):
```

### 3.3 WebSocket Enhancements

```python
# routes/stream.py - MODIFY
# Dashboard WebSocket should include:
{
    "portfolio": {
        "total_capital": float,
        "available_margin": float,
        "unrealized_pnl": float,
        "realized_pnl": float
    },
    "positions": [...],
    "tickers": [
        {"symbol": str, "ltp": float, "chg": float}
    ],
    "recent_logs": [...],
    "notifications": [...],   # NEW
    "broker_status": [        # NEW
        {"id": str, "status": str, "latency_ms": int}
    ]
}
```

---

## Phase 4: Database Schema Changes

### 4.1 New Tables Required

```python
# models.py - ADD

class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(foreign_key="user.id")
    time: datetime = Field(default_factory=datetime.utcnow)
    category: str  # "trade" | "risk" | "broker" | "system"
    level: str     # "info" | "warning" | "error" | "critical"
    title: str
    body: str
    read: bool = Field(default=False)

class UserSession(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    device: str
    location: str
    ip_address: str
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_current: bool = Field(default=False)

class NotificationSettings(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(foreign_key="user.id")
    email_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    trade_alerts: bool = Field(default=True)
    risk_alerts: bool = Field(default=True)
    broker_alerts: bool = Field(default=True)
    system_alerts: bool = Field(default=True)

class Instrument(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    symbol: str = Field(unique=True, index=True)
    segment: str  # "OPT" | "FUT" | "EQ"
    ltp: float = Field(default=0.0)
    change_pct: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 4.2 Existing Table Modifications

```python
# models.py - MODIFY

class Strategy(SQLModel, table=True):
    # Existing fields...
    
    # ADD these fields:
    segment: str = Field(default="Options")  # "Equity Cash" | "Futures" | "Options"
    description: Optional[str] = None
    brokers_json: str = Field(default='[]')  # JSON array of broker IDs
    open_positions: int = Field(default=0)
    last_signal: Optional[datetime] = None
    mode: str = Field(default="Paper")  # "Live" | "Paper" | "Backtest"
    instruments_json: str = Field(default='[]')
    entry_rules_json: str = Field(default='[]')
    exit_rules_json: str = Field(default='[]')
    risk_json: str = Field(default='{}')
    sizing_json: str = Field(default='{}')
    webhook_enabled: bool = Field(default=False)
    spark_data_json: str = Field(default='[]')  # Last 24 performance points

class BrokerCredential(BrokerCredentialBase, table=True):
    # Existing fields...
    
    # ADD these fields:
    code: Optional[str] = None  # "KITE", "SMARTAPI", etc.
    token_expiry: Optional[datetime] = None
    funds: float = Field(default=0.0)
    margin_used: float = Field(default=0.0)
    margin_available: float = Field(default=0.0)
    client_id: Optional[str] = None
    auto_square_off: str = Field(default="15:20")
    max_daily_loss: float = Field(default=50000.0)
    max_margin_util: float = Field(default=70.0)
    max_positions: int = Field(default=10)
    leverage_cap: float = Field(default=5.0)
    last_connected: Optional[datetime] = None
    connection_status: str = Field(default="disconnected")

class Order(OrderBase, table=True):
    # Existing fields...
    
    # ADD these fields:
    segment: Optional[str] = None
    broker_id: Optional[str] = None
    avg_fill: Optional[float] = None
    rejection_reason: Optional[str] = None
    lifecycle_json: str = Field(default='[]')  # JSON array of lifecycle events

class LogEntry(SQLModel, table=True):
    # Existing fields...
    
    # ADD these fields:
    source: str = Field(default="system")  # "strategy" | "broker" | "system" | "order" | "webhook"

class VirtualTrade(SQLModel, table=True):
    # Existing fields...
    
    # ADD these fields:
    segment: Optional[str] = None
    broker_id: Optional[str] = None
    avg_price: Optional[float] = None
    day_change: float = Field(default=0.0)
    trade_type: str = Field(default="Intraday")  # "Intraday" | "Carry Forward"
```

### 4.3 Migration Script

```python
# alembic/versions/xxx_ui_migration_schema.py

def upgrade():
    # Add new columns to existing tables
    op.add_column('strategy', sa.Column('segment', sa.String(), default='Options'))
    op.add_column('strategy', sa.Column('description', sa.String(), nullable=True))
    op.add_column('strategy', sa.Column('brokers_json', sa.String(), default='[]'))
    op.add_column('strategy', sa.Column('open_positions', sa.Integer(), default=0))
    op.add_column('strategy', sa.Column('last_signal', sa.DateTime(), nullable=True))
    op.add_column('strategy', sa.Column('mode', sa.String(), default='Paper'))
    op.add_column('strategy', sa.Column('instruments_json', sa.String(), default='[]'))
    op.add_column('strategy', sa.Column('entry_rules_json', sa.String(), default='[]'))
    op.add_column('strategy', sa.Column('exit_rules_json', sa.String(), default='[]'))
    op.add_column('strategy', sa.Column('risk_json', sa.String(), default='{}'))
    op.add_column('strategy', sa.Column('sizing_json', sa.String(), default='{}'))
    op.add_column('strategy', sa.Column('webhook_enabled', sa.Boolean(), default=False))
    op.add_column('strategy', sa.Column('spark_data_json', sa.String(), default='[]'))
    
    # Add broker credential columns
    op.add_column('brokercredential', sa.Column('code', sa.String(), nullable=True))
    op.add_column('brokercredential', sa.Column('token_expiry', sa.DateTime(), nullable=True))
    op.add_column('brokercredential', sa.Column('funds', sa.Float(), default=0.0))
    op.add_column('brokercredential', sa.Column('margin_used', sa.Float(), default=0.0))
    op.add_column('brokercredential', sa.Column('margin_available', sa.Float(), default=0.0))
    op.add_column('brokercredential', sa.Column('client_id', sa.String(), nullable=True))
    op.add_column('brokercredential', sa.Column('auto_square_off', sa.String(), default='15:20'))
    op.add_column('brokercredential', sa.Column('max_daily_loss', sa.Float(), default=50000.0))
    op.add_column('brokercredential', sa.Column('max_margin_util', sa.Float(), default=70.0))
    op.add_column('brokercredential', sa.Column('max_positions', sa.Integer(), default=10))
    op.add_column('brokercredential', sa.Column('leverage_cap', sa.Float(), default=5.0))
    op.add_column('brokercredential', sa.Column('last_connected', sa.DateTime(), nullable=True))
    op.add_column('brokercredential', sa.Column('connection_status', sa.String(), default='disconnected'))
    
    # Add order columns
    op.add_column('order', sa.Column('segment', sa.String(), nullable=True))
    op.add_column('order', sa.Column('broker_id', sa.String(), nullable=True))
    op.add_column('order', sa.Column('avg_fill', sa.Float(), nullable=True))
    op.add_column('order', sa.Column('rejection_reason', sa.String(), nullable=True))
    op.add_column('order', sa.Column('lifecycle_json', sa.String(), default='[]'))
    
    # Add log entry column
    op.add_column('logentry', sa.Column('source', sa.String(), default='system'))
    
    # Add virtual trade columns
    op.add_column('virtualtrade', sa.Column('segment', sa.String(), nullable=True))
    op.add_column('virtualtrade', sa.Column('broker_id', sa.String(), nullable=True))
    op.add_column('virtualtrade', sa.Column('avg_price', sa.Float(), nullable=True))
    op.add_column('virtualtrade', sa.Column('day_change', sa.Float(), default=0.0))
    op.add_column('virtualtrade', sa.Column('trade_type', sa.String(), default='Intraday'))
    
    # Create new tables
    op.create_table('notification', ...)
    op.create_table('usersession', ...)
    op.create_table('notificationsettings', ...)
    op.create_table('instrument', ...)
```

---

## Phase 5: API Client Implementation

### 5.1 Frontend API Client

```typescript
// frontend/src/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  // Dashboard
  async getDashboardTotals() {
    const res = await fetch(`${API_BASE}/api/v1/dashboard/totals`);
    return res.json();
  },
  
  async getEquityCurve(range: string = '3M') {
    const res = await fetch(`${API_BASE}/api/v1/dashboard/equity-curve?range=${range}`);
    return res.json();
  },
  
  // Strategies
  async getStrategies() {
    const res = await fetch(`${API_BASE}/api/v1/strategies`);
    return res.json();
  },
  
  async getStrategy(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/strategies/${id}`);
    return res.json();
  },
  
  async createStrategy(data: StrategyCreate) {
    const res = await fetch(`${API_BASE}/api/v1/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  async updateStrategy(id: string, data: StrategyUpdate) {
    const res = await fetch(`${API_BASE}/api/v1/strategies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  async startStrategy(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/strategies/${id}/start`, { method: 'POST' });
    return res.json();
  },
  
  async pauseStrategy(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/strategies/${id}/pause`, { method: 'POST' });
    return res.json();
  },
  
  async stopStrategy(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/strategies/${id}/stop`, { method: 'POST' });
    return res.json();
  },
  
  // Positions
  async getPositions() {
    const res = await fetch(`${API_BASE}/api/v1/positions`);
    return res.json();
  },
  
  async squareOffPosition(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/positions/${id}/squareoff`, { method: 'POST' });
    return res.json();
  },
  
  // Orders
  async getOrders(filters?: OrderFilters) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`${API_BASE}/api/v1/orders?${params}`);
    return res.json();
  },
  
  // Brokers
  async getBrokers() {
    const res = await fetch(`${API_BASE}/api/v1/brokers`);
    return res.json();
  },
  
  async addBroker(data: BrokerCreate) {
    const res = await fetch(`${API_BASE}/api/v1/brokers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  async testBroker(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/brokers/${id}/test`, { method: 'POST' });
    return res.json();
  },
  
  // Logs
  async getLogs(filters?: LogFilters) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`${API_BASE}/api/v1/logs?${params}`);
    return res.json();
  },
  
  // Risk
  async getRiskSettings() {
    const res = await fetch(`${API_BASE}/api/v1/risk/settings`);
    return res.json();
  },
  
  async updateRiskSettings(data: RiskSettings) {
    const res = await fetch(`${API_BASE}/api/v1/risk/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  async emergencyStop() {
    const res = await fetch(`${API_BASE}/api/v1/risk/emergency-stop`, { method: 'POST' });
    return res.json();
  },
  
  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/api/v1/notifications`);
    return res.json();
  },
  
  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, { method: 'PUT' });
    return res.json();
  },
  
  // Profile
  async getProfile() {
    const res = await fetch(`${API_BASE}/api/v1/profile`);
    return res.json();
  },
  
  async getSessions() {
    const res = await fetch(`${API_BASE}/api/v1/profile/sessions`);
    return res.json();
  },
};

// WebSocket connection
export function connectDashboardWS(onMessage: (data: DashboardSnapshot) => void) {
  const ws = new WebSocket(`${API_BASE.replace('http', 'ws')}/stream/ws/dashboard`);
  
  ws.onmessage = (event) => {
    // MessagePack decode
    const data = msgpack.decode(new Uint8Array(event.data));
    onMessage(data);
  };
  
  return ws;
}
```

### 5.2 React Query Hooks

```typescript
// frontend/src/hooks/use-api.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardTotals() {
  return useQuery({
    queryKey: ['dashboard', 'totals'],
    queryFn: api.getDashboardTotals,
    refetchInterval: 5000,
  });
}

export function useEquityCurve(range: string) {
  return useQuery({
    queryKey: ['dashboard', 'equity-curve', range],
    queryFn: () => api.getEquityCurve(range),
  });
}

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: api.getStrategies,
    refetchInterval: 10000,
  });
}

export function useStrategy(id: string) {
  return useQuery({
    queryKey: ['strategies', id],
    queryFn: () => api.getStrategy(id),
    enabled: !!id,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}

export function useStartStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.startStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}

// ... similar hooks for other API endpoints
```

---

## Phase 6: Implementation Order

### Step-by-Step Execution

1. **Week 1: Infrastructure Setup**
   - [ ] Create `frontend/` directory with Next.js 14
   - [ ] Install all dependencies
   - [ ] Port Tailwind config and theme CSS
   - [ ] Set up path aliases and TypeScript config

2. **Week 2: Component Migration**
   - [ ] Copy all `ui/` components from shadcn
   - [ ] Port `ui-kit.tsx`, `data-table.tsx`, `charts.tsx`
   - [ ] Port `app-sidebar.tsx`, `top-bar.tsx`
   - [ ] Port `settings-provider.tsx`

3. **Week 3: API Layer**
   - [ ] Create `lib/api.ts` with all endpoints
   - [ ] Create React Query hooks in `hooks/use-api.ts`
   - [ ] Port `lib/format.ts` and `lib/utils.ts`
   - [ ] Set up WebSocket connection

4. **Week 4: Page Migration - Core**
   - [ ] Dashboard (`app/page.tsx`)
   - [ ] Strategies list (`app/strategies/page.tsx`)
   - [ ] Strategy detail (`app/strategies/[id]/page.tsx`)
   - [ ] Strategy builder (`app/strategies/new/page.tsx`)

5. **Week 5: Page Migration - Trading**
   - [ ] Positions (`app/positions/page.tsx`)
   - [ ] Orders (`app/orders/page.tsx`)
   - [ ] Brokers list (`app/brokers/page.tsx`)
   - [ ] Broker detail (`app/brokers/[id]/page.tsx`)

6. **Week 6: Page Migration - System**
   - [ ] Logs (`app/logs/page.tsx`)
   - [ ] Notifications (`app/notifications/page.tsx`)
   - [ ] Risk (`app/risk/page.tsx`)
   - [ ] Profile (`app/profile/page.tsx`)

7. **Week 7: Backend API Updates**
   - [ ] Create `routes/dashboard.py`
   - [ ] Create `routes/notifications.py`
   - [ ] Create `routes/profile.py`
   - [ ] Enhance existing routes with new fields

8. **Week 8: Database Migration**
   - [ ] Add new columns to existing tables
   - [ ] Create new tables (Notification, UserSession, etc.)
   - [ ] Run Alembic migration
   - [ ] Seed initial data

9. **Week 9: Integration & Testing**
   - [ ] Connect frontend to real APIs
   - [ ] Test all CRUD operations
   - [ ] Test WebSocket streaming
   - [ ] Fix styling issues

10. **Week 10: Polish & Deploy**
    - [ ] Performance optimization
    - [ ] Error handling
    - [ ] Loading states
    - [ ] Documentation

---

## Appendix: Type Definitions

### TypeScript Types (Frontend)

```typescript
// frontend/src/types/index.ts

export interface Strategy {
  id: string;
  name: string;
  description: string;
  segment: 'Equity Cash' | 'Futures' | 'Options';
  status: 'live' | 'paused' | 'backtest' | 'draft';
  brokers: string[];
  todayPnl: number;
  overallPnl: number;
  openPositions: number;
  capital: number;
  winRate: number;
  sharpe: number;
  maxDd: number;
  trades: number;
  lastSignal: string;
  mode: 'Live' | 'Paper' | 'Backtest';
  instruments: string[];
  entryRules: Rule[];
  exitRules: Rule[];
  risk: RiskConfig;
  sizing: SizingConfig;
  schedule: ScheduleConfig;
  webhook: boolean;
  spark: number[];
}

export interface Broker {
  id: string;
  name: string;
  code: string;
  status: 'connected' | 'disconnected' | 'token_expiring';
  apiKeyMasked: string;
  tokenExpiry: string;
  funds: number;
  marginUsed: number;
  marginAvailable: number;
  strategies: number;
  clientId: string;
  autoSquareOff: string;
  maxDailyLoss: number;
  maxMarginUtil: number;
  maxPositions: number;
  leverageCap: number;
}

export interface Position {
  id: string;
  symbol: string;
  segment: string;
  strategyId: string;
  brokerId: string;
  qty: number;
  avgPrice: number;
  ltp: number;
  unrealized: number;
  realized: number;
  dayChange: number;
  type: 'Intraday' | 'Carry Forward';
  side: 'BUY' | 'SELL';
  status: 'open' | 'closed';
}

export interface Order {
  id: string;
  time: string;
  symbol: string;
  segment: string;
  strategyId: string;
  brokerId: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  qty: number;
  price: number;
  avgFill: number;
  status: 'executed' | 'pending' | 'rejected' | 'cancelled';
  reason?: string;
  product: 'MIS' | 'NRML' | 'CNC';
  lifecycle: Array<{ t: string; label: string }>;
}

export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: 'strategy' | 'broker' | 'system' | 'order' | 'webhook';
  strategyId?: string;
  brokerId?: string;
  message: string;
}

export interface Notification {
  id: string;
  time: string;
  category: 'trade' | 'risk' | 'broker' | 'system';
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  body: string;
  read: boolean;
}

export interface DashboardTotals {
  portfolioValue: number;
  deployed: number;
  todayPnl: number;
  todayPnlPct: number;
  overallPnl: number;
  overallPnlPct: number;
  activeStrategies: number;
  totalStrategies: number;
  openPositions: number;
  winRate: number;
  maxDrawdown: number;
  marginAvailable: number;
  marginUsed: number;
  funds: number;
}
```

---

## Notes

- The frontend migration uses **Next.js 14** instead of TanStack Start (as per gotrading's existing documentation)
- All mock data imports will be replaced with React Query API calls
- The WebSocket connection replaces `useSimulatedLoad` for real-time updates
- Authentication will use existing PyJWT backend + Next.js middleware
