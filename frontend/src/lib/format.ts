import { format, parseISO } from "date-fns";

type MoneyOpts = { sign?: boolean; decimals?: number };

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const INR_COMPACT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatINR(value: number, opts: MoneyOpts = {}): string {
  const { sign = false, decimals = 2 } = opts;
  
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: sign ? "always" : "auto",
  });
  
  return formatter.format(value);
}

export function formatINRCompact(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 10000000) {
    return `${sign}₹${(absValue / 10000000).toFixed(2)} Cr`;
  }
  if (absValue >= 100000) {
    return `${sign}₹${(absValue / 100000).toFixed(2)} L`;
  }
  if (absValue >= 1000) {
    return `${sign}₹${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${absValue.toFixed(0)}`;
}

export function formatNum(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value: number, decimals = 2, includeSign = true): string {
  const sign = includeSign && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function pnlClass(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-muted-foreground";
}

export function formatTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, "HH:mm:ss");
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, "dd MMM yyyy, HH:mm");
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, "dd MMM yyyy");
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, "dd MMM");
  } catch {
    return isoString;
  }
}
