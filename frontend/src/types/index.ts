export type {
  DashboardTotals,
  Strategy,
  Rule,
  Broker,
  Position,
  Order,
  LogEntry,
  Notification,
  EquityCurvePoint,
  RiskSettings,
} from '@/lib/api';

export type BrokerStatus = 'connected' | 'disconnected' | 'token_expiring';
export type StrategyStatus = 'live' | 'paused' | 'backtest' | 'draft' | 'RUNNING' | 'PAUSED' | 'STOPPED';
export type OrderStatus = 'executed' | 'pending' | 'rejected' | 'cancelled' | 'FILLED' | 'PENDING';
export type LogLevel = 'info' | 'warning' | 'error' | 'critical' | 'INFO' | 'WARN' | 'ERROR' | 'TRADE';
export type LogSource = 'strategy' | 'broker' | 'system' | 'order' | 'webhook';
