"use client";

import { KpiCard, Panel, EmptyState } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import type { Strategy } from "@/lib/api";

interface StrategyOverviewTabProps {
  strategy?: Strategy;
  loading?: boolean;
}

export function StrategyOverviewTab({ strategy, loading }: StrategyOverviewTabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!strategy) {
    return <EmptyState message="Strategy not found" />;
  }

  const todayPnl = strategy.todayPnl ?? strategy.todays_pnl ?? 0;
  const overallPnl = strategy.overallPnl ?? strategy.total_pnl ?? 0;
  const winRate = strategy.winRate ?? strategy.win_rate ?? 0;
  const sharpe = strategy.sharpe ?? strategy.sharpe_ratio ?? 0;
  const maxDd = strategy.maxDd ?? strategy.max_drawdown ?? 0;
  const capital = strategy.capital ?? strategy.capital_allocated ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Today's P&L"
          value={formatINR(todayPnl, { sign: true, decimals: 0 })}
          tone={todayPnl >= 0 ? "profit" : "loss"}
        />
        <KpiCard
          label="Overall P&L"
          value={formatINR(overallPnl, { sign: true, decimals: 0 })}
          tone={overallPnl >= 0 ? "profit" : "loss"}
        />
        <KpiCard label="Win Rate" value={`${winRate}%`} />
        <KpiCard label="Sharpe" value={sharpe.toFixed(2)} />
        <KpiCard label="Max DD" value={`${maxDd}%`} tone="loss" />
        <KpiCard label="Capital" value={formatINR(capital, { decimals: 0 })} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Strategy Equity Curve" live>
          <EmptyState message="Equity curve chart — coming soon" />
        </Panel>
        <Panel title="Primary Instrument" subtitle={strategy.instruments?.[0] ?? strategy.instrument ?? "—"} live>
          <EmptyState message="Candle chart — coming soon" />
        </Panel>
      </div>
    </div>
  );
}
