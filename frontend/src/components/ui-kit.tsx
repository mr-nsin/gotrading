"use client";

import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";
import { formatPct, pnlClass } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverLift, TickerValue } from "@/components/motion";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  live,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  live?: boolean;
}) {
  return (
    <section className={cn("panel flex min-w-0 flex-col overflow-hidden", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
              {title}
              {live && <span className="live-dot" />}
            </h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1", bodyClassName ?? "p-3")}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  delta,
  icon,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "profit" | "loss" | "warn";
  delta?: number;
  icon?: ReactNode;
  loading?: boolean;
}) {
  const toneClass =
    tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "warn" ? "text-warn" : "text-foreground";

  return (
    <HoverLift>
      <div className="panel group relative overflow-hidden px-3 py-2.5 transition-colors hover:border-primary/40">
        <span className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground/70 transition-colors group-hover:text-primary">{icon}</span>}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-6 w-24" />
        ) : (
          <TickerValue
            value={value}
            className={cn("num mt-1.5 text-lg font-semibold leading-none", toneClass)}
          />
        )}
        <div className="mt-1.5 flex items-center gap-1.5">
          {typeof delta === "number" && (
            <span className={cn("num inline-flex items-center gap-0.5 text-[11px]", pnlClass(delta))}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {formatPct(delta)}
            </span>
          )}
          {sub && <span className="num truncate text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </HoverLift>
  );
}

export function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const rows = data.map((v, i) => ({ i, v }));
  const color = positive ? "var(--profit)" : "var(--loss)";
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`sp-${positive ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sp-${positive ? "up" : "dn"})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  live: "bg-profit-muted text-profit border-profit/30",
  connected: "bg-profit-muted text-profit border-profit/30",
  executed: "bg-profit-muted text-profit border-profit/30",
  active: "bg-profit-muted text-profit border-profit/30",
  completed: "bg-profit-muted text-profit border-profit/30",
  open: "bg-profit-muted text-profit border-profit/30",
  paused: "bg-warn-muted text-warn border-warn/30",
  pending: "bg-warn-muted text-warn border-warn/30",
  running: "bg-warn-muted text-warn border-warn/30",
  warning: "bg-warn-muted text-warn border-warn/30",
  token_expiring: "bg-warn-muted text-warn border-warn/30",
  backtest: "bg-primary/15 text-primary border-primary/30",
  info: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-loss-muted text-loss border-loss/30",
  error: "bg-loss-muted text-loss border-loss/30",
  critical: "bg-loss-muted text-loss border-loss/30",
  disconnected: "bg-loss-muted text-loss border-loss/30",
  draft: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
  closed: "bg-muted text-muted-foreground border-border",
};

export function StatusPill({ status, label, dot }: { status: string; label?: string; dot?: boolean }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        statusStyles[key] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {(label ?? status).replace(/_/g, " ")}
    </span>
  );
}

export function SideTag({ side }: { side: "BUY" | "SELL" }) {
  return (
    <span
      className={cn(
        "num inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold",
        side === "BUY" ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss",
      )}
    >
      {side}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">{message}</div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
