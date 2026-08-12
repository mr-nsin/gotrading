export const INDICATORS = [
  { value: "RSI(14)", label: "RSI(14)", category: "Momentum" },
  { value: "EMA(9) x EMA(21)", label: "EMA Crossover (9/21)", category: "Trend" },
  { value: "SMA(50) x SMA(200)", label: "SMA Crossover (50/200)", category: "Trend" },
  { value: "MACD(12,26,9)", label: "MACD(12,26,9)", category: "Momentum" },
  { value: "Bollinger %B", label: "Bollinger Bands %B", category: "Volatility" },
  { value: "Supertrend(10,3)", label: "Supertrend(10,3)", category: "Trend" },
  { value: "VWAP", label: "VWAP", category: "Volume" },
  { value: "ATR(14)", label: "ATR(14)", category: "Volatility" },
  { value: "ADX(14)", label: "ADX(14)", category: "Trend" },
  { value: "Stochastic(14,3,3)", label: "Stochastic(14,3,3)", category: "Momentum" },
  { value: "CCI(20)", label: "CCI(20)", category: "Momentum" },
  { value: "OBV", label: "OBV", category: "Volume" },
  { value: "Candle: Bullish Engulfing", label: "Candle: Bullish Engulfing", category: "Patterns" },
  { value: "Candle: Bearish Engulfing", label: "Candle: Bearish Engulfing", category: "Patterns" },
  { value: "Candle: Hammer", label: "Candle: Hammer", category: "Patterns" },
  { value: "Candle: Doji", label: "Candle: Doji", category: "Patterns" },
  { value: "Candle: Morning Star", label: "Candle: Morning Star", category: "Patterns" },
] as const;

export type IndicatorValue = (typeof INDICATORS)[number]["value"];

export const OPERATORS = [
  "crosses above",
  "crosses below",
  "is above",
  "is below",
  "equals",
] as const;

export type Operator = (typeof OPERATORS)[number];

export const SEGMENTS = ["Equity Cash", "Futures", "Options"] as const;
export const MODES = ["Live", "Paper", "Backtest"] as const;
export const SIZING_METHODS = ["Fixed Qty", "% of Capital", "Lot-based"] as const;
export const OPTION_TYPES = ["CE", "PE", "Both"] as const;
export const STRIKE_SELECTIONS = ["ATM", "OTM", "ITM", "By delta", "By premium"] as const;
export const EXPIRY_OPTIONS = [
  { value: "weekly", label: "Current weekly" },
  { value: "next", label: "Next weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function createRuleId() {
  return `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}
