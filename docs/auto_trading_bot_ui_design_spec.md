# Auto Trading Bot — UI Design Specification
## Target Market: India | Multi-Broker | Multi-Strategy
### Prepared for: Antigravity Design Team

---

## 1. Design Philosophy & Visual Language

### 1.1 Core Principles
- **Institutional Trust, Retail Simplicity**: The UI must feel like a professional trading terminal but remain accessible to retail traders.
- **Data Density with Clarity**: High information density is expected, but never at the cost of readability.
- **Action-First Design**: Every screen should make the primary action (Start/Stop/Monitor) immediately obvious.
- **Dark Mode Default**: Trading environments demand reduced eye strain. Dark theme as default, light theme optional.

### 1.2 Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0B0F19` | Main background |
| `--bg-secondary` | `#111827` | Cards, panels |
| `--bg-elevated` | `#1A2234` | Modals, dropdowns |
| `--border-subtle` | `#1E293B` | Dividers, borders |
| `--border-active` | `#334155` | Hover states |
| `--text-primary` | `#F1F5F9` | Headlines, key data |
| `--text-secondary` | `#94A3B8` | Labels, descriptions |
| `--text-muted` | `#475569` | Timestamps, inactive |
| `--accent-green` | `#10B981` | Profits, active, buy, start |
| `--accent-red` | `#EF4444` | Losses, sell, stop, errors |
| `--accent-blue` | `#3B82F6` | Primary actions, links |
| `--accent-amber` | `#F59E0B` | Warnings, pending states |
| `--accent-purple` | `#8B5CF6` | Strategy badges, premium |

### 1.3 Typography
- **Font Family**: `Inter` or `Geist` (modern, excellent number rendering)
- **Scale**:
  - Display: `32px/700` — Portfolio Value, Total P&L
  - H1: `24px/600` — Section headers
  - H2: `18px/600` — Card titles
  - Body: `14px/400` — Standard text
  - Caption: `12px/500` — Labels, timestamps
  - Mono: `13px/500` — Prices, quantities (use `JetBrains Mono` or `Geist Mono`)

### 1.4 Spacing & Layout
- **Grid**: 12-column, 24px gutter
- **Border Radius**: `8px` for cards, `6px` for buttons, `4px` for inputs
- **Shadows**: Subtle elevation — `0 4px 24px rgba(0,0,0,0.25)` for modals
- **Transitions**: `150ms ease` for all interactive elements

---

## 2. Page Structure & Navigation

### 2.1 Global Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Strategies  Brokers  Orders  Logs  [Profile] │  ← Top Nav (64px)
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │              Main Content Area                   │
│ (240px)  │         (Adaptive, min-width 1024px)           │
│          │                                                  │
│  • Portfolio  │                                              │
│  • Positions  │                                              │
│  • Alerts     │                                              │
│  • Settings   │                                              │
│  • API Status │                                              │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### 2.2 Navigation Items
| Route | Icon | Description |
|-------|------|-------------|
| `/dashboard` | `LayoutDashboard` | Overview of all strategies & brokers |
| `/strategies` | `Zap` | Strategy management, creation, backtesting |
| `/brokers` | `Building2` | Broker configuration & API keys |
| `/orders` | `ListOrdered` | Order history, pending orders |
| `/positions` | `BarChart3` | Live positions across all brokers |
| `/logs` | `ScrollText` | System logs, trade logs, errors |
| `/settings` | `Settings` | User preferences, risk limits, notifications |

---

## 3. Core Pages & Components

### 3.1 Dashboard (`/dashboard`)
**Purpose**: Single-pane-of-glass view for the entire trading operation.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  Portfolio Overview Cards (4-col grid)                       │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ Total AUM   │ Today's P&L │ Active Bots │ Win Rate        │
│ ₹45,23,000  │ +₹12,400    │ 7 Running   │ 68.4%           │
│ +2.3%       │ +1.2%       │ 3 Paused    │ 142 trades      │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│                                                              │
│  [Strategy Performance Chart — Area/Line]                   │
│                                                              │
├─────────────────────────────┬───────────────────────────────┤
│  Active Strategies Table    │  Broker Health Status           │
│  (Sortable, filterable)   │  (Connection + P&L per broker)│
├─────────────────────────────┴───────────────────────────────┤
│  Recent Orders + Alerts Ticker                               │
└─────────────────────────────────────────────────────────────┘
```

#### Key Components:
- **Portfolio Overview Cards**: Large numbers with sparklines. Green/red delta indicators.
- **Strategy Performance Chart**: Time-series chart showing cumulative P&L per strategy. Toggle: Daily/Weekly/Monthly.
- **Active Strategies Table**:
  | Column | Description |
  |--------|-------------|
  | Strategy Name | Name + badge (Intraday/Swing/Options) |
  | Status | `● Running` / `● Paused` / `● Error` |
  | Broker | Broker icon + name |
  | Capital Deployed | ₹ amount |
  | Today's P&L | ₹ amount + % |
  | Win Rate | % + total trades |
  | Actions | Start/Stop/Edit/Delete icons |
- **Broker Health Status**: Cards per broker showing:
  - Connection status (green dot + "Connected" / red + "Disconnected")
  - API latency (ms)
  - Today's orders placed
  - Account balance
  - Error count (if any)

---

### 3.2 Strategies Page (`/strategies`)
**Purpose**: Full strategy lifecycle management — create, configure, backtest, deploy.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Create Strategy]  [Import Strategy]  [Strategy Store]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Strategy │ │ Strategy │ │ Strategy │ │ Strategy │       │
│  │ Card 1   │ │ Card 2   │ │ Card 3   │ │ Card 4   │       │
│  │ [Run]    │ │ [Run]    │ │ [Run]    │ │ [Run]    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  Strategy Detail Panel (opens on click)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Strategy: Intraday Momentum (NIFTY)                    │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┐        │ │
│  │  │ Overview │ Backtest │ Settings │ Logs     │        │ │
│  │  └──────────┴──────────┴──────────┴──────────┘        │ │
│  │                                                         │ │
│  │  [Tab Content Area]                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Strategy Card Design:
```
┌─────────────────────────────────────┐
│  🔵 Intraday Momentum              │
│  NIFTY 50 · ZERODHA               │
│                                     │
│  Capital: ₹5,00,000                │
│  Today's P&L: +₹3,200 (+0.64%)     │
│  Win Rate: 72% (18/25 trades)      │
│                                     │
│  [▶ Start] [⏸ Pause] [⚙ Edit]    │
│  [📊 Backtest] [🗑 Delete]         │
└─────────────────────────────────────┘
```

#### Strategy Detail Tabs:

**Overview Tab:**
- Performance metrics: Total Return, Max Drawdown, Sharpe Ratio, Sortino Ratio
- Equity curve chart
- Trade distribution (win/loss pie chart)
- Monthly returns heatmap

**Backtest Tab:**
- Date range picker
- Backtest results: Total Return, Annualized Return, Max Drawdown, Win Rate
- Backtest vs Live comparison chart
- Trade list with entry/exit points

**Settings Tab:**
- Strategy parameters (editable form)
- Risk management settings:
  - Max position size (% of capital)
  - Stop Loss (% or absolute)
  - Target Profit (% or absolute)
  - Max daily loss limit
  - Max open positions
- Broker assignment dropdown
- Schedule: Active hours (e.g., 9:15 AM — 3:15 PM IST)
- Days of week selector

---

### 3.3 Broker Configuration Page (`/brokers`)
**Purpose**: Add, manage, and monitor multiple broker API connections.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Add Broker]                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦 ZERODHA                                         │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Status: ● Connected  |  Latency: 45ms              │   │
│  │  Account: AB1234  |  Balance: ₹12,45,000          │   │
│  │  Today's Orders: 24  |  Errors: 0                  │   │
│  │                                                     │   │
│  │  [🔑 Manage API Keys] [📊 View Details] [🗑 Remove]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦 UPSTOX                                          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Status: ● Disconnected  |  Last Error: API timeout │   │
│  │  Account: UX5678  |  Balance: --                  │   │
│  │  Today's Orders: 0  |  Errors: 3                   │   │
│  │                                                     │   │
│  │  [🔑 Manage API Keys] [🔄 Reconnect] [🗑 Remove]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Add Broker Modal:
```
┌─────────────────────────────────────────┐
│  Add New Broker                         │
│  ─────────────────────────────────────  │
│                                         │
│  Select Broker:                         │
│  [ZERODHA ▼] [UPSTOX ▼] [FYERS ▼]     │
│  [ANGEL ONE ▼] [ALICE BLUE ▼] [5PAISA ▼]│
│                                         │
│  API Key:     [________________]        │
│  API Secret:  [________________]        │
│  Redirect URL:[________________]        │
│                                         │
│  [Test Connection]                      │
│                                         │
│  [Cancel]        [Save & Connect]       │
└─────────────────────────────────────────┘
```

#### Supported Indian Brokers (Initial):
| Broker | API Type | Auth Method |
|--------|----------|-------------|
| Zerodha (Kite) | REST + WebSocket | API Key + Secret + TOTP |
| Upstox | REST + WebSocket | OAuth 2.0 |
| Fyers | REST + WebSocket | API Key + Secret + PIN |
| Angel One | REST + WebSocket | API Key + Client ID + PIN |
| Alice Blue | REST | API Key + Secret |
| 5paisa | REST | API Key + Client ID + Password |
| Dhan | REST + WebSocket | Access Token |
| Fyers One | REST | API Key + Secret |

---

### 3.4 Orders Page (`/orders`)
**Purpose**: Unified order book across all brokers and strategies.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [All Orders] [Pending] [Executed] [Rejected] [Cancelled] │
├─────────────────────────────────────────────────────────────┤
│  Filter: [Broker ▼] [Strategy ▼] [Symbol ▼] [Date Range]  │
├─────────────────────────────────────────────────────────────┤
│  Order Table                                                │
│  ─────────────────────────────────────────────────────────  │
│  Time     | Symbol  | Type | Qty | Price | Status | Broker │
│  09:45:12 | NIFTY   | BUY  | 50  | 22450 | FILLED | ZERODHA│
│  09:47:33 | BANKNIFTY| SELL| 25  | 47800 | PENDING| UPSTOX │
│  09:52:01 | RELIANCE| BUY  | 100 | 2850  | REJECTED| FYERS│
└─────────────────────────────────────────────────────────────┘
```

#### Order Status Badges:
| Status | Color | Icon |
|--------|-------|------|
| PENDING | Amber | `Clock` |
| OPEN | Blue | `Circle` |
| FILLED | Green | `CheckCircle` |
| PARTIALLY_FILLED | Blue | `CircleDashed` |
| REJECTED | Red | `XCircle` |
| CANCELLED | Gray | `Ban` |
| EXPIRED | Gray | `TimerOff` |

---

### 3.5 Positions Page (`/positions`)
**Purpose**: Real-time view of all open positions across brokers.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  Open Positions: 7  |  Total MTM: +₹8,450 (+1.2%)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Position Cards (Grid Layout)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NIFTY 24JUL CE 22500                              │   │
│  │  Qty: 50  |  Avg: ₹245  |  LTP: ₹267               │   │
│  │  MTM: +₹1,100 (+8.9%)                              │   │
│  │  Broker: ZERODHA  |  Strategy: Intraday Momentum   │   │
│  │  [🔒 Square Off] [📈 Chart] [⚙ Modify SL]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.6 Logs & Alerts Page (`/logs`)
**Purpose**: System health, trade logs, errors, and notifications.

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [System Logs] [Trade Logs] [Errors] [Alerts]               │
├─────────────────────────────────────────────────────────────┤
│  Search: [________________]  Level: [All ▼]  Broker: [All ▼]│
├─────────────────────────────────────────────────────────────┤
│  Log Stream (Real-time, auto-scroll)                        │
│  ─────────────────────────────────────────────────────────  │
│  [09:45:12] [INFO] Strategy "Intraday Momentum" started    │
│  [09:45:13] [TRADE] BUY NIFTY 50 @ 22450 (Zerodha)         │
│  [09:47:33] [WARN] High latency detected on Upstox (320ms)  │
│  [09:52:01] [ERROR] Order rejected: Insufficient margin   │
│  [09:52:01] [ALERT] Daily loss limit reached for Strategy X│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Essential UI Components

### 4.1 Start/Stop Controls (CRITICAL)
Every strategy card and the global dashboard must have prominent Start/Stop controls.

```
┌─────────────────────────────────────┐
│  Global Controls (Dashboard Header)   │
│  [▶ START ALL] [⏸ PAUSE ALL]        │
│  [🛑 EMERGENCY STOP ALL]             │
└─────────────────────────────────────┘

Per-Strategy:
┌─────────────────────────────────────┐
│  [▶ START]  — Green, filled button   │
│  [⏸ PAUSE] — Amber, outlined       │
│  [🛑 STOP]  — Red, filled button     │
└─────────────────────────────────────┘
```

**Behavior:**
- **Start**: Validates broker connection → Checks margin → Starts strategy loop
- **Pause**: Halts new entries, keeps existing positions open
- **Stop**: Halts new entries, optionally squares off open positions (configurable)
- **Emergency Stop**: Immediately cancels all pending orders and squares off ALL positions across ALL brokers. Requires confirmation modal with countdown.

### 4.2 Real-Time Data Components
- **Live Tickers**: Top bar with scrolling NIFTY 50, BANKNIFTY, SENSEX, USD/INR
- **WebSocket Status Indicator**: Green pulsing dot when connected, red when disconnected
- **Auto-refresh**: All tables refresh every 1-3 seconds via WebSocket
- **Last Updated Timestamp**: "Updated 2s ago" on every data panel

### 4.3 Risk Management Panel (Sidebar or Modal)
```
┌─────────────────────────────────────┐
│  Risk Management                    │
│  ─────────────────────────────────  │
│  Daily Loss Limit: ₹50,000          │
│  [==================●====] 80%      │
│                                     │
│  Max Open Positions: 10             │
│  Current: 7                         │
│                                     │
│  Max Capital per Strategy: 30%      │
│                                     │
│  Circuit Breaker: Enabled           │
│  Trigger: -5% portfolio drawdown    │
│  Action: Pause all strategies       │
└─────────────────────────────────────┘
```

### 4.4 Notification Center
- Toast notifications for: Order filled, Order rejected, Strategy started/stopped, Broker disconnected, Risk limit hit
- Notification bell icon in top nav with unread count badge
- Persistent alerts panel in sidebar

### 4.5 Confirmation Modals
- **Start Strategy**: "Are you sure? This will deploy real capital."
- **Stop Strategy**: "Stop and keep positions?" / "Stop and square off?"
- **Emergency Stop**: Type "STOP ALL" to confirm. Shows impact summary: "This will close 7 positions across 3 brokers. Estimated P&L: -₹2,400."
- **Delete Strategy**: "This will permanently delete the strategy and all its data."

---

## 5. India Market Specific Features

### 5.1 Market Hours Awareness
- Display market status: "Pre-open", "Open", "Closed", "Holiday"
- Auto-pause strategies outside market hours (configurable)
- Countdown to market open/close
- Support for special trading sessions (Muhurat trading, etc.)

### 5.2 Broker-Specific Features
- **Zerodha**: Support for GTT orders, CNC/MIS/CO product types
- **Upstox**: Support for AMO (After Market Orders)
- **Fyers**: Support for bracket orders, cover orders
- **Angel One**: Support for smart orders
- Display broker-specific margin requirements

### 5.3 Regulatory Compliance
- **SEBI Compliance**: Display required disclaimers
- **P&L Tax Labels**: STCG/LTCG labels on P&L reports
- **Audit Trail**: All actions logged with timestamp and user ID
- **Consent Management**: API consent expiry tracking and renewal reminders

### 5.4 Currency & Number Formatting
- All amounts in INR (₹)
- Indian number format: ₹12,45,000 (not ₹1,245,000)
- Lakhs/Crores display option: ₹12.45 Lakhs
- Percentage precision: 2 decimal places
- Price precision: As per exchange (e.g., NIFTY: 0.05, Stocks: 0.01)

### 5.5 Index & Symbol Support
- Pre-loaded watchlists: NIFTY 50, BANKNIFTY, FINNIFTY, MIDCPNIFTY, SENSEX
- Sectoral indices: NIFTY IT, NIFTY Pharma, etc.
- F&O symbols with expiry selection
- Option chain viewer (integrated or linked)

---

## 6. Responsive Behavior

### 6.1 Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom nav, cards stack |
| Tablet | 768-1024px | 2-column grid, collapsible sidebar |
| Desktop | 1024-1440px | Full layout, 3-4 column grids |
| Wide | > 1440px | Multi-panel dashboard, side-by-side views |

### 6.2 Mobile Considerations
- Bottom navigation bar for primary routes
- Swipeable strategy cards
- Push notifications for critical alerts
- Simplified view: Only P&L, Start/Stop, and basic positions
- Biometric authentication support

---

## 7. Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation for all controls
- Screen reader support for data tables (aria-labels)
- Color-blind friendly: Use icons + text, not just color
- Focus indicators on all interactive elements
- Reduced motion option

---

## 8. Performance Requirements
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- WebSocket reconnection: < 2s
- Table rendering: Virtualized for > 100 rows
- Chart rendering: Canvas-based, 60fps

---

## 9. Tech Stack Recommendations
| Layer | Recommendation |
|-------|----------------|
| Framework | React 18+ / Next.js 14+ |
| Styling | Tailwind CSS + shadcn/ui components |
| State Management | Zustand or Redux Toolkit |
| Charts | Recharts / TradingView Lightweight Charts |
| WebSocket | Socket.io or native WebSocket |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Tables | TanStack Table (React Table) |
| Notifications | Sonner (toast) |
| Date/Time | date-fns |
| Build Tool | Vite |

---

## 10. User Flows

### 10.1 First-Time Setup
1. User signs up → 2FA setup
2. Add first broker → Enter API keys → Test connection
3. Create first strategy → Select template → Configure parameters → Assign broker
4. Backtest strategy → Review results → Deploy
5. Monitor on Dashboard

### 10.2 Daily Trading Flow
1. Login → Dashboard loads with overnight positions
2. Review pre-market status → Check broker connections
3. Start strategies (or auto-start at 9:15 AM)
4. Monitor P&L, positions, and alerts throughout the day
5. Auto-stop at 3:15 PM (or manual stop)
6. Review daily report → Export P&L

### 10.3 Emergency Scenario
1. Alert: "High volatility detected" or "Broker API error"
2. User clicks Emergency Stop
3. Confirmation modal → Type "STOP ALL"
4. System cancels all pending orders
5. System squares off all open positions
6. Notification: "All positions closed. Final P&L: -₹X,XXX"
7. Log entry created for audit

---

## 11. Data Requirements (API Contracts)

### 11.1 Strategy Object
```json
{
  "id": "str_001",
  "name": "Intraday Momentum",
  "type": "INTRADAY",
  "instrument": "NIFTY",
  "brokerId": "broker_001",
  "status": "RUNNING",
  "capitalAllocated": 500000,
  "capitalDeployed": 320000,
  "todaysPnL": 3200,
  "totalPnL": 45000,
  "winRate": 0.72,
  "totalTrades": 142,
  "maxDrawdown": 0.08,
  "sharpeRatio": 1.4,
  "settings": {
    "entryCondition": "RSI < 30 AND MACD bullish crossover",
    "exitCondition": "RSI > 70 OR stop loss hit",
    "stopLoss": 0.5,
    "targetProfit": 1.5,
    "positionSize": 0.1,
    "maxPositions": 3
  },
  "schedule": {
    "startTime": "09:15",
    "endTime": "15:15",
    "days": ["MON", "TUE", "WED", "THU", "FRI"]
  },
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-07-24T09:00:00Z"
}
```

### 11.2 Broker Object
```json
{
  "id": "broker_001",
  "name": "Zerodha",
  "displayName": "Zerodha (Kite)",
  "status": "CONNECTED",
  "apiLatency": 45,
  "accountId": "AB1234",
  "balance": 1245000,
  "usedMargin": 450000,
  "availableMargin": 795000,
  "todaysOrders": 24,
  "errors": 0,
  "lastError": null,
  "apiKey": "***masked***",
  "isDefault": true,
  "createdAt": "2026-01-10T08:00:00Z"
}
```

### 11.3 Order Object
```json
{
  "id": "ord_001",
  "strategyId": "str_001",
  "brokerId": "broker_001",
  "symbol": "NIFTY",
  "exchange": "NSE",
  "type": "BUY",
  "quantity": 50,
  "price": 22450.0,
  "orderType": "LIMIT",
  "product": "MIS",
  "status": "FILLED",
  "filledQuantity": 50,
  "averagePrice": 22450.0,
  "timestamp": "2026-07-24T09:45:12Z",
  "errorMessage": null
}
```

---

## 12. Security Considerations
- API keys encrypted at rest (AES-256)
- API keys never displayed in full (masked: `abcd****wxyz`)
- Session timeout: 15 minutes of inactivity
- IP whitelisting for API access
- 2FA mandatory for all users
- Audit log: Every action logged with user ID, timestamp, IP
- Rate limiting on all endpoints
- CSP headers to prevent XSS

---

*Document Version: 1.0*
*Prepared for: Antigravity Design Team*
*Market: India (NSE, BSE, MCX)*
*Date: July 2026*
