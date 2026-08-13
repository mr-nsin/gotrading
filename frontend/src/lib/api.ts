const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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

export interface Strategy {
  id: string;
  name: string;
  type: string;
  instrument: string;
  status: string;
  segment?: string;
  description?: string;
  brokers?: string[];
  todayPnl: number;
  overallPnl: number;
  openPositions?: number;
  capital?: number;
  capital_allocated?: number;
  winRate?: number;
  win_rate?: number;
  sharpe?: number;
  sharpe_ratio?: number;
  maxDd?: number;
  max_drawdown?: number;
  trades?: number;
  total_trades?: number;
  lastSignal?: string;
  mode?: string;
  instruments?: string[];
  entryRules?: Rule[];
  exitRules?: Rule[];
  risk?: Record<string, unknown>;
  sizing?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  webhook?: boolean;
  spark?: number[];
  todays_pnl?: number;
  total_pnl?: number;
}

export interface Rule {
  id: string;
  indicator: string;
  operator: string;
  value: string;
  join: 'AND' | 'OR';
}

export interface Broker {
  id: string;
  name: string;
  code?: string;
  status: string;
  apiKeyMasked?: string;
  apiKey?: string;
  tokenExpiry?: string;
  funds?: number;
  marginUsed?: number;
  marginAvailable?: number;
  strategies?: number;
  clientId?: string;
  client_id?: string;
  broker_type?: string;
  balance?: number;
  used?: number;
  display_name?: string;
  lastConnected?: string;
  settings?: {
    autoSquareOff?: string;
    maxDailyLoss?: number;
    maxMarginUtil?: number;
    maxPositions?: number;
    leverageCap?: number;
  };
}

export interface AddBrokerRequest {
  code?: string;
  broker_type?: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  client_id?: string;
  user_id?: string;
}

export interface BrokerStrategy {
  id: string;
  name: string;
  status: string;
  todayPnl: number;
}

export interface MarginHistoryPoint {
  date: string;
  equity: number;
  pnl: number;
}

export interface Position {
  id: string;
  symbol: string;
  segment?: string;
  strategyId?: string;
  strategy_id?: string;
  strategy_name?: string;
  brokerId?: string;
  broker_id?: string;
  qty?: number;
  quantity?: number;
  avgPrice?: number;
  entry_price?: number;
  ltp?: number;
  unrealized?: number;
  realized?: number;
  dayChange?: number;
  type?: string;
  side: string;
  status: string;
  pnl?: number;
  pnl_pct?: number;
}

export interface Order {
  id: string;
  time?: string;
  timestamp?: string;
  symbol: string;
  segment?: string;
  strategyId?: string;
  strategy_id?: string;
  brokerId?: string;
  broker_id?: string;
  side: string;
  type?: string;
  order_type?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  avgFill?: number;
  average_price?: number;
  status: string;
  reason?: string;
  error_message?: string;
  product?: string;
  lifecycle?: Array<{ t: string; label: string }>;
}

export interface LogEntry {
  id: string;
  time?: string;
  timestamp?: string;
  level: string;
  source?: string;
  strategyId?: string;
  strategy_id?: string;
  brokerId?: string;
  broker_id?: string;
  message: string;
}

export interface Notification {
  id: string;
  time: string;
  category: string;
  level: string;
  title: string;
  body: string;
  read: boolean;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  pnl: number;
}

export interface RiskSettings {
  daily_loss_limit: number;
  daily_loss_limit_pct: number;
  max_open_positions: number;
  max_capital_per_strategy_pct: number;
  max_order_value: number;
  max_per_trade_loss: number;
  auto_kill_switch: boolean;
  circuit_breaker_enabled: boolean;
  circuit_breaker_threshold: number;
  circuit_breaker_action: string;
  vix_threshold: number;
  block_entries_after: string;
}

export type NotificationChannel = 'in_app' | 'email' | 'telegram' | 'sms' | 'push';
export type NotificationCategory = 'trades' | 'risk' | 'broker' | 'orders' | 'system' | 'webhooks';

export type ChannelMatrix = Record<NotificationCategory, Record<NotificationChannel, boolean>>;

export interface AlertRules {
  daily_loss_threshold_pct: number;
  margin_util_threshold_pct: number;
  broker_disconnect_notify: boolean;
  order_rejection_notify: boolean;
}

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  trade_alerts: boolean;
  risk_alerts: boolean;
  broker_alerts: boolean;
  system_alerts: boolean;
  channel_matrix: ChannelMatrix;
  alert_rules: AlertRules;
}

export interface BrokerRiskSettings {
  auto_square_off?: string;
  max_daily_loss?: number;
  max_margin_util?: number;
  max_positions?: number;
  leverage_cap?: number;
}

export interface Profile {
  id: string;
  email: string;
  name?: string;
  mobile?: string;
  pan?: string;
  subscription_tier: string;
  created_at: string;
  two_factor_enabled?: boolean;
  api_calls_today?: number;
  api_calls_limit?: number;
}

export interface ProfilePreferences {
  theme: string;
  currency_format: string;
  compact_numbers: boolean;
  timezone: string;
}

export type TwoFactorSetup = {
  secret: string;
  qr_url: string;
  otpauth_url: string;
};

export type UpdateProfileRequest = {
  name?: string;
  email?: string;
  mobile?: string;
  pan?: string;
  subscription_tier?: string;
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

// Webhook types
export interface Webhook {
  id: string;
  name: string;
  url: string;
  strategy: string;
  status: string;
  calls: number;
  lastCall: string;
  secret?: string;
}

// API Key types
export interface ApiKey {
  id: string;
  label: string;
  keyMasked: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
}

// Backtest types
export interface BacktestRun {
  id: string;
  strategy: string;
  periodStart: string;
  periodEnd: string;
  capital: number;
  pnl: number;
  pnlPct: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
  sharpe: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  status: string;
  createdAt: string;
  completedAt: string;
  equityCurve: Array<{ date: string; value: number; pnl: number }>;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

// Portfolio types
export interface Holding {
  id: string;
  symbol: string;
  qty: number;
  avg: number;
  ltp: number;
  value: number;
  pnl: number;
  pnlPct: number;
  sector: string;
  dayChange: number;
}

// Reports types
export interface DailyPnl {
  date: string;
  pnl: number;
  trades: number;
  charges?: number;
  net?: number;
}

export interface MonthlyPnl {
  month: string;
  monthName: string;
  pnl: number;
  trades: number;
  charges?: number;
  net?: number;
  tradingDays?: number;
  avgDailyPnl?: number;
}

export interface ReportsSummary {
  netPnl: number;
  totalTrades: number;
  winDays: number;
  lossDays: number;
  bestDay: number;
  worstDay: number;
  avgDailyPnl: number;
  totalCharges: number;
  winRate: number;
}

// Market types
export interface MarketStats {
  nifty: { ltp: number; change: number; changePct: number };
  bankNifty: { ltp: number; change: number; changePct: number };
  indiaVix: { ltp: number; change: number; changePct: number };
  marketStatus: string;
  lastUpdated: string;
}

export const api = {
  // Dashboard
  getDashboardTotals: () => fetchApi<DashboardTotals>('/api/v1/dashboard/totals'),
  getEquityCurve: (range = '3M') => fetchApi<EquityCurvePoint[]>(`/api/v1/dashboard/equity-curve?range=${range}`),
  getIntradayCurve: () => fetchApi<EquityCurvePoint[]>('/api/v1/dashboard/intraday-curve'),
  getPnlByStrategy: () => fetchApi<Array<{ name: string; pnl: number }>>('/api/v1/dashboard/pnl-by-strategy'),
  getAllocation: () => fetchApi<Array<{ name: string; value: number; color: string }>>('/api/v1/dashboard/allocation'),
  getTopMovers: () => fetchApi<{ gainers: Position[]; losers: Position[] }>('/api/v1/dashboard/top-movers'),

  // Market
  getMarketStats: () => fetchApi<MarketStats>('/api/v1/market/stats'),
  getMarketIndices: () => fetchApi<Array<{ symbol: string; ltp: number; change: number; changePct: number }>>('/api/v1/market/indices'),

  // Strategies
  getStrategies: () => fetchApi<Strategy[]>('/api/v1/strategies'),
  getStrategy: (id: string) => fetchApi<Strategy>(`/api/v1/strategies/${id}`),
  createStrategy: (data: Partial<Strategy>) => 
    fetchApi<Strategy>('/api/v1/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStrategy: (id: string, data: Partial<Strategy>) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStrategy: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/strategies/${id}`, { method: 'DELETE' }),
  startStrategy: (id: string) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}/start`, { method: 'POST' }),
  pauseStrategy: (id: string) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}/pause`, { method: 'POST' }),
  stopStrategy: (id: string) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}/stop`, { method: 'POST' }),
  getStrategyPositions: (id: string) =>
    fetchApi<Position[]>(`/api/v1/strategies/${id}/positions`),
  getStrategyOrders: (id: string) => {
    const params = new URLSearchParams({ strategy_id: id });
    return fetchApi<Order[]>(`/api/v1/orders?${params}`);
  },

  // Positions
  getPositions: () => fetchApi<Position[]>('/api/v1/positions'),
  squareOffPosition: (id: string) =>
    fetchApi<Position>(`/api/v1/positions/${id}/squareoff`, { method: 'POST' }),

  // Orders
  getOrders: () => fetchApi<Order[]>('/api/v1/orders'),

  // Brokers
  getBrokers: () => fetchApi<Broker[]>('/api/v1/brokers'),
  getBroker: (id: string) => fetchApi<Broker>(`/api/v1/brokers/${id}`),
  getBrokerMarginHistory: (id: string) =>
    fetchApi<MarginHistoryPoint[]>(`/api/v1/brokers/${id}/margin-history`),
  getBrokerStrategies: (id: string) =>
    fetchApi<BrokerStrategy[]>(`/api/v1/brokers/${id}/strategies`),
  getBrokerOrders: (id: string) => fetchApi<Order[]>(`/api/v1/brokers/${id}/orders`),
  getBrokerPositions: (id: string) => fetchApi<Position[]>(`/api/v1/brokers/${id}/positions`),
  reauthenticateBroker: (id: string) =>
    fetchApi<Broker>(`/api/v1/brokers/${id}/connect`, { method: 'POST' }),
  updateBrokerCredentials: (id: string, data: Partial<AddBrokerRequest>) =>
    fetchApi<{ status: string; message: string }>(`/api/v1/brokers/${id}/credentials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  disconnectBroker: (id: string) =>
    fetchApi<Broker>(`/api/v1/brokers/${id}/disconnect`, { method: 'POST' }),
  addBroker: (data: AddBrokerRequest) =>
    fetchApi<Broker>('/api/v1/brokers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testBroker: (id: string) =>
    fetchApi<{ status: string; latency_ms: number }>(`/api/v1/brokers/${id}/test`, { method: 'POST' }),
  deleteBroker: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/brokers/${id}`, { method: 'DELETE' }),

  // Logs
  getLogs: (filters?: { level?: string; source?: string; strategy_id?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>);
    return fetchApi<LogEntry[]>(`/api/v1/logs?${params}`);
  },

  // Portfolio
  getHoldings: () => fetchApi<Holding[]>('/api/v1/portfolio/holdings'),
  getPortfolioSummary: () => fetchApi<{ netWorth: number; invested: number; pnl: number; pnlPct: number; dayChange: number }>('/api/v1/portfolio/summary'),
  getSectorAllocation: () => fetchApi<Array<{ name: string; value: number; color: string }>>('/api/v1/portfolio/sectors'),
  getNetWorthHistory: (range?: string) => fetchApi<Array<{ date: string; value: number }>>(`/api/v1/portfolio/net-worth-history${range ? `?range=${range}` : ''}`),
  getBrokerCapital: () => fetchApi<Array<{ name: string; value: number; color: string }>>('/api/v1/portfolio/broker-capital'),

  // Reports
  getReportsSummary: (period?: string) => fetchApi<ReportsSummary>(`/api/v1/reports/summary${period ? `?period=${period}` : ''}`),
  getDailyPnl: (limit?: number) => fetchApi<DailyPnl[]>(`/api/v1/reports/daily${limit ? `?limit=${limit}` : ''}`),
  getMonthlyPnl: (year?: number) => fetchApi<MonthlyPnl[]>(`/api/v1/reports/monthly${year ? `?year=${year}` : ''}`),
  getPnlByStrategyReport: (period?: string) => fetchApi<Array<{ name: string; pnl: number; segment: string; status: string }>>(`/api/v1/reports/by-strategy${period ? `?period=${period}` : ''}`),
  getPnlByBrokerReport: (period?: string) => fetchApi<Array<{ code: string; name: string; pnl: number }>>(`/api/v1/reports/by-broker${period ? `?period=${period}` : ''}`),
  getReportsEquityCurve: (period?: string) => fetchApi<Array<{ date: string; value: number; dailyPnl: number }>>(`/api/v1/reports/equity-curve${period ? `?period=${period}` : ''}`),
  getChargesBreakdown: (period?: string) => fetchApi<{ totalCharges: number; totalTrades: number; avgPerTrade: number; breakdown: Record<string, number> }>(`/api/v1/reports/charges${period ? `?period=${period}` : ''}`),

  // Webhooks
  getWebhooks: () => fetchApi<Webhook[]>('/api/v1/webhooks'),
  getWebhook: (id: string) => fetchApi<Webhook>(`/api/v1/webhooks/${id}`),
  createWebhook: (data: { name: string; strategy_id?: string | null }) => 
    fetchApi<Webhook>('/api/v1/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (id: string, data: Partial<Webhook>) =>
    fetchApi<Webhook>(`/api/v1/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWebhook: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id: string) =>
    fetchApi<{ success: boolean; latency_ms: number }>(`/api/v1/webhooks/${id}/test`, { method: 'POST' }),
  rotateWebhookSecret: (id: string) =>
    fetchApi<{ secret: string }>(`/api/v1/webhooks/${id}/rotate-secret`, { method: 'POST' }),
  getWebhookStats: () => fetchApi<{ totalEndpoints: number; activeEndpoints: number; totalCalls: number; signalsReceived: number; failedDeliveries: number }>('/api/v1/webhooks/stats'),
  getWebhookLogs: (id: string) => fetchApi<Array<{ id: string; time: string; timestamp: string; level: string; status: string; message: string; payload: string }>>(`/api/v1/webhooks/${id}/logs`),
  getAllWebhookLogs: () => fetchApi<Array<{ id: string; time: string; timestamp: string; level: string; status: string; message: string; payload: string }>>('/api/v1/webhooks/logs/all'),

  // API Keys
  getApiKeys: () => fetchApi<ApiKey[]>('/api/v1/api-keys'),
  getApiKey: (id: string) => fetchApi<ApiKey>(`/api/v1/api-keys/${id}`),
  createApiKey: (data: { label: string; scopes: string[] }) =>
    fetchApi<ApiKey & { key: string }>('/api/v1/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  deleteApiKey: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/api-keys/${id}`, { method: 'DELETE' }),
  rotateApiKey: (id: string) =>
    fetchApi<{ key: string }>(`/api/v1/api-keys/${id}/rotate`, { method: 'POST' }),
  getApiKeyStats: () => fetchApi<{ totalKeys: number; activeKeys: number; totalCalls: number }>('/api/v1/api-keys/stats'),

  // Backtesting
  getBacktestRuns: () => fetchApi<BacktestRun[]>('/api/v1/backtest/runs'),
  getBacktestRun: (id: string) => fetchApi<BacktestRun>(`/api/v1/backtest/runs/${id}`),
  runBacktest: (data: { strategy_id: string; start_date: string; end_date: string; capital: number; slippage_pct?: number; brokerage_per_order?: number; include_costs?: boolean }) =>
    fetchApi<BacktestRun>('/api/v1/backtest/run', { method: 'POST', body: JSON.stringify(data) }),
  deleteBacktestRun: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/backtest/runs/${id}`, { method: 'DELETE' }),
  getBacktestStrategies: () => fetchApi<Array<{ id: string; name: string }>>('/api/v1/backtest/strategies'),

  // Risk
  getRiskSettings: () => fetchApi<RiskSettings>('/api/v1/risk/settings'),
  updateRiskSettings: (data: Partial<RiskSettings>) =>
    fetchApi<{ ok: boolean }>('/api/v1/risk/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  emergencyStop: () =>
    fetchApi<{ ok: boolean }>('/api/v1/risk/emergency-stop', { method: 'POST' }),

  // Notifications
  getNotifications: (filters?: { category?: string; unread_only?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.unread_only) params.set('unread_only', 'true');
    return fetchApi<Notification[]>(`/api/v1/notifications?${params}`);
  },
  markNotificationRead: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    fetchApi<{ ok: boolean; count: number }>('/api/v1/notifications/mark-all-read', { method: 'POST' }),
  getUnreadCount: () => fetchApi<{ count: number }>('/api/v1/notifications/unread-count'),
  getNotificationSettings: () => fetchApi<NotificationSettings>('/api/v1/notifications/settings'),
  updateNotificationSettings: (data: Partial<NotificationSettings>) =>
    fetchApi<NotificationSettings>('/api/v1/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateBrokerSettings: (id: string, data: BrokerRiskSettings) =>
    fetchApi<Broker>(`/api/v1/brokers/${id}/settings`, {
      method: 'PUT',
      body: JSON.stringify({
        auto_square_off: data.auto_square_off,
        max_daily_loss: data.max_daily_loss,
        max_margin_util: data.max_margin_util,
        max_positions: data.max_positions,
        leverage_cap: data.leverage_cap,
      }),
    }),

  // Profile
  getProfile: () => fetchApi<Profile>('/api/v1/profile'),
  updateProfile: (data: UpdateProfileRequest) =>
    fetchApi<{ ok: boolean }>('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getSessions: () => fetchApi<Array<{ id: string; device: string; location: string; ip: string; last_active: string; is_current: boolean }>>('/api/v1/profile/sessions'),
  revokeSession: (id: string) =>
    fetchApi<{ ok: boolean }>(`/api/v1/profile/sessions/${id}`, { method: 'DELETE' }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    fetchApi<{ ok: boolean }>('/api/v1/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getPreferences: () => fetchApi<ProfilePreferences>('/api/v1/profile/preferences'),
  updatePreferences: (data: Partial<ProfilePreferences>) =>
    fetchApi<{ ok: boolean }>('/api/v1/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  setup2FA: () => fetchApi<TwoFactorSetup>('/api/v1/profile/2fa/setup', { method: 'POST' }),
  verify2FA: (code: string) =>
    fetchApi<{ ok: boolean }>('/api/v1/profile/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  disable2FA: () => fetchApi<{ ok: boolean }>('/api/v1/profile/2fa/disable', { method: 'POST' }),
  getApiUsage: () => fetchApi<{ calls_today: number; limit: number }>('/api/v1/profile/api-usage'),
};
