"use client";

import {
 useMemo, useState } from "react";
import Link from "next/link";
import {

  ChartLineUp as Activity, Cube as Boxes, CurrencyInr as IndianRupee, Stack as Layers, PiggyBank, Target, TrendDown as TrendingDown, TrendUp as TrendingUp, Wallet,  } from "@phosphor-icons/react";

import {
 KpiCard, PageHeader, Panel, Sparkline, StatusPill, Tag, SideTag, TableSkeleton } from "@/components/ui-kit";
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
 formatNum, formatPct, formatTime, pnlClass } from "@/lib/format";
import {

  useDashboardTotals,
  useEquityCurve,
  useIntradayCurve,
  useStrategies,
  usePositions,
  useOrders,
  useBrokers,
  usePnlByStrategy,
  useAllocation,
  useTopMovers,
} from "@/hooks/use-api";
import { useTabLoadTime } from "@/hooks/use-tab-load-time";
import type { Strategy, Broker, Order, Position } from "@/lib/api";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "All"] as const;

export default function Dashboard() {
  const { money, strategyFilter, brokerFilter } = useSettings();
  const [range, setRange] = useState<(typeof RANGES)[number]>("3M");

  // API Hooks
  const { data: totals, isLoading: totalsLoading } = useDashboardTotals();
  const { data: equityCurveData, isLoading: curveLoading } = useEquityCurve(range === "1D" ? "1D" : range);
  const { data: intradayData } = useIntradayCurve();
  const { data: strategiesData, isLoading: strategiesLoading } = useStrategies();
  const { data: positionsData } = usePositions();
  const { data: ordersData, isLoading: ordersLoading } = useOrders();
  const { data: brokersData, isLoading: brokersLoading } = useBrokers();
  const { data: pnlByStrategyData } = usePnlByStrategy();
  const { data: allocationData } = useAllocation();
  const { data: topMoversData } = useTopMovers();

  useTabLoadTime("Dashboard", totalsLoading || curveLoading || strategiesLoading || ordersLoading || brokersLoading);

  const curve = useMemo(() => {
    if (range === "1D" && intradayData) return intradayData;
    return equityCurveData || [];
  }, [range, equityCurveData, intradayData]);

  const strategies = strategiesData || [];
  const positions = positionsData || [];
  const orders = ordersData || [];
  const brokers = brokersData || [];

  const filteredStrategies = strategies.filter(
    (s) =>
      (strategyFilter === "all" || s.id === strategyFilter) &&
      (brokerFilter === "all" || (s.brokers || []).includes(brokerFilter)),
  );

  const recentOrders = orders
    .filter(
      (o) =>
        (strategyFilter === "all" || o.strategyId === strategyFilter || o.strategy_id === strategyFilter) &&
        (brokerFilter === "all" || o.brokerId === brokerFilter),
    )
    .slice(0, 14);

  const pnlByStrategy = pnlByStrategyData || filteredStrategies
    .filter((s) => s.status !== "draft" && s.status !== "DRAFT")
    .map((s) => ({
      name: s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name,
      pnl: s.todayPnl || s.todays_pnl || 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const allocation = allocationData || brokers.map((b) => ({
    name: b.name,
    value: b.marginUsed || b.funds || 0,
    color: `var(--chart-${(brokers.indexOf(b) % 5) + 1})`,
  }));

  const gainers = topMoversData?.gainers || [];
  const losers = topMoversData?.losers || [];

  const brokerById = (id: string) => brokers.find((b) => b.id === id);
  const strategyById = (id: string) => strategies.find((s) => s.id === id);

  const strategyCols: Column<Strategy>[] = [
    {
      key: "name",
      header: "Strategy",
      sortable: true,
      sortValue: (s) => s.name,
      cell: (s) => (
        <Link href={`/strategies/${s.id}`} className="hover:text-primary">
          <div className="font-medium">{s.name}</div>
          <div className="mt-0.5 flex gap-1">
            <Tag>{s.segment || s.type}</Tag>
            {(s.brokers || []).slice(0, 2).map((b) => (
              <Tag key={b}>{brokerById(b)?.name || b}</Tag>
            ))}
          </div>
        </Link>
      ),
    },
    { key: "status", header: "Status", cell: (s) => <StatusPill status={s.status.toLowerCase()} dot /> },
    {
      key: "today",
      header: "Today P&L",
      align: "right",
      sortable: true,
      sortValue: (s) => s.todayPnl || s.todays_pnl || 0,
      cell: (s) => {
        const pnl = s.todayPnl || s.todays_pnl || 0;
        return <span className={`num ${pnlClass(pnl)}`}>{money(pnl, { sign: true, decimals: 0 })}</span>;
      },
    },
    {
      key: "overall",
      header: "Overall P&L",
      align: "right",
      sortable: true,
      sortValue: (s) => s.overallPnl || s.total_pnl || 0,
      cell: (s) => {
        const pnl = s.overallPnl || s.total_pnl || 0;
        return <span className={`num ${pnlClass(pnl)}`}>{money(pnl, { sign: true, decimals: 0 })}</span>;
      },
    },
    {
      key: "spark",
      header: "Trend",
      cell: (s) => s.spark ? <Sparkline data={s.spark} positive={(s.overallPnl || s.total_pnl || 0) >= 0} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "pos",
      header: "Open",
      align: "right",
      sortable: true,
      sortValue: (s) => s.openPositions || 0,
      cell: (s) => <span className="num">{s.openPositions || 0}</span>,
    },
    {
      key: "win",
      header: "Win %",
      align: "right",
      sortable: true,
      sortValue: (s) => s.winRate || s.win_rate || 0,
      cell: (s) => <span className="num">{((s.winRate || s.win_rate || 0) * 100).toFixed(1)}%</span>,
    },
    {
      key: "sharpe",
      header: "Sharpe",
      align: "right",
      sortable: true,
      sortValue: (s) => s.sharpe || s.sharpe_ratio || 0,
      cell: (s) => <span className="num">{(s.sharpe || s.sharpe_ratio || 0).toFixed(2)}</span>,
    },
    {
      key: "signal",
      header: "Last Signal",
      align: "right",
      cell: (s) => <span className="num text-muted-foreground">{s.lastSignal ? formatTime(s.lastSignal) : "—"}</span>,
    },
  ];

  const orderCols: Column<Order>[] = [
    { key: "time", header: "Time", cell: (o) => <span className="num text-muted-foreground">{formatTime(o.time || o.timestamp || "")}</span> },
    {
      key: "sym",
      header: "Instrument",
      cell: (o) => (
        <div>
          <div className="num font-medium">{o.symbol}</div>
          <div className="mt-0.5 flex gap-1">
            <Tag>{strategyById(o.strategyId || o.strategy_id || "")?.name || "Manual"}</Tag>
          </div>
        </div>
      ),
    },
    { key: "side", header: "Side", cell: (o) => <SideTag side={o.side as "BUY" | "SELL"} /> },
    { key: "type", header: "Type", cell: (o) => <span className="num text-muted-foreground">{o.type || o.order_type}</span> },
    { key: "qty", header: "Qty", align: "right", cell: (o) => <span className="num">{o.qty || o.quantity}</span> },
    { key: "price", header: "Price", align: "right", cell: (o) => <span className="num">{formatNum(o.price || o.avgFill || o.average_price || 0)}</span> },
    { key: "status", header: "Status", cell: (o) => <StatusPill status={o.status.toLowerCase()} /> },
  ];

  const brokerCols: Column<Broker>[] = [
    {
      key: "name",
      header: "Broker",
      cell: (b) => (
        <Link href={`/brokers/${b.id}`} className="font-medium hover:text-primary">
          {b.name}
          <span className="num ml-1.5 text-[10px] text-muted-foreground">{b.clientId}</span>
        </Link>
      ),
    },
    { key: "status", header: "Status", cell: (b) => <StatusPill status={b.status.toLowerCase()} dot /> },
    { key: "funds", header: "Funds", align: "right", cell: (b) => <span className="num">{money(b.funds || 0, { decimals: 0 })}</span> },
    { key: "used", header: "Margin Used", align: "right", cell: (b) => <span className="num text-warn">{money(b.marginUsed || 0, { decimals: 0 })}</span> },
    { key: "avail", header: "Margin Avl.", align: "right", cell: (b) => <span className="num text-profit">{money(b.marginAvailable || 0, { decimals: 0 })}</span> },
    {
      key: "util",
      header: "Utilisation",
      align: "right",
      cell: (b) => {
        const pct = b.funds ? ((b.marginUsed || 0) / b.funds) * 100 : 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${pct > 70 ? "bg-loss" : pct > 45 ? "bg-warn" : "bg-profit"}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="num w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    { key: "strats", header: "Strategies", align: "right", cell: (b) => <span className="num">{b.strategies || 0}</span> },
  ];

  const moverCols: Column<Position>[] = [
    {
      key: "sym",
      header: "Instrument",
      cell: (p) => (
        <div>
          <div className="num font-medium">{p.symbol}</div>
          <div className="mt-0.5"><Tag>{strategyById(p.strategyId || "")?.name || p.strategy_name || "Manual"}</Tag></div>
        </div>
      ),
    },
    { key: "chg", header: "Day %", align: "right", cell: (p) => <span className={`num ${pnlClass(p.dayChange || 0)}`}>{formatPct(p.dayChange || 0)}</span> },
    {
      key: "pnl",
      header: "Unrealised",
      align: "right",
      cell: (p) => <span className={`num ${pnlClass(p.unrealized || 0)}`}>{money(p.unrealized || 0, { sign: true, decimals: 0 })}</span>,
    },
  ];

  if (totalsLoading) {
    return (
      <div className="space-y-6 px-4 py-6">
        <PageHeader title="Dashboard" description="Loading..." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[400px] rounded-xl xl:col-span-2" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  const t = totals || {
    portfolioValue: 0,
    deployed: 0,
    todayPnl: 0,
    todayPnlPct: 0,
    overallPnl: 0,
    overallPnlPct: 0,
    activeStrategies: 0,
    totalStrategies: 0,
    openPositions: 0,
    winRate: 0,
    maxDrawdown: 0,
    marginAvailable: 0,
    marginUsed: 0,
    funds: 1,
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        description="Consolidated live view across all strategies and broker accounts · NSE/BSE"
        actions={
          <Button asChild size="sm" className="h-9 px-4 font-semibold shadow-sm">
            <Link href="/strategies/new">New Strategy</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <KpiCard label="Portfolio Value" value={money(t.portfolioValue, { decimals: 0 })} icon={<Wallet className="size-5 text-blue-400" weight="duotone" />} />
        <KpiCard label="Capital Deployed" value={money(t.deployed, { decimals: 0 })} sub={`${((t.deployed / t.funds) * 100).toFixed(1)}% of funds`} icon={<Layers className="size-5 text-indigo-400" weight="duotone" />} />
        <KpiCard label="Today's P&L" value={money(t.todayPnl, { sign: true, decimals: 0 })} tone={t.todayPnl >= 0 ? "profit" : "loss"} delta={t.todayPnlPct} icon={<TrendingUp className="size-5 text-emerald-400" weight="duotone" />} />
        <KpiCard label="Overall P&L" value={money(t.overallPnl, { sign: true, decimals: 0 })} tone={t.overallPnl >= 0 ? "profit" : "loss"} delta={t.overallPnlPct} icon={<IndianRupee className="size-5 text-emerald-500" weight="duotone" />} />
        <KpiCard label="Active Strategies" value={`${t.activeStrategies}`} sub={`of ${t.totalStrategies} configured`} icon={<Boxes className="size-5 text-purple-400" weight="duotone" />} />
        <KpiCard label="Open Positions" value={`${t.openPositions}`} sub={`across ${brokers.length} brokers`} icon={<Activity className="size-5 text-cyan-400" weight="duotone" />} />
        <KpiCard label="Win Rate" value={`${t.winRate.toFixed(1)}%`} tone="profit" sub="last 30 sessions" icon={<Target className="size-5 text-green-400" weight="duotone" />} />
        <KpiCard label="Max Drawdown" value={`${t.maxDrawdown.toFixed(1)}%`} tone="loss" sub="peak-to-trough" icon={<TrendingDown className="size-5 text-rose-400" weight="duotone" />} />
        <KpiCard label="Available Margin" value={money(t.marginAvailable, { decimals: 0 })} sub="aggregated" icon={<PiggyBank className="size-5 text-amber-400" weight="duotone" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Equity Curve"
          subtitle="Cumulative account equity"
          live
          actions={
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 p-1">
              {RANGES.map((rg) => (
                <button
                  key={rg}
                  onClick={() => setRange(rg)}
                  className={`num rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === rg ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rg}
                </button>
              ))}
            </div>
          }
        >
          {curveLoading ? <Skeleton className="h-[300px]" /> : <EquityChart data={curve} height={300} />}
        </Panel>

        <Panel title="Capital Allocation by Broker" subtitle="Margin deployed">
          <DonutChart data={allocation} height={300} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Today's P&L by Strategy">
          <PnlBarChart data={pnlByStrategy} xKey="name" height={280} vertical />
        </Panel>
        <div className="grid gap-6">
          <Panel title="Top Gainers" subtitle="Open positions" bodyClassName="p-0">
            <div className="px-1"><DataTable columns={moverCols} rows={gainers} rowKey={(p) => p.id} maxHeight="14rem" dense /></div>
          </Panel>
          <Panel title="Top Losers" subtitle="Open positions" bodyClassName="p-0">
            <div className="px-1"><DataTable columns={moverCols} rows={losers} rowKey={(p) => p.id} maxHeight="14rem" dense /></div>
          </Panel>
        </div>
      </div>

      <Panel title="Strategy Performance" subtitle={`${filteredStrategies.length} strategies`} live bodyClassName="p-1">
        {strategiesLoading ? <TableSkeleton rows={5} cols={9} /> : <DataTable columns={strategyCols} rows={filteredStrategies} rowKey={(s) => s.id} maxHeight="30rem" />}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent Orders" subtitle="Across all strategies" live bodyClassName="p-1">
          {ordersLoading ? <TableSkeleton rows={5} cols={7} /> : <DataTable columns={orderCols} rows={recentOrders} rowKey={(o) => o.id} maxHeight="24rem" />}
        </Panel>
        <Panel title="Broker Account Snapshot" bodyClassName="p-1">
          {brokersLoading ? <TableSkeleton rows={3} cols={7} /> : <DataTable columns={brokerCols} rows={brokers} rowKey={(b) => b.id} maxHeight="24rem" />}
        </Panel>
      </div>
    </div>
  );
}
