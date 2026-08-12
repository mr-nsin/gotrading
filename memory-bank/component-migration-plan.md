# Component Migration Plan: algo-desk-central → gotrading

**Created:** 2026-08-12  
**Status:** Phase 7-9 Pending  
**Priority:** Complete remaining UI/UX parity with algo-desk-central

---

## Executive Summary

This plan details the remaining component migration from `algo-desk-central` to `gotrading/frontend`. The initial migration (Phases 1-6) is complete. This document covers:

- **2 new pages** to create (Strategy Detail, Broker Detail)
- **6 pages** to enhance with missing features
- **1 major component** to port (StrategyBuilder)
- **20+ shadcn components** to add
- **5 domain components** to port/create

---

## Migration Phases

### Phase 7: shadcn/ui Component Library Expansion

**Goal:** Add missing shadcn components needed for full feature parity

#### 7.1 High-Priority Components (Required for Phases 8-9)

| Component | Source | Used By | Priority |
|-----------|--------|---------|----------|
| `sheet.tsx` | shadcn | Order detail panel, mobile nav | 🔴 Critical |
| `form.tsx` | shadcn | StrategyBuilder, Add Broker, Risk Settings | 🔴 Critical |
| `accordion.tsx` | shadcn | Positions grouping, Strategy config | 🔴 Critical |
| `checkbox.tsx` | shadcn | StrategyBuilder, Notifications matrix | 🔴 Critical |
| `popover.tsx` | shadcn | Date picker, dropdown filters | 🔴 Critical |
| `calendar.tsx` | shadcn | Backtest date range, Schedule config | 🔴 Critical |
| `slider.tsx` | shadcn | Risk settings, Position sizing | 🔴 Critical |
| `textarea.tsx` | shadcn | Strategy description, Notes | 🔴 Critical |
| `progress.tsx` | shadcn | Margin utilization bars | 🔴 Critical |
| `tooltip.tsx` | shadcn | KPI explanations, Chart tooltips | 🟡 Important |
| `separator.tsx` | shadcn | Section dividers | 🟡 Important |
| `drawer.tsx` | vaul | Mobile responsive panels | 🟡 Important |

#### 7.2 Medium-Priority Components

| Component | Source | Used By |
|-----------|--------|---------|
| `alert.tsx` | shadcn | Warning banners, Kill switch |
| `avatar.tsx` | shadcn | Profile page |
| `collapsible.tsx` | shadcn | Sidebar sections |
| `dropdown-menu.tsx` | shadcn | Row actions menu |
| `hover-card.tsx` | shadcn | Strategy/Broker quick preview |
| `toggle.tsx` | shadcn | View toggles |
| `toggle-group.tsx` | shadcn | Chart range selector |

#### 7.3 Lower-Priority Components

| Component | Source | Used By |
|-----------|--------|---------|
| `breadcrumb.tsx` | shadcn | Detail page navigation |
| `pagination.tsx` | shadcn | Large table pagination |
| `radio-group.tsx` | shadcn | Single-select options |
| `resizable.tsx` | shadcn | Panel resizing |
| `context-menu.tsx` | shadcn | Right-click actions |
| `menubar.tsx` | shadcn | Advanced menus |
| `navigation-menu.tsx` | shadcn | Sub-navigation |
| `input-otp.tsx` | shadcn | 2FA setup |

#### 7.4 Implementation Steps

```bash
# Run from gotrading/frontend directory
npx shadcn@latest add sheet form accordion checkbox popover calendar slider textarea progress tooltip separator

# For vaul drawer
npm install vaul
npx shadcn@latest add drawer

# Remaining components
npx shadcn@latest add alert avatar collapsible dropdown-menu hover-card toggle toggle-group breadcrumb pagination radio-group
```

**Files to create:**
```
gotrading/frontend/src/components/ui/
├── sheet.tsx
├── form.tsx
├── accordion.tsx
├── checkbox.tsx
├── popover.tsx
├── calendar.tsx
├── slider.tsx
├── textarea.tsx
├── progress.tsx
├── tooltip.tsx
├── separator.tsx
├── drawer.tsx
├── alert.tsx
├── avatar.tsx
├── collapsible.tsx
├── dropdown-menu.tsx
├── hover-card.tsx
├── toggle.tsx
├── toggle-group.tsx
├── breadcrumb.tsx
├── pagination.tsx
├── radio-group.tsx
├── resizable.tsx
├── context-menu.tsx
├── menubar.tsx
├── navigation-menu.tsx
└── input-otp.tsx
```

---

### Phase 8: New Pages & Major Components

#### 8.1 Strategy Detail Page (`/strategies/[id]`)

**Source:** `algo-desk-central/src/routes/strategies.$strategyId.tsx`  
**Target:** `gotrading/frontend/src/app/strategies/[id]/page.tsx`

**Sub-components to create:**

| Component | File | Description |
|-----------|------|-------------|
| `StrategyOverviewTab` | `strategy-overview-tab.tsx` | 6 KPIs + equity curve + candle chart |
| `StrategyPositionsTab` | `strategy-positions-tab.tsx` | Filtered positions table |
| `StrategyOrdersTab` | `strategy-orders-tab.tsx` | Filtered order history |
| `StrategyPnlTab` | `strategy-pnl-tab.tsx` | Daily P&L bar chart + trade log |
| `StrategyConfigTab` | `strategy-config-tab.tsx` | StrategyBuilder + version history |
| `StrategyLogsTab` | `strategy-logs-tab.tsx` | Filtered execution logs |
| `CandleChart` | `candle-chart.tsx` | OHLC candlestick visualization |
| `VersionTimeline` | `version-timeline.tsx` | Config version history |

**Page Structure:**
```tsx
// app/strategies/[id]/page.tsx
export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  const { data: strategy, isLoading } = useStrategy(params.id);
  
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={strategy?.name}
        description={strategy?.description}
        actions={<StrategyActions strategy={strategy} />}
      />
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <StrategyOverviewTab strategyId={params.id} />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

**API Hooks Required:**
```typescript
// hooks/use-strategy-detail.ts
export function useStrategyEquityCurve(id: string, range: string);
export function useStrategyPositions(id: string);
export function useStrategyOrders(id: string);
export function useStrategyPnlHistory(id: string);
export function useStrategyVersions(id: string);
export function useStrategyLogs(id: string);
```

**Backend Endpoints Required:**
```python
GET /api/v1/strategies/{id}/equity-curve?range={1D|1W|1M|3M}
GET /api/v1/strategies/{id}/positions
GET /api/v1/strategies/{id}/orders
GET /api/v1/strategies/{id}/pnl-history
GET /api/v1/strategies/{id}/versions
GET /api/v1/strategies/{id}/logs
```

---

#### 8.2 Strategy Builder Component

**Source:** `algo-desk-central/src/components/strategy-builder.tsx`  
**Target:** `gotrading/frontend/src/components/strategy-builder.tsx`

**This is the most complex component to migrate.** It includes:

##### 8.2.1 Sub-components

| Component | Description |
|-----------|-------------|
| `RuleBuilder` | Visual AND/OR logic group builder |
| `ConditionBlock` | Single indicator condition (indicator + operator + value) |
| `IndicatorSelect` | Dropdown with 13 technical indicators |
| `OperatorSelect` | Comparison operators (>, <, =, crosses above, etc.) |
| `OptionsConfig` | CE/PE, strike selection, expiry config |
| `SizingConfig` | Position sizing (fixed qty, % capital, lot-based) |
| `RiskConfig` | SL, target, trailing SL, max trades/day |
| `BrokerAssignment` | Multi-select broker assignment |
| `ScheduleConfig` | Trading hours, weekday selection |
| `WebhookToggle` | Enable/disable webhook signals |

##### 8.2.2 Indicator Library

```typescript
const INDICATORS = [
  { id: 'rsi', name: 'RSI', params: ['period', 'overbought', 'oversold'] },
  { id: 'ema_crossover', name: 'EMA Crossover', params: ['fast_period', 'slow_period'] },
  { id: 'sma_crossover', name: 'SMA Crossover', params: ['fast_period', 'slow_period'] },
  { id: 'macd', name: 'MACD', params: ['fast', 'slow', 'signal'] },
  { id: 'bollinger', name: 'Bollinger Bands', params: ['period', 'std_dev'] },
  { id: 'supertrend', name: 'Supertrend', params: ['period', 'multiplier'] },
  { id: 'vwap', name: 'VWAP', params: [] },
  { id: 'atr', name: 'ATR', params: ['period'] },
  { id: 'adx', name: 'ADX', params: ['period'] },
  { id: 'stochastic', name: 'Stochastic', params: ['k_period', 'd_period'] },
  { id: 'cci', name: 'CCI', params: ['period'] },
  { id: 'obv', name: 'OBV', params: [] },
  { id: 'candle_pattern', name: 'Candle Pattern', params: ['pattern'] },
];
```

##### 8.2.3 Rule Structure

```typescript
interface Rule {
  id: string;
  type: 'entry' | 'exit';
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

interface Condition {
  id: string;
  indicator: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'crosses_above' | 'crosses_below';
  value: number | string;
  params: Record<string, number>;
}

interface StrategyConfig {
  name: string;
  description: string;
  segment: 'Equity Cash' | 'Futures' | 'Options';
  instruments: string[];
  entryRules: Rule[];
  exitRules: Rule[];
  optionsConfig?: {
    optionType: 'CE' | 'PE' | 'both';
    strikeSelection: 'ATM' | 'OTM1' | 'OTM2' | 'ITM1' | 'delta' | 'premium';
    expiryPreference: 'current_week' | 'next_week' | 'current_month';
  };
  sizing: {
    type: 'fixed_qty' | 'pct_capital' | 'lot_based';
    value: number;
    maxPositions: number;
  };
  risk: {
    stopLoss: number;
    stopLossType: 'points' | 'percent';
    target: number;
    targetType: 'points' | 'percent';
    trailingSL: boolean;
    trailingSLValue: number;
    maxTradesPerDay: number;
    maxLossPerDay: number;
    cooldownMinutes: number;
  };
  schedule: {
    startTime: string;
    endTime: string;
    days: string[];
    autoSquareOff: string;
  };
  brokers: string[];
  webhookEnabled: boolean;
}
```

##### 8.2.4 Implementation Approach

1. **Port component structure** from algo-desk-central
2. **Adapt imports** for Next.js (remove TanStack Router specifics)
3. **Connect to API** - replace mock data with `useCreateStrategy` / `useUpdateStrategy`
4. **Add form validation** using react-hook-form + zod

---

#### 8.3 Broker Detail Page (`/brokers/[id]`)

**Source:** `algo-desk-central/src/routes/brokers.$brokerId.tsx`  
**Target:** `gotrading/frontend/src/app/brokers/[id]/page.tsx`

**Features:**
- 6 KPI cards (Funds, Margin Used, Margin Available, Utilization %, Strategies, Open Positions)
- 30-session margin utilization chart
- Linked strategies list with status and P&L
- Broker-scoped order history
- Broker-scoped positions
- Re-authenticate button
- Per-broker risk settings

**Page Structure:**
```tsx
// app/brokers/[id]/page.tsx
export default function BrokerDetailPage({ params }: { params: { id: string } }) {
  const { data: broker } = useBroker(params.id);
  
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={broker?.name}
        description={`Client ID: ${broker?.clientId}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReauth}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-authenticate
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        }
      />
      
      {/* 6 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard title="Funds" value={broker?.funds} format="currency" />
        <KpiCard title="Margin Used" value={broker?.marginUsed} format="currency" />
        {/* ... */}
      </div>
      
      {/* Margin Chart */}
      <Panel title="Margin Utilization (30 Days)">
        <MarginChart brokerId={params.id} />
      </Panel>
      
      {/* Linked Strategies */}
      <Panel title="Linked Strategies">
        <BrokerStrategiesTable brokerId={params.id} />
      </Panel>
      
      {/* Orders & Positions */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

**API Hooks Required:**
```typescript
export function useBroker(id: string);
export function useBrokerMarginHistory(id: string);
export function useBrokerStrategies(id: string);
export function useBrokerOrders(id: string);
export function useBrokerPositions(id: string);
export function useReauthenticateBroker();
export function useDisconnectBroker();
```

**Backend Endpoints Required:**
```python
GET /api/v1/brokers/{id}
GET /api/v1/brokers/{id}/margin-history
GET /api/v1/brokers/{id}/strategies
GET /api/v1/brokers/{id}/orders
GET /api/v1/brokers/{id}/positions
POST /api/v1/brokers/{id}/reauthenticate
DELETE /api/v1/brokers/{id}
```

---

#### 8.4 Add Broker Dialog

**Source:** `algo-desk-central/src/routes/brokers.index.tsx` (dialog section)  
**Target:** `gotrading/frontend/src/components/add-broker-dialog.tsx`

**Features:**
- Broker type selection (8 brokers: Zerodha, Upstox, Angel One, Fyers, Dhan, Alice Blue, 5paisa, Kotak Neo)
- API credentials form (API Key, API Secret, Access Token)
- Test connection button
- Connect button

```tsx
interface AddBrokerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BROKER_TYPES = [
  { id: 'KITE', name: 'Zerodha Kite', logo: '/brokers/zerodha.svg' },
  { id: 'UPX', name: 'Upstox', logo: '/brokers/upstox.svg' },
  { id: 'SMARTAPI', name: 'Angel One', logo: '/brokers/angelone.svg' },
  { id: 'FYERS', name: 'Fyers', logo: '/brokers/fyers.svg' },
  { id: 'DHAN', name: 'Dhan', logo: '/brokers/dhan.svg' },
  { id: 'ALICE', name: 'Alice Blue', logo: '/brokers/aliceblue.svg' },
  { id: '5PAISA', name: '5paisa', logo: '/brokers/5paisa.svg' },
  { id: 'KOTAK', name: 'Kotak Neo', logo: '/brokers/kotak.svg' },
];

export function AddBrokerDialog({ open, onOpenChange }: AddBrokerDialogProps) {
  const [step, setStep] = useState<'select' | 'credentials'>('select');
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  // Form fields
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  
  const addBroker = useAddBroker();
  const testBroker = useTestBrokerConnection();
  
  // ... implementation
}
```

---

### Phase 9: Page Enhancements

#### 9.1 Risk Settings Page Enhancement

**Current:** Read-only display of risk limits  
**Target:** Full editable form with per-broker tabs

**Features to Add:**
- Editable global risk fields
- Per-broker risk sub-tabs
- Auto square-off time picker
- Volatility pause rules
- Kill switch with confirmation dialog

**Component Structure:**
```tsx
// app/risk/page.tsx
<Tabs defaultValue="global">
  <TabsList>
    <TabsTrigger value="global">Global Settings</TabsTrigger>
    {brokers.map(broker => (
      <TabsTrigger key={broker.id} value={broker.id}>
        {broker.name}
      </TabsTrigger>
    ))}
  </TabsList>
  
  <TabsContent value="global">
    <GlobalRiskForm />
  </TabsContent>
  
  {brokers.map(broker => (
    <TabsContent key={broker.id} value={broker.id}>
      <BrokerRiskForm brokerId={broker.id} />
    </TabsContent>
  ))}
</Tabs>
```

**Form Fields (Global):**
| Field | Type | Description |
|-------|------|-------------|
| `maxDailyLoss` | number + toggle (₹/%) | Maximum daily loss limit |
| `maxCapitalDeployment` | slider (%) | Max % of capital to deploy |
| `maxConcurrentPositions` | number | Maximum open positions |
| `maxOrderValue` | number (₹) | Maximum single order value |
| `maxPerTradeLoss` | number (₹) | Maximum loss per trade |
| `autoKillSwitch` | toggle | Auto-trigger kill switch on breach |
| `circuitBreaker` | toggle + number | VIX-based circuit breaker |
| `blockEntriesAfter` | time | Block new entries after time |

**Form Fields (Per-Broker):**
| Field | Type | Description |
|-------|------|-------------|
| `maxDailyLoss` | number (₹) | Broker-specific daily loss |
| `maxMarginUtil` | slider (%) | Maximum margin utilization |
| `maxPositions` | number | Maximum positions for this broker |
| `autoSquareOffTime` | time | Auto square-off time |
| `leverageCap` | number | Maximum leverage |
| `maxExposure` | number (₹) | Maximum exposure |

---

#### 9.2 Notifications Page Enhancement

**Current:** Basic notification feed  
**Target:** Feed + channel matrix + alert rules

**Features to Add:**
- 5-channel delivery matrix (In-app, Email, Telegram, SMS, Push)
- 6 event category toggles (Trades, Risk Alerts, Broker Status, Orders, System, Webhooks)
- Alert threshold rules (daily loss %, margin util %)
- Broker disconnect notification toggle
- Order rejection notification toggle

**Component Structure:**
```tsx
// app/notifications/page.tsx
<Tabs defaultValue="feed">
  <TabsList>
    <TabsTrigger value="feed">Notifications</TabsTrigger>
    <TabsTrigger value="channels">Channel Settings</TabsTrigger>
    <TabsTrigger value="rules">Alert Rules</TabsTrigger>
  </TabsList>
  
  <TabsContent value="feed">
    <NotificationFeed />
  </TabsContent>
  
  <TabsContent value="channels">
    <ChannelMatrix />
  </TabsContent>
  
  <TabsContent value="rules">
    <AlertRulesForm />
  </TabsContent>
</Tabs>
```

**Channel Matrix Component:**
```tsx
// components/channel-matrix.tsx
const CHANNELS = ['in_app', 'email', 'telegram', 'sms', 'push'];
const CATEGORIES = ['trades', 'risk', 'broker', 'orders', 'system', 'webhooks'];

export function ChannelMatrix() {
  const { data: settings, mutate } = useNotificationSettings();
  
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th></th>
          {CHANNELS.map(ch => <th key={ch}>{formatChannelName(ch)}</th>)}
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map(cat => (
          <tr key={cat}>
            <td>{formatCategoryName(cat)}</td>
            {CHANNELS.map(ch => (
              <td key={ch}>
                <Checkbox 
                  checked={settings?.[cat]?.[ch]}
                  onCheckedChange={(checked) => mutate({ [cat]: { [ch]: checked } })}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

#### 9.3 Profile Page Enhancement

**Current:** Display-only profile info  
**Target:** Editable profile with security features

**Features to Add:**
- Editable account form (Name, Email, Mobile, PAN)
- Password change dialog
- 2FA setup (TOTP via authenticator app)
- Preferences editing (Theme, Currency format, Timezone)
- API usage statistics

**Component Structure:**
```tsx
// app/profile/page.tsx
<div className="grid gap-6 lg:grid-cols-2">
  {/* Account Info */}
  <Panel title="Account Information">
    <AccountForm />
  </Panel>
  
  {/* Preferences */}
  <Panel title="Preferences">
    <PreferencesForm />
  </Panel>
  
  {/* Security */}
  <Panel title="Security">
    <div className="space-y-4">
      <PasswordChangeSection />
      <TwoFactorSection />
    </div>
  </Panel>
  
  {/* Sessions */}
  <Panel title="Active Sessions">
    <SessionsList />
  </Panel>
  
  {/* API Usage (if applicable) */}
  <Panel title="API Usage">
    <ApiUsageStats />
  </Panel>
</div>
```

---

#### 9.4 Orderbook Page Enhancement

**Current:** Basic order table  
**Target:** Table with row-click detail sheet

**Features to Add:**
- Row click opens Sheet with order details
- Order lifecycle timeline visualization
- Rejection reason display
- Copy order ID button

**Sheet Component:**
```tsx
// components/order-detail-sheet.tsx
export function OrderDetailSheet({ order, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Order #{order.id.slice(0, 8)}</SheetTitle>
          <SheetDescription>{order.symbol} • {order.side}</SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-4">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Type" value={order.type} />
            <DetailRow label="Product" value={order.product} />
            <DetailRow label="Quantity" value={order.qty} />
            <DetailRow label="Price" value={formatCurrency(order.price)} />
            <DetailRow label="Avg Fill" value={formatCurrency(order.avgFill)} />
            <DetailRow label="Status" value={<StatusPill status={order.status} />} />
          </div>
          
          {/* Rejection Reason */}
          {order.reason && (
            <Alert variant="destructive">
              <AlertDescription>{order.reason}</AlertDescription>
            </Alert>
          )}
          
          {/* Order Lifecycle Timeline */}
          <div className="space-y-2">
            <h4 className="font-medium">Order Lifecycle</h4>
            <OrderTimeline events={order.lifecycle} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Timeline Component:**
```tsx
// components/order-timeline.tsx
export function OrderTimeline({ events }: { events: Array<{ t: string; label: string }> }) {
  return (
    <div className="relative pl-6 space-y-4">
      {events.map((event, i) => (
        <div key={i} className="relative">
          {/* Timeline line */}
          {i < events.length - 1 && (
            <div className="absolute left-[-20px] top-4 w-0.5 h-full bg-border" />
          )}
          {/* Timeline dot */}
          <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-primary" />
          {/* Event content */}
          <div>
            <p className="text-sm font-medium">{event.label}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(event.t)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

#### 9.5 Positions Page Enhancement

**Current:** Basic positions table  
**Target:** Grouped by strategy with accordion

**Features to Add:**
- Accordion grouping by strategy
- Group subtotals (position count, unrealized P&L)
- Bulk selection checkbox
- Bulk square-off action

**Component Update:**
```tsx
// app/positions/page.tsx
export default function PositionsPage() {
  const { data: positions } = usePositions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupByStrategy, setGroupByStrategy] = useState(true);
  
  const groupedPositions = useMemo(() => {
    if (!groupByStrategy) return { ungrouped: positions };
    return groupBy(positions, 'strategyId');
  }, [positions, groupByStrategy]);
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header with toggle */}
      <div className="flex justify-between items-center">
        <PageHeader title="Positions" />
        <div className="flex gap-2">
          <Toggle 
            pressed={groupByStrategy} 
            onPressedChange={setGroupByStrategy}
          >
            Group by Strategy
          </Toggle>
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkSquareOff}>
              Square Off ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>
      
      {/* Grouped Accordion View */}
      {groupByStrategy ? (
        <Accordion type="multiple" defaultValue={Object.keys(groupedPositions)}>
          {Object.entries(groupedPositions).map(([strategyId, positions]) => (
            <AccordionItem key={strategyId} value={strategyId}>
              <AccordionTrigger>
                <div className="flex justify-between w-full pr-4">
                  <span>{getStrategyName(strategyId)}</span>
                  <span className={cn("text-sm", getPnlColor(sumPnl(positions)))}>
                    {positions.length} positions • {formatCurrency(sumPnl(positions))}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <PositionsTable 
                  positions={positions}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <PositionsTable 
          positions={positions}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}
    </div>
  );
}
```

---

#### 9.6 CandleChart Component

**Source:** `algo-desk-central/src/components/charts.tsx` (CandleChart section)  
**Target:** `gotrading/frontend/src/components/candle-chart.tsx`

```tsx
// components/candle-chart.tsx
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandleChartProps {
  data: CandleData[];
  height?: number;
}

export function CandleChart({ data, height = 400 }: CandleChartProps) {
  // Transform data for candlestick visualization
  const chartData = data.map(d => ({
    ...d,
    // Body of candle (open to close)
    body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    // Wick (low to high)
    wick: [d.low, d.high],
    // Color based on price movement
    fill: d.close >= d.open ? 'var(--profit)' : 'var(--loss)',
  }));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData}>
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis 
          domain={['auto', 'auto']}
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickFormatter={(v) => v.toLocaleString('en-IN')}
        />
        <Tooltip content={<CandleTooltip />} />
        
        {/* Wicks (high-low lines) */}
        <Bar 
          dataKey="wick" 
          fill="currentColor" 
          barSize={1}
        />
        
        {/* Bodies (open-close rectangles) */}
        <Bar 
          dataKey="body" 
          barSize={8}
          shape={<CandleBody />}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Custom candle body shape
function CandleBody(props: any) {
  const { x, y, width, height, fill } = props;
  return (
    <rect 
      x={x} 
      y={y} 
      width={width} 
      height={Math.max(height, 1)} 
      fill={fill}
      rx={1}
    />
  );
}
```

---

## Implementation Schedule

### Week 1: shadcn Component Installation
- [ ] Install all Phase 7 components via shadcn CLI
- [ ] Verify component rendering
- [ ] Add any custom styling overrides

### Week 2: Strategy Detail Page
- [ ] Create page route and layout
- [ ] Port StrategyOverviewTab
- [ ] Port StrategyPositionsTab
- [ ] Port StrategyOrdersTab

### Week 3: Strategy Detail Page (continued)
- [ ] Port StrategyPnlTab
- [ ] Port StrategyConfigTab
- [ ] Port StrategyLogsTab
- [ ] Create CandleChart component
- [ ] Create VersionTimeline component

### Week 4: Strategy Builder
- [ ] Port main StrategyBuilder component
- [ ] Port RuleBuilder sub-component
- [ ] Port ConditionBlock sub-component
- [ ] Port indicator/operator selects
- [ ] Port options config section

### Week 5: Strategy Builder (continued)
- [ ] Port sizing config section
- [ ] Port risk config section
- [ ] Port schedule config section
- [ ] Connect to API (create/update mutations)
- [ ] Add form validation

### Week 6: Broker Detail Page
- [ ] Create page route and layout
- [ ] Port KPI cards section
- [ ] Create MarginChart component
- [ ] Port BrokerStrategiesTable
- [ ] Port broker-scoped orders/positions

### Week 7: Add Broker Dialog
- [ ] Create AddBrokerDialog component
- [ ] Implement broker type selection
- [ ] Implement credentials form
- [ ] Add test connection flow
- [ ] Connect to API

### Week 8: Page Enhancements
- [ ] Enhance Risk Settings page (editable forms, per-broker tabs)
- [ ] Enhance Notifications page (channel matrix, alert rules)
- [ ] Enhance Profile page (editing, password, 2FA)

### Week 9: Page Enhancements (continued)
- [ ] Enhance Orderbook page (Sheet detail, timeline)
- [ ] Enhance Positions page (accordion grouping, bulk selection)
- [ ] Add missing backend endpoints

### Week 10: Polish & Testing
- [ ] End-to-end testing of all new features
- [ ] Fix styling inconsistencies
- [ ] Performance optimization
- [ ] Documentation update

---

## File Checklist

### New Files to Create

```
gotrading/frontend/src/
├── app/
│   ├── strategies/
│   │   └── [id]/
│   │       └── page.tsx                    # Strategy detail page
│   └── brokers/
│       └── [id]/
│           └── page.tsx                    # Broker detail page
├── components/
│   ├── ui/
│   │   ├── sheet.tsx
│   │   ├── form.tsx
│   │   ├── accordion.tsx
│   │   ├── checkbox.tsx
│   │   ├── popover.tsx
│   │   ├── calendar.tsx
│   │   ├── slider.tsx
│   │   ├── textarea.tsx
│   │   ├── progress.tsx
│   │   ├── tooltip.tsx
│   │   ├── separator.tsx
│   │   ├── drawer.tsx
│   │   ├── alert.tsx
│   │   ├── avatar.tsx
│   │   ├── collapsible.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── hover-card.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   └── ... (remaining shadcn)
│   ├── strategy-builder.tsx                # Full strategy builder
│   ├── strategy-overview-tab.tsx
│   ├── strategy-positions-tab.tsx
│   ├── strategy-orders-tab.tsx
│   ├── strategy-pnl-tab.tsx
│   ├── strategy-config-tab.tsx
│   ├── strategy-logs-tab.tsx
│   ├── candle-chart.tsx
│   ├── version-timeline.tsx
│   ├── add-broker-dialog.tsx
│   ├── order-detail-sheet.tsx
│   ├── order-timeline.tsx
│   ├── channel-matrix.tsx
│   ├── global-risk-form.tsx
│   ├── broker-risk-form.tsx
│   ├── account-form.tsx
│   ├── preferences-form.tsx
│   ├── password-change-dialog.tsx
│   └── two-factor-setup.tsx
└── hooks/
    ├── use-strategy-detail.ts              # Strategy detail hooks
    ├── use-broker-detail.ts                # Broker detail hooks
    └── use-notification-settings.ts        # Notification settings hooks
```

### Files to Modify

```
gotrading/frontend/src/
├── app/
│   ├── risk/page.tsx                       # Add editable forms
│   ├── notifications/page.tsx              # Add channel matrix
│   ├── profile/page.tsx                    # Add editing features
│   ├── orders/page.tsx                     # Add sheet detail
│   ├── positions/page.tsx                  # Add accordion grouping
│   └── brokers/page.tsx                    # Add dialog trigger
└── components/
    └── app-sidebar.tsx                     # Update nav links
```

### Backend Endpoints to Add

```python
# gotrading/backend/routes/
├── strategies.py                           # Add detail endpoints
│   ├── GET /{id}/equity-curve
│   ├── GET /{id}/positions
│   ├── GET /{id}/orders
│   ├── GET /{id}/pnl-history
│   ├── GET /{id}/versions
│   └── GET /{id}/logs
├── brokers.py                              # Add detail endpoints
│   ├── GET /{id}/margin-history
│   ├── GET /{id}/strategies
│   ├── GET /{id}/orders
│   ├── GET /{id}/positions
│   ├── POST /{id}/reauthenticate
│   └── DELETE /{id}
├── notifications.py                        # Add settings endpoints
│   ├── GET /settings
│   └── PUT /settings
└── profile.py                              # Add edit endpoints
    ├── PUT /
    ├── PUT /password
    └── POST /2fa/setup
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "vaul": "^0.9.0",
    "@hookform/resolvers": "^3.3.0",
    "react-hook-form": "^7.51.0",
    "date-fns": "^3.6.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4"
  }
}
```

---

## Success Criteria

- [ ] All 16 routes from algo-desk-central functional in gotrading
- [ ] StrategyBuilder creates strategies via API
- [ ] Strategy/Broker detail pages show live data
- [ ] Risk settings editable with per-broker tabs
- [ ] Notification channel matrix saves preferences
- [ ] Profile editing with password change works
- [ ] Order sheet shows lifecycle timeline
- [ ] Positions page supports accordion grouping
- [ ] No console errors or TypeScript errors
- [ ] Mobile responsive on all new pages
