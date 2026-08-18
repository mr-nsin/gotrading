"use client";

import {
 useMemo, useState } from "react";
import { Wallet, Vault, CurrencyInr, Bank, RocketLaunch, Stack } from "@phosphor-icons/react";

import {
 EmptyState, KpiCard, PageHeader, Panel, StatusPill, Tag, TableSkeleton } from "@/components/ui-kit";
import {
 DataTable, type Column } from "@/components/data-table";
import {
 DonutChart, EquityChart, PnlBarChart } from "@/components/charts";
import {
 Button } from "@/components/ui/button";
import {
 Skeleton } from "@/components/ui/skeleton";
import {
 useSettings } from "@/components/settings-provider";
import {
 formatNum, formatPct, pnlClass } from "@/lib/format";
import {

  useHoldings,
  usePortfolioSummary,
  useSectorAllocation,
  useNetWorthHistory,
  useBrokerCapital,
  useBrokers,
  useStrategies,
  usePositions,
  useDashboardTotals,
} from "@/hooks/use-api";
import type { Holding } from "@/lib/api";
import { useTabLoadTime } from "@/hooks/use-tab-load-time";

const RANGES = ["1W", "1M", "3M", "1Y"] as const;

const PALETTE = [
  "var(--primary)",
  "var(--profit)",
  "var(--warn)",
  "var(--loss)",
  "#8b5cf6",
  "#06b6d4",
];

export default function PortfolioPage() {
  const { money } = useSettings();
  const [range, setRange] = useState<(typeof RANGES)[number]>("3M");

  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: portfolioSummary } = usePortfolioSummary();
  const { data: sectorData } = useSectorAllocation();
  const { data: netWorthHistory, isLoading: curveLoading } = useNetWorthHistory(range);
  const { data: brokerCapitalData } = useBrokerCapital();
  const { data: brokersData, isLoading: brokersLoading } = useBrokers();
  const { data: strategiesData } = useStrategies();
  const { data: positionsData } = usePositions();
  const { data: totals } = useDashboardTotals();

  useTabLoadTime("Portfolio", holdingsLoading || curveLoading || brokersLoading);

  const holdingsList = holdings || [];
  const brokers = brokersData || [];
  const strategies = strategiesData || [];
  const positions = positionsData || [];

  const holdingsValue = holdingsList.reduce((a, h) => a + (h.value || 0), 0);
  const holdingsPnl = holdingsList.reduce((a, h) => a + (h.pnl || 0), 0);
  const invested = holdingsList.reduce((a, h) => a + (h.avg || 0) * (h.qty || 0), 0);
  const openExposure = positions.reduce((a, p) => a + Math.abs((p.qty || p.quantity || 0) * (p.ltp || 0)), 0);
  const netWorth = (totals?.funds || 0) + holdingsValue;

  const curve = useMemo(() => {
    if (netWorthHistory && netWorthHistory.length > 0) {
      return netWorthHistory.map(p => ({
        date: p.date,
        equity: p.value,
        pnl: p.value - (netWorthHistory[0]?.value || 0),
      }));
    }
    return [];
  }, [netWorthHistory]);

  const sectorAllocation = useMemo(() => {
    if (sectorData && sectorData.length > 0) {
      return sectorData;
    }
    const map = new Map<string, number>();
    holdingsList.forEach((h) => map.set(h.sector || 'Other', (map.get(h.sector || 'Other') ?? 0) + (h.value || 0)));
    return [...map.entries()].map(([name, value], i) => ({
      name,
      value: Number(value.toFixed(0)),
      color: PALETTE[i % PALETTE.length] as string,
    }));
  }, [sectorData, holdingsList]);

  const brokerAlloc = useMemo(
    () =>
      brokers.map((b) => ({
        name: b.name,
        funds: b.funds || 0,
        used: b.marginUsed || 0,
        util: ((b.marginUsed || 0) / Math.max(1, b.funds || 1)) * 100,
        status: b.status.toLowerCase(),
      })),
    [brokers],
  );

  const strategyAlloc = useMemo(
    () =>
      strategies
        .filter((s) => (s.capital || s.capital_allocated || 0) > 0)
        .map((s) => ({
          name: s.name,
          pnl: s.overallPnl || s.total_pnl || 0,
          capital: s.capital || s.capital_allocated || 0,
        }))
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 8),
    [strategies],
  );

  const cols: Column<Holding>[] = [
    { key: "sym", header: "Symbol", sortable: true, sortValue: (h) => h.symbol, cell: (h) => <span className="num font-medium">{h.symbol}</span> },
    { key: "sec", header: "Sector", cell: (h) => <Tag>{h.sector || 'Other'}</Tag> },
    { key: "qty", header: "Qty", align: "right", sortable: true, sortValue: (h) => h.qty, cell: (h) => <span className="num">{formatNum(h.qty, 0)}</span> },
    { key: "avg", header: "Avg", align: "right", cell: (h) => <span className="num text-muted-foreground">{formatNum(h.avg)}</span> },
    { key: "ltp", header: "LTP", align: "right", cell: (h) => <span className="num">{formatNum(h.ltp)}</span> },
    { key: "val", header: "Value", align: "right", sortable: true, sortValue: (h) => h.value, cell: (h) => <span className="num">{money(h.value, { decimals: 0 })}</span> },
    {
      key: "pnl",
      header: "Unrealised P&L",
      align: "right",
      sortable: true,
      sortValue: (h) => h.pnl,
      cell: (h) => (
        <span className={`num ${pnlClass(h.pnl)}`}>
          {money(h.pnl, { decimals: 0, sign: true })} <span className="text-[10px] opacity-70">{formatPct(h.pnlPct)}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Portfolio Overview"
        description="Consolidated net worth, holdings and capital allocation across all connected broker accounts."
        actions={
          <div className="flex items-center gap-1 rounded border border-border bg-surface-2 p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "secondary" : "ghost"}
                className="h-6 px-2 text-[11px]"
                onClick={() => setRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Net worth" value={money(netWorth, { decimals: 0 })} sub="Cash + holdings" icon={<Wallet className="size-5 text-blue-400" weight="duotone" />} />
        <KpiCard label="Holdings value" value={money(holdingsValue, { decimals: 0 })} sub={`Invested ${money(invested, { decimals: 0 })}`} icon={<Vault className="size-5 text-indigo-400" weight="duotone" />} />
        <KpiCard
          label="Holdings P&L"
          value={money(holdingsPnl, { decimals: 0, sign: true })}
          tone={holdingsPnl >= 0 ? "profit" : "loss"}
          delta={(holdingsPnl / Math.max(1, invested)) * 100}
          icon={<CurrencyInr className="size-5 text-emerald-400" weight="duotone" />}
        />
        <KpiCard label="Free cash" value={money(totals?.marginAvailable || 0, { decimals: 0 })} sub="Across brokers" icon={<Bank className="size-5 text-emerald-400" weight="duotone" />} />
        <KpiCard label="Deployed capital" value={money(totals?.deployed || 0, { decimals: 0 })} sub={`${totals?.activeStrategies || 0} live strategies`} icon={<RocketLaunch className="size-5 text-amber-400" weight="duotone" />} />
        <KpiCard
          label="Open exposure"
          value={money(openExposure, { decimals: 0 })}
          sub={`${positions.length} open positions`}
          tone="warn"
          icon={<Stack className="size-5 text-rose-400" weight="duotone" />}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Net worth curve" subtitle={`Equity trajectory · ${range}`} className="xl:col-span-2" live>
          {curveLoading ? <Skeleton className="h-[260px]" /> : <EquityChart data={curve} height={260} />}
        </Panel>
        <Panel title="Sector allocation" subtitle="By holding value">
          <DonutChart data={sectorAllocation} height={260} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Holdings" subtitle={`${holdingsList.length} instruments in demat`} bodyClassName="p-0" className="xl:col-span-2">
          {holdingsLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : (
            <DataTable columns={cols} rows={holdingsList} rowKey={(h) => h.symbol || h.id} maxHeight="22rem" dense />
          )}
        </Panel>
        <Panel title="Broker-wise capital" subtitle="Funds and margin utilisation" bodyClassName="p-3">
          <div className="space-y-2.5">
            {brokersLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : brokerAlloc.length === 0 ? (
              <EmptyState message="No brokers connected." />
            ) : (
              brokerAlloc.map((b) => (
                <div key={b.name} className="rounded border border-border bg-surface-2 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-medium">{b.name}</span>
                    <StatusPill status={b.status} dot />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="num">{money(b.funds, { decimals: 0 })}</span>
                    <span className="num">{b.util.toFixed(1)}% used</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted">
                    <div
                      className={b.util > 75 ? "h-full bg-loss" : b.util > 50 ? "h-full bg-warn" : "h-full bg-profit"}
                      style={{ width: `${Math.min(100, b.util)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Strategy-wise contribution" subtitle="Overall P&L by deployed strategy">
        <PnlBarChart data={strategyAlloc} xKey="name" height={280} vertical />
      </Panel>

      <p className="px-1 text-[11px] text-muted-foreground">
        Broker snapshots refresh every 30s. Holdings values use last traded price from{" "}
        {brokers[0]?.name ?? "primary broker"}.
      </p>
    </div>
  );
}
