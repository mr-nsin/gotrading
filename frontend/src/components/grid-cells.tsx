import { ReactNode } from "react";
import { formatINR, formatNum, pnlClass } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export const SymbolCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const { value, data } = props;
  
  return (
    <div>
      <div className="cell-symbol leading-tight">{value}</div>
      {(data.segment || data.type) && (
        <div className="mt-0.5 flex gap-1">
          {data.segment && <span className="text-[10px] uppercase text-muted leading-none">{data.segment}</span>}
          {data.type && <span className="text-[10px] uppercase text-muted leading-none">{data.type}</span>}
        </div>
      )}
    </div>
  );
};

export const SideBadgeCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-12" />;
  const side = props.value as "BUY" | "SELL" | string;
  if (!side) return <span>—</span>;
  
  const isBuy = side.toUpperCase() === "BUY";
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        isBuy ? "bg-[var(--positive-bg)] text-[var(--side-buy)]" : "bg-[var(--negative-bg)] text-[var(--side-sell)]"
      }`}
    >
      {side}
    </span>
  );
};

export const StatusBadgeCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-16" />;
  const status = props.value as string;
  if (!status) return <span>—</span>;
  
  const key = status.toLowerCase();
  
  let bgClass = "bg-[var(--status-closed-bg)]";
  let textClass = "text-[var(--status-closed)]";
  
  if (['open', 'live', 'connected', 'executed', 'active', 'completed'].includes(key)) {
    bgClass = "bg-[var(--status-open-bg)]";
    textClass = "text-[var(--status-open)]";
  } else if (['pending', 'paused', 'running', 'warning', 'token_expiring'].includes(key)) {
    bgClass = "bg-[var(--status-pending-bg)]";
    textClass = "text-[var(--status-pending)]";
  } else if (['rejected', 'error', 'critical', 'disconnected'].includes(key)) {
    bgClass = "bg-[var(--status-rejected-bg)]";
    textClass = "text-[var(--status-rejected)]";
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${bgClass} ${textClass}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

export const PnlCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const value = props.value;
  if (typeof value !== "number") return <span>—</span>;
  
  const formatted = formatINR(value, { sign: true, decimals: 2 });
  const colorClass = value > 0 ? "text-[var(--positive)]" : value < 0 ? "text-[var(--negative)]" : "text-[var(--neutral)]";
  
  return (
    <span className={`cell-numeric ${colorClass}`}>
      {formatted}
    </span>
  );
};

export const PctCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const value = props.value;
  if (typeof value !== "number") return <span>—</span>;
  
  const formatted = `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  const colorClass = value > 0 ? "text-[var(--positive)]" : value < 0 ? "text-[var(--negative)]" : "text-[var(--neutral)]";
  
  return (
    <span className={`cell-numeric ${colorClass}`}>
      {formatted}
    </span>
  );
};
