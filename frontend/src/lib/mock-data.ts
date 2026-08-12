/* Deterministic mock market/trading data for GoTrading (Indian markets). */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260808);
const r = (min: number, max: number) => min + rnd() * (max - min);
const ri = (min: number, max: number) => Math.floor(r(min, max + 1));
const pick = <T,>(arr: readonly T[]) => arr[ri(0, arr.length - 1)] as T;
const at = <T,>(arr: readonly T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length] as T;

const BASE_DATE = new Date("2026-08-07T15:30:00+05:30").getTime();
const iso = (minutesAgo: number) => new Date(BASE_DATE - minutesAgo * 60_000).toISOString();
const dayIso = (daysAgo: number) => new Date(BASE_DATE - daysAgo * 86_400_000).toISOString();

/* ---------------- Brokers ---------------- */

export type BrokerStatus = "connected" | "disconnected" | "token_expiring";

export interface Broker {
  id: string;
  name: string;
  code: string;
  status: BrokerStatus;
  apiKeyMasked: string;
  tokenExpiry: string;
  funds: number;
  marginUsed: number;
  marginAvailable: number;
  strategies: number;
  clientId: string;
  accentHue: string;
  autoSquareOff: string;
  maxDailyLoss: number;
  maxMarginUtil: number;
  maxPositions: number;
  leverageCap: number;
}

export const brokers: Broker[] = [
  {
    id: "zerodha",
    name: "Zerodha",
    code: "KITE",
    status: "connected",
    apiKeyMasked: "kt_9f2a••••••e41b",
    tokenExpiry: "08 Aug 2026, 07:30",
    funds: 1842000,
    marginUsed: 968400,
    marginAvailable: 873600,
    strategies: 5,
    clientId: "ZD4821",
    accentHue: "var(--chart-2)",
    autoSquareOff: "15:20",
    maxDailyLoss: 60000,
    maxMarginUtil: 70,
    maxPositions: 12,
    leverageCap: 5,
  },
  {
    id: "upstox",
    name: "Upstox",
    code: "UPX",
    status: "connected",
    apiKeyMasked: "ux_71cd••••••90aa",
    tokenExpiry: "08 Aug 2026, 07:30",
    funds: 940000,
    marginUsed: 512300,
    marginAvailable: 427700,
    strategies: 3,
    clientId: "UP99123",
    accentHue: "var(--chart-5)",
    autoSquareOff: "15:15",
    maxDailyLoss: 35000,
    maxMarginUtil: 65,
    maxPositions: 8,
    leverageCap: 4,
  },
  {
    id: "angelone",
    name: "Angel One",
    code: "SMARTAPI",
    status: "token_expiring",
    apiKeyMasked: "ao_5b8e••••••2c77",
    tokenExpiry: "Today, 16:00",
    funds: 615000,
    marginUsed: 402100,
    marginAvailable: 212900,
    strategies: 2,
    clientId: "A0J7742",
    accentHue: "var(--chart-3)",
    autoSquareOff: "15:10",
    maxDailyLoss: 25000,
    maxMarginUtil: 75,
    maxPositions: 6,
    leverageCap: 5,
  },
  {
    id: "fyers",
    name: "Fyers",
    code: "FYERS-V3",
    status: "connected",
    apiKeyMasked: "fy_2d40••••••b613",
    tokenExpiry: "08 Aug 2026, 07:30",
    funds: 480000,
    marginUsed: 190500,
    marginAvailable: 289500,
    strategies: 2,
    clientId: "XF01923",
    accentHue: "var(--chart-1)",
    autoSquareOff: "15:20",
    maxDailyLoss: 20000,
    maxMarginUtil: 60,
    maxPositions: 6,
    leverageCap: 4,
  },
  {
    id: "dhan",
    name: "Dhan",
    code: "DHANHQ",
    status: "disconnected",
    apiKeyMasked: "dh_88fa••••••41d0",
    tokenExpiry: "Expired",
    funds: 260000,
    marginUsed: 0,
    marginAvailable: 260000,
    strategies: 1,
    clientId: "DH55210",
    accentHue: "var(--chart-4)",
    autoSquareOff: "15:25",
    maxDailyLoss: 15000,
    maxMarginUtil: 50,
    maxPositions: 4,
    leverageCap: 3,
  },
];

export const brokerById = (id: string) => brokers.find((b) => b.id === id);

/* ---------------- Instruments ---------------- */

export const instruments = [
  { symbol: "NIFTY 25AUG 24500 CE", segment: "OPT", ltp: 182.4, chg: 6.42 },
  { symbol: "BANKNIFTY 25AUG 52000 PE", segment: "OPT", ltp: 244.15, chg: -4.18 },
  { symbol: "NIFTY AUG FUT", segment: "FUT", ltp: 24512.6, chg: 0.62 },
  { symbol: "BANKNIFTY AUG FUT", segment: "FUT", ltp: 52218.4, chg: -0.31 },
  { symbol: "RELIANCE", segment: "EQ", ltp: 2984.5, chg: 1.24 },
  { symbol: "TCS", segment: "EQ", ltp: 4128.9, chg: -0.86 },
  { symbol: "HDFCBANK", segment: "EQ", ltp: 1682.3, chg: 0.94 },
  { symbol: "INFY", segment: "EQ", ltp: 1875.6, chg: -1.42 },
  { symbol: "ICICIBANK", segment: "EQ", ltp: 1248.75, chg: 2.06 },
  { symbol: "SBIN", segment: "EQ", ltp: 842.15, chg: 1.61 },
  { symbol: "TATAMOTORS", segment: "EQ", ltp: 1042.8, chg: -2.34 },
  { symbol: "ADANIENT", segment: "EQ", ltp: 3121.4, chg: 3.18 },
  { symbol: "BAJFINANCE", segment: "EQ", ltp: 7204.5, chg: -0.52 },
  { symbol: "LT", segment: "EQ", ltp: 3612.25, chg: 0.78 },
  { symbol: "AXISBANK", segment: "EQ", ltp: 1178.4, chg: -1.08 },
  { symbol: "MARUTI", segment: "EQ", ltp: 12840.0, chg: 0.44 },
  { symbol: "SUNPHARMA", segment: "EQ", ltp: 1742.9, chg: 1.12 },
  { symbol: "WIPRO", segment: "EQ", ltp: 542.35, chg: -0.66 },
] as const;

/* ---------------- Strategies ---------------- */

export type StrategyStatus = "live" | "paused" | "backtest" | "draft";

export interface Strategy {
  id: string;
  name: string;
  description: string;
  segment: "Equity Cash" | "Futures" | "Options";
  status: StrategyStatus;
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
  mode: "Live" | "Paper" | "Backtest";
  instruments: string[];
  spark: number[];
}

const strategySeeds: Array<[string, string, Strategy["segment"], StrategyStatus, string[]]> = [
  ["Nifty ORB Breakout", "Opening-range breakout on NIFTY index options with VWAP filter", "Options", "live", ["zerodha", "upstox"]],
  ["BankNifty Straddle Decay", "Short straddle at 09:35 with delta-hedged adjustments", "Options", "live", ["zerodha"]],
  ["Supertrend Momentum F&O", "Supertrend(10,3) trend rider on index futures", "Futures", "live", ["upstox", "fyers"]],
  ["RSI Mean Reversion Cash", "RSI(2) oversold reversal basket across Nifty50 cash", "Equity Cash", "live", ["zerodha"]],
  ["EMA 9/21 Crossover", "Intraday EMA crossover with volume confirmation", "Equity Cash", "paused", ["angelone"]],
  ["Gap-Up Fade", "Fades >1.2% gap-ups in large caps after 09:45", "Equity Cash", "live", ["fyers"]],
  ["MACD Swing Carry", "Positional MACD swing with 5-day carry", "Equity Cash", "paused", ["zerodha", "angelone"]],
  ["Bollinger Squeeze Options", "Volatility expansion play on weekly BANKNIFTY", "Options", "backtest", ["upstox"]],
  ["VWAP Reversion Scalper", "High-frequency VWAP reversion on index futures", "Futures", "live", ["zerodha", "dhan"]],
  ["TradingView Webhook Signals", "Ingests external TradingView alerts for execution", "Options", "draft", ["fyers"]],
];

function makeSpark(seedUp: boolean) {
  let v = 100;
  return Array.from({ length: 24 }, () => {
    v += r(-3, seedUp ? 4.2 : 2.4);
    return Number(v.toFixed(2));
  });
}

export const strategies: Strategy[] = strategySeeds.map<Strategy>(([name, description, segment, status, brs], i) => {
  const todayPnl = Number(r(-42000, 96000).toFixed(2));
  const overallPnl = Number(r(-180000, 1450000).toFixed(2));
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    description,
    segment,
    status,
    brokers: brs,
    todayPnl: status === "draft" ? 0 : todayPnl,
    overallPnl: status === "draft" ? 0 : overallPnl,
    openPositions: status === "live" ? ri(0, 6) : 0,
    capital: ri(2, 14) * 100000,
    winRate: Number(r(41, 74).toFixed(1)),
    sharpe: Number(r(0.6, 2.7).toFixed(2)),
    maxDd: Number(r(4, 22).toFixed(1)),
    trades: ri(120, 2400),
    lastSignal: iso(ri(2, 320)),
    mode: status === "backtest" ? "Backtest" : status === "draft" ? "Paper" : i % 5 === 3 ? "Paper" : "Live",
    instruments: [pick(instruments).symbol as string, pick(instruments).symbol as string],
    spark: makeSpark(overallPnl > 0),
  };
});

export const strategyById = (id: string) => strategies.find((s) => s.id === id);
export const liveStrategies = strategies.filter((s) => s.status === "live");

/* ---------------- Positions ---------------- */

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
  type: "Intraday" | "Carry Forward";
  side: "BUY" | "SELL";
  status: "open" | "closed";
}

export const positions: Position[] = Array.from({ length: 34 }, (_, i) => {
  const inst = at(instruments, i);
  const strat = at(strategies, i);
  const qty = inst.segment === "EQ" ? ri(25, 800) : ri(1, 12) * (inst.segment === "OPT" ? 75 : 25);
  const avg = Number((inst.ltp * r(0.96, 1.04)).toFixed(2));
  const side = rnd() > 0.35 ? "BUY" : "SELL";
  const diff = (inst.ltp - avg) * (side === "BUY" ? 1 : -1);
  const status = i < 22 ? "open" : "closed";
  return {
    id: `POS${(100234 + i).toString()}`,
    symbol: inst.symbol,
    segment: inst.segment,
    strategyId: strat.id,
    brokerId: strat.brokers[0] as string,
    qty,
    avgPrice: avg,
    ltp: inst.ltp,
    unrealized: status === "open" ? Number((diff * qty).toFixed(2)) : 0,
    realized: status === "closed" ? Number((diff * qty).toFixed(2)) : Number(r(-4000, 9000).toFixed(2)),
    dayChange: inst.chg,
    type: rnd() > 0.28 ? "Intraday" : "Carry Forward",
    side,
    status,
  } as Position;
});

export const openPositions = positions.filter((p) => p.status === "open");

/* ---------------- Orders ---------------- */

export type OrderStatus = "executed" | "pending" | "rejected" | "cancelled";

export interface Order {
  id: string;
  time: string;
  symbol: string;
  segment: string;
  strategyId: string;
  brokerId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  qty: number;
  price: number;
  avgFill: number;
  status: OrderStatus;
  reason?: string;
  product: "MIS" | "NRML" | "CNC";
}

const rejectionReasons = [
  "Insufficient margin — required ₹1,24,500, available ₹98,200",
  "RMS: Blocked for intraday square-off window",
  "Order price outside day range circuit limit",
  "Instrument not permitted for this product type",
  "Broker session expired — token refresh required",
];

export const orders: Order[] = Array.from({ length: 60 }, (_, i): Order => {
  const inst = at(instruments, i * 3);
  const strat = at(strategies, i * 5);
  const statusRoll = rnd();
  const status: OrderStatus =
    statusRoll > 0.86 ? "rejected" : statusRoll > 0.79 ? "pending" : statusRoll > 0.74 ? "cancelled" : "executed";
  const price = Number((inst.ltp * r(0.985, 1.015)).toFixed(2));
  const t = iso(i * 7 + ri(0, 5));
  return {
    id: `ORD${(2504110 + i).toString()}`,
    time: t,
    symbol: inst.symbol,
    segment: inst.segment,
    strategyId: strat.id,
    brokerId: strat.brokers[0] as string,
    side: rnd() > 0.5 ? "BUY" : "SELL",
    type: pick(["MARKET", "LIMIT", "SL", "SL-M"] as const),
    qty: inst.segment === "EQ" ? ri(25, 600) : ri(1, 8) * 25,
    price,
    avgFill: status === "executed" ? Number((price * r(0.999, 1.001)).toFixed(2)) : 0,
    status,
    ...(status === "rejected" ? { reason: pick(rejectionReasons) } : {}),
    product: inst.segment === "EQ" ? pick(["MIS", "CNC"] as const) : pick(["MIS", "NRML"] as const),
  };
});

/* ---------------- Logs ---------------- */

export type LogLevel = "info" | "warning" | "error" | "critical";
export type LogSource = "strategy" | "broker" | "system" | "order" | "webhook";

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  source: LogSource;
  strategyId?: string;
  brokerId?: string;
  message: string;
}

const logTemplates: Array<[LogLevel, LogSource, string]> = [
  ["info", "strategy", "Entry signal fired — RSI(14) crossed above 62 on NIFTY AUG FUT"],
  ["info", "order", "Order ORD2504118 executed @ ₹24,512.60 (2 lots)"],
  ["warning", "broker", "Angel One access token expires in 45 minutes — re-authentication needed"],
  ["error", "order", "Order rejected: insufficient margin for BANKNIFTY 25AUG 52000 PE"],
  ["info", "strategy", "Stop-loss trailed to ₹2,976.20 for RELIANCE long"],
  ["critical", "system", "Daily loss limit at 82% of configured threshold — kill-switch armed"],
  ["info", "webhook", "TradingView alert received: BUY NIFTY 24500 CE, payload verified"],
  ["warning", "strategy", "Max trades/day reached — further signals suppressed until next session"],
  ["info", "broker", "Zerodha Kite session refreshed successfully"],
  ["error", "broker", "Dhan API connection lost — retrying in 30s (attempt 3/5)"],
  ["info", "system", "Auto square-off scheduler engaged for intraday positions at 15:20"],
  ["warning", "system", "Latency spike detected: broker ack 812ms (threshold 500ms)"],
  ["info", "strategy", "Target hit — booked ₹18,420 on BankNifty Straddle Decay"],
  ["error", "webhook", "Webhook signature mismatch from 103.21.x.x — request dropped"],
  ["info", "order", "Square-off completed for 4 intraday positions"],
];

export const logs: LogEntry[] = Array.from({ length: 90 }, (_, i): LogEntry => {
  const [level, source, message] = at(logTemplates, i);
  const strat = at(strategies, i * 3);
  return {
    id: `LOG${9000 + i}`,
    time: iso(i * 4 + ri(0, 3)),
    level,
    source,
    ...(source === "strategy" || source === "order" ? { strategyId: strat.id } : {}),
    ...(source === "broker" ? { brokerId: at(brokers, i).id } : {}),
    message,
  };
});

/* ---------------- Notifications ---------------- */

export interface Notification {
  id: string;
  time: string;
  category: "trade" | "risk" | "broker" | "system";
  level: LogLevel;
  title: string;
  body: string;
  read: boolean;
}

const notificationSeeds = [
  { category: "trade", level: "info", title: "Target hit — Nifty ORB Breakout", body: "Booked ₹18,420 on NIFTY 25AUG 24500 CE (4 lots)." },
  { category: "risk", level: "warning", title: "Daily loss at 68% of limit", body: "Aggregate loss ₹40,800 of ₹60,000 configured cap." },
  { category: "broker", level: "error", title: "Dhan disconnected", body: "API session dropped at 13:42. Strategies on Dhan auto-paused." },
  { category: "trade", level: "info", title: "Stop-loss hit — Gap-Up Fade", body: "Exited TATAMOTORS short at ₹1,046.20, loss ₹6,240." },
  { category: "system", level: "info", title: "Webhook signal ingested", body: "TradingView alert executed on Fyers within 412ms." },
  { category: "risk", level: "critical", title: "Margin low on Angel One", body: "Available margin ₹2.13 L below ₹3.00 L threshold." },
  { category: "trade", level: "info", title: "Order executed", body: "BUY 250 RELIANCE @ ₹2,978.40 via Zerodha (MIS)." },
  { category: "system", level: "warning", title: "Strategy paused", body: "EMA 9/21 Crossover paused after 3 consecutive losses." },
  { category: "broker", level: "warning", title: "Token expiring", body: "Angel One access token expires today at 16:00." },
  { category: "trade", level: "info", title: "Square-off complete", body: "4 intraday positions squared off at 15:20 IST." },
] as const;

export const notifications: Notification[] = notificationSeeds.map(
  (n, i) => ({ ...n, id: `NTF${i + 1}`, time: iso(i * 23 + 4), read: i > 4 }) as Notification,
);

/* ---------------- Series ---------------- */

export function equityCurve(points = 90, start = 4200000) {
  let v = start;
  return Array.from({ length: points }, (_, i) => {
    v += r(-32000, 46000);
    return {
      date: new Date(BASE_DATE - (points - i) * 86_400_000).toISOString().slice(0, 10),
      equity: Number(v.toFixed(0)),
      pnl: Number((v - start).toFixed(0)),
    };
  });
}

export function intradayCurve(points = 75) {
  let v = 0;
  return Array.from({ length: points }, (_, i) => {
    v += r(-6000, 7400);
    const mins = 9 * 60 + 15 + i * 5;
    return {
      date: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`,
      equity: Number((4200000 + v).toFixed(0)),
      pnl: Number(v.toFixed(0)),
    };
  });
}

export const dailyPnl = Array.from({ length: 30 }, (_, i) => ({
  date: dayIso(29 - i).slice(0, 10),
  pnl: Number(r(-58000, 92000).toFixed(0)),
  trades: ri(4, 42),
}));

export const monthlyPnl = [
  "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26",
  "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26",
].map((m) => ({ month: m, pnl: Number(r(-240000, 620000).toFixed(0)), trades: ri(80, 420) }));

/* ---------------- Aggregates ---------------- */

export const totals = (() => {
  const todayPnl = strategies.reduce((a, s) => a + s.todayPnl, 0);
  const overallPnl = strategies.reduce((a, s) => a + s.overallPnl, 0);
  const deployed = strategies.filter((s) => s.status === "live").reduce((a, s) => a + s.capital, 0);
  const funds = brokers.reduce((a, b) => a + b.funds, 0);
  const marginAvailable = brokers.reduce((a, b) => a + b.marginAvailable, 0);
  const marginUsed = brokers.reduce((a, b) => a + b.marginUsed, 0);
  return {
    portfolioValue: funds + overallPnl * 0.4,
    deployed,
    todayPnl,
    todayPnlPct: (todayPnl / funds) * 100,
    overallPnl,
    overallPnlPct: (overallPnl / funds) * 100,
    activeStrategies: strategies.filter((s) => s.status === "live").length,
    totalStrategies: strategies.length,
    openPositions: openPositions.length,
    winRate: 61.4,
    maxDrawdown: 12.8,
    marginAvailable,
    marginUsed,
    funds,
  };
})();

export const holdings = [
  { symbol: "RELIANCE", qty: 320, avg: 2610.4, ltp: 2984.5, sector: "Energy" },
  { symbol: "HDFCBANK", qty: 480, avg: 1502.1, ltp: 1682.3, sector: "Banking" },
  { symbol: "TCS", qty: 150, avg: 3820.0, ltp: 4128.9, sector: "IT" },
  { symbol: "ITC", qty: 900, avg: 412.6, ltp: 468.25, sector: "FMCG" },
  { symbol: "LT", qty: 110, avg: 3210.9, ltp: 3612.25, sector: "Infra" },
  { symbol: "SUNPHARMA", qty: 240, avg: 1520.4, ltp: 1742.9, sector: "Pharma" },
].map((h) => ({
  ...h,
  value: h.qty * h.ltp,
  pnl: (h.ltp - h.avg) * h.qty,
  pnlPct: ((h.ltp - h.avg) / h.avg) * 100,
}));

export const backtestRuns = [
  { id: "BT-2041", strategy: "Nifty ORB Breakout", period: "01 Jan 26 – 31 Jul 26", trades: 412, winRate: 64.2, pnl: 1284000, maxDd: 9.4, sharpe: 2.1, status: "completed" },
  { id: "BT-2040", strategy: "Bollinger Squeeze Options", period: "01 Apr 26 – 31 Jul 26", trades: 188, winRate: 52.6, pnl: -142000, maxDd: 18.2, sharpe: 0.4, status: "completed" },
  { id: "BT-2039", strategy: "Supertrend Momentum F&O", period: "01 Jan 25 – 31 Jul 26", trades: 906, winRate: 58.1, pnl: 2410000, maxDd: 14.1, sharpe: 1.7, status: "completed" },
  { id: "BT-2038", strategy: "VWAP Reversion Scalper", period: "01 Jun 26 – 31 Jul 26", trades: 1420, winRate: 55.4, pnl: 386000, maxDd: 6.8, sharpe: 1.9, status: "running" },
];

export const webhooks = [
  { id: "WH-01", name: "TradingView — Nifty ORB", url: "https://api.gotrading.in/hooks/v1/tv/9f2a41cd", strategy: "Nifty ORB Breakout", calls: 1284, lastCall: iso(12), status: "active" },
  { id: "WH-02", name: "TradingView — BankNifty Straddle", url: "https://api.gotrading.in/hooks/v1/tv/71bd88fa", strategy: "BankNifty Straddle Decay", calls: 642, lastCall: iso(96), status: "active" },
  { id: "WH-03", name: "Custom Python Signals", url: "https://api.gotrading.in/hooks/v1/custom/2c77b613", strategy: "TradingView Webhook Signals", calls: 88, lastCall: iso(2200), status: "paused" },
];

export const apiKeys = [
  { id: "AK-1", label: "Reporting Service", key: "ak_live_9f2a••••••41b7", created: "12 Mar 2026", lastUsed: iso(180), scopes: "read:orders, read:positions" },
  { id: "AK-2", label: "Mobile App", key: "ak_live_71cd••••••90aa", created: "02 Jun 2026", lastUsed: iso(24), scopes: "read:*, write:orders" },
];

export const sessions = [
  { device: "MacBook Pro · Chrome", location: "Mumbai, IN", ip: "103.21.44.12", last: "Active now", current: true },
  { device: "iPhone 15 · GoTrading iOS", location: "Mumbai, IN", ip: "103.21.44.90", last: "2 hours ago", current: false },
  { device: "Windows 11 · Edge", location: "Pune, IN", ip: "49.36.180.4", last: "Yesterday, 21:14", current: false },
];
