"use client";

import {
 type ReactNode } from "react";
import {
 ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import {
 Area, AreaChart, ResponsiveContainer } from "recharts";

import {
 cn } from "@/lib/utils";
import {
 formatPct, pnlClass } from "@/lib/format";
import {
 Skeleton } from "@/components/ui/skeleton";
import {
 HoverLift, TickerValue } from "@/components/motion";
import {
 Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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
    <Card className={cn("flex min-w-0 flex-col overflow-hidden bg-card/40 backdrop-blur-sm border-border/60 shadow-sm", className)}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/40 px-4 py-3 space-y-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              {title}
              {live && <span className="live-dot" />}
            </CardTitle>
            {subtitle && <CardDescription className="mt-1 text-xs text-muted-foreground">{subtitle}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("min-w-0 flex-1", bodyClassName ?? "p-4")}>{children}</CardContent>
    </Card>
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
      <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:border-primary/40 bg-card/40 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md">
        <span className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <CardContent className="flex flex-1 flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium tracking-tight text-muted-foreground">{label}</span>
            {icon && <span className="text-muted-foreground/70 transition-colors group-hover:text-primary">{icon}</span>}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <TickerValue
                value={value}
                className={cn("num text-2xl font-bold tracking-tight leading-none", toneClass)}
              />
            )}
            {(typeof delta === "number" || sub) && (
              <div className="flex items-center gap-2">
                {typeof delta === "number" && (
                  <span className={cn("num inline-flex items-center gap-0.5 text-[11px] font-medium", pnlClass(delta))}>
                    {delta >= 0 ? <ArrowUpRight className="size-3" weight="bold" /> : <ArrowDownRight className="size-3" weight="bold" />}
                    {formatPct(delta)}
                  </span>
                )}
                {sub && <span className="num truncate text-[11px] text-muted-foreground">{sub}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
  live: "text-profit",
  connected: "text-profit",
  executed: "text-profit",
  active: "text-profit",
  completed: "text-profit",
  open: "text-profit",
  paused: "text-warn",
  pending: "text-warn",
  running: "text-warn",
  warning: "text-warn",
  token_expiring: "text-warn",
  backtest: "text-primary",
  info: "text-primary",
  rejected: "text-loss",
  error: "text-loss",
  critical: "text-loss",
  disconnected: "text-loss",
  draft: "text-muted-foreground",
  cancelled: "text-muted-foreground",
  closed: "text-muted-foreground",
};

export function StatusPill({ status, label, dot, className }: { status: string; label?: string; dot?: boolean; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
        statusStyles[key] ?? "text-muted-foreground",
        className
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
        "num inline-flex text-xs font-semibold",
        side === "BUY" ? "text-profit" : "text-loss",
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
        "inline-flex max-w-full truncate text-[13px] text-muted-foreground",
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
  title: ReactNode;
  description?: ReactNode;
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
