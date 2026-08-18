"use client";

import {
 useMemo, useState } from "react";
import {
 Download, FileText, Scales, ArrowsLeftRight, Trophy, ArrowCircleUp, ArrowCircleDown, Receipt } from "@phosphor-icons/react";
import {
 toast } from "sonner";

import {
 KpiCard, PageHeader, Panel, Tag, TableSkeleton } from "@/components/ui-kit";
import {
 DataTable, type Column } from "@/components/data-table";
import {
 DonutChart, EquityChart, PnlBarChart } from "@/components/charts";
import {
 Button } from "@/components/ui/button";
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
 Skeleton } from "@/components/ui/skeleton";
import {
 Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 useSettings } from "@/components/settings-provider";
import {
 formatDate, formatNum, formatPct, pnlClass } from "@/lib/format";
import {

  useReportsSummary,
  useDailyPnl,
  useMonthlyPnl,
  usePnlByStrategyReport,
  usePnlByBrokerReport,
  useReportsEquityCurve,
  useChargesBreakdown,
  useBrokers,
  useOrders,
  useDashboardTotals,
} from "@/hooks/use-api";
import type { DailyPnl } from "@/lib/api";

const PALETTE = ["var(--primary)", "var(--profit)", "var(--warn)", "var(--loss)", "#8b5cf6"];

import { useTabLoadTime } from "@/hooks/use-tab-load-time";

export default function ReportsPage() {
  const { money } = useSettings();
  const [period, setPeriod] = useState("1M");
  const [broker, setBroker] = useState("all");

  const { data: summary, isLoading: summaryLoading } = useReportsSummary(period);
  const { data: dailyPnlData, isLoading: dailyLoading } = useDailyPnl(period === "7d" ? 7 : 30);
  const { data: monthlyPnlData } = useMonthlyPnl();
  const { data: byStrategyData } = usePnlByStrategyReport(period);
  const { data: byBrokerData } = usePnlByBrokerReport(period);
  const { data: equityCurveData, isLoading: curveLoading } = useReportsEquityCurve(period);
  const { data: chargesData } = useChargesBreakdown(period);
  const { data: brokersData } = useBrokers();
  const { data: ordersData } = useOrders();
  const { data: totals } = useDashboardTotals();

  useTabLoadTime("Reports", summaryLoading || dailyLoading || curveLoading);

  const brokers = brokersData || [];
  const orders = ordersData || [];
  const rows = dailyPnlData || [];

  const s = summary || {
    netPnl: 0,
    totalTrades: 0,
    winDays: 0,
    lossDays: 0,
    bestDay: 0,
    worstDay: 0,
    avgDailyPnl: 0,
    totalCharges: 0,
    winRate: 0,
  };

  const byStrategy = useMemo(() => {
    if (byStrategyData && byStrategyData.length > 0) {
      return byStrategyData.map(s => ({
        name: s.name,
        pnl: s.pnl,
        trades: 0,
        winRate: 0,
        segment: s.segment,
        status: s.status,
      }));
    }
    return [];
  }, [byStrategyData]);

  const bySegment = useMemo(() => {
    if (byStrategyData && byStrategyData.length > 0) {
      const map = new Map<string, number>();
      byStrategyData.forEach((s) => map.set(s.segment || 'Other', (map.get(s.segment || 'Other') ?? 0) + Math.abs(s.pnl)));
      return [...map.entries()].map(([name, value], i) => ({
        name,
        value,
        color: PALETTE[i % PALETTE.length] as string,
      }));
    }
    return [];
  }, [byStrategyData]);

  const byBroker = useMemo(() => {
    if (byBrokerData && byBrokerData.length > 0) {
      return byBrokerData.map(b => ({
        name: b.name,
        pnl: b.pnl,
        strategies: 0,
      }));
    }
    return [];
  }, [byBrokerData]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const rejected = orders.filter((o) => o.status.toLowerCase() === "rejected").length;
    const executed = orders.filter((o) => o.status.toLowerCase() === "executed" || o.status.toLowerCase() === "filled").length;
    return { total, rejected, executed, fillRate: (executed / Math.max(1, total)) * 100 };
  }, [orders]);

  const curve = useMemo(() => {
    if (equityCurveData && equityCurveData.length > 0) {
      return equityCurveData.map(p => ({
        date: p.date,
        equity: p.value,
        pnl: p.dailyPnl,
      }));
    }
    return [];
  }, [equityCurveData]);

  const dayCols: Column<DailyPnl>[] = [
    { key: "d", header: "Date", sortable: true, sortValue: (d) => d.date, cell: (d) => <span className="num">{formatDate(`${d.date}T00:00:00Z`)}</span> },
    { key: "t", header: "Trades", align: "right", sortable: true, sortValue: (d) => d.trades, cell: (d) => <span className="num">{d.trades}</span> },
    { key: "p", header: "Net P&L", align: "right", sortable: true, sortValue: (d) => d.pnl, cell: (d) => <span className={`num ${pnlClass(d.pnl)}`}>{money(d.pnl, { decimals: 0, sign: true })}</span> },
    { key: "a", header: "Avg / trade", align: "right", cell: (d) => <span className="num text-muted-foreground">{money(d.pnl / Math.max(1, d.trades), { decimals: 0, sign: true })}</span> },
    { key: "r", header: "Result", cell: (d) => <Tag className={d.pnl >= 0 ? "text-profit" : "text-loss"}>{d.pnl >= 0 ? "Profit day" : "Loss day"}</Tag> },
  ];

  const exportCsv = (name: string) => toast.success(`${name} exported`, { description: "CSV download started (simulated)" });

  return (
    <div className="space-y-3">
      <PageHeader
        title="Reports & Analytics"
        description="Realised P&L, cost breakdown and performance attribution across strategies, brokers and segments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger className="h-7 w-40 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[12px]">All brokers</SelectItem>
                {brokers.map((b) => <SelectItem key={b.id} value={b.id} className="text-[12px]">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1W" className="text-[12px]">Last 7 days</SelectItem>
                <SelectItem value="1M" className="text-[12px]">Last 30 days</SelectItem>
                <SelectItem value="3M" className="text-[12px]">Last 90 days</SelectItem>
                <SelectItem value="1Y" className="text-[12px]">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => exportCsv("P&L statement")}>
              <Download className="size-3" weight="bold" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => toast.info("Tax P&L statement queued", { description: "You'll be notified when the PDF is ready." })}>
              <FileText className="size-3" weight="duotone" /> Tax P&L
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Net P&L" value={money(s.netPnl, { decimals: 0, sign: true })} tone={s.netPnl >= 0 ? "profit" : "loss"} sub={`${rows.length} sessions`} loading={summaryLoading} icon={<Scales className="size-5 text-emerald-400" weight="duotone" />} />
        <KpiCard label="Total trades" value={formatNum(s.totalTrades, 0)} sub={`${orderStats.total} orders placed`} loading={summaryLoading} icon={<ArrowsLeftRight className="size-5 text-blue-400" weight="duotone" />} />
        <KpiCard label="Win days" value={`${s.winDays}/${s.winDays + s.lossDays}`} sub={formatPct(s.winRate, 1, false)} loading={summaryLoading} icon={<Trophy className="size-5 text-amber-400" weight="duotone" />} />
        <KpiCard label="Best day" value={money(s.bestDay, { decimals: 0, sign: true })} tone="profit" loading={summaryLoading} icon={<ArrowCircleUp className="size-5 text-emerald-500" weight="duotone" />} />
        <KpiCard label="Worst day" value={money(s.worstDay, { decimals: 0, sign: true })} tone="loss" loading={summaryLoading} icon={<ArrowCircleDown className="size-5 text-rose-500" weight="duotone" />} />
        <KpiCard label="Charges & taxes" value={money(s.totalCharges, { decimals: 0 })} tone="warn" sub="Brokerage + STT + GST" loading={summaryLoading} icon={<Receipt className="size-5 text-slate-400" weight="duotone" />} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Cumulative equity" subtitle="Realised + unrealised, period to date" className="xl:col-span-2">
          {curveLoading ? <Skeleton className="h-[250px]" /> : <EquityChart data={curve} height={250} />}
        </Panel>
        <Panel title="Capital by segment" subtitle="Equity / Futures / Options split">
          <DonutChart data={bySegment} height={250} />
        </Panel>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="h-8">
          <TabsTrigger value="daily" className="text-[12px]">Daily</TabsTrigger>
          <TabsTrigger value="monthly" className="text-[12px]">Monthly</TabsTrigger>
          <TabsTrigger value="strategy" className="text-[12px]">By strategy</TabsTrigger>
          <TabsTrigger value="broker" className="text-[12px]">By broker</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-3 space-y-3">
          <Panel title="Day-wise P&L" subtitle={`Last ${rows.length} sessions`}>
            <PnlBarChart data={rows.map((d) => ({ name: d.date.slice(5), pnl: d.pnl }))} height={220} />
          </Panel>
          <Panel title="Session ledger" bodyClassName="p-0">
            {dailyLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : (
              <DataTable columns={dayCols} rows={[...rows].reverse()} rowKey={(d) => d.date} maxHeight="22rem" dense />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="monthly" className="mt-3">
          <Panel title="Month-wise P&L" subtitle="Rolling 12 months">
            <PnlBarChart data={(monthlyPnlData || []).map((m) => ({ name: m.monthName || m.month, pnl: m.pnl }))} height={280} />
          </Panel>
        </TabsContent>

        <TabsContent value="strategy" className="mt-3 grid gap-3 xl:grid-cols-2">
          <Panel title="P&L attribution" subtitle="Overall by strategy">
            <PnlBarChart data={byStrategy} xKey="name" height={320} vertical />
          </Panel>
          <Panel title="Strategy scorecard" bodyClassName="p-0">
            <DataTable
              columns={[
                { key: "n", header: "Strategy", cell: (s: (typeof byStrategy)[number]) => <span className="text-[12px]">{s.name}</span> },
                { key: "seg", header: "Segment", cell: (s) => <Tag>{s.segment}</Tag> },
                { key: "st", header: "Status", cell: (s) => <Tag>{s.status}</Tag> },
                { key: "p", header: "P&L", align: "right", cell: (s) => <span className={`num ${pnlClass(s.pnl)}`}>{money(s.pnl, { decimals: 0, sign: true })}</span> },
              ]}
              rows={byStrategy}
              rowKey={(s) => s.name}
              maxHeight="20rem"
              dense
            />
          </Panel>
        </TabsContent>

        <TabsContent value="broker" className="mt-3 grid gap-3 xl:grid-cols-2">
          <Panel title="P&L by broker">
            <PnlBarChart data={byBroker} xKey="name" height={280} vertical />
          </Panel>
          <Panel title="Execution quality" subtitle="Order fills across the period">
            <dl className="grid grid-cols-2 gap-y-2 text-[12px]">
              <dt className="text-muted-foreground">Orders placed</dt>
              <dd className="num text-right">{orderStats.total}</dd>
              <dt className="text-muted-foreground">Executed</dt>
              <dd className="num text-right text-profit">{orderStats.executed}</dd>
              <dt className="text-muted-foreground">Rejected</dt>
              <dd className="num text-right text-loss">{orderStats.rejected}</dd>
              <dt className="text-muted-foreground">Fill rate</dt>
              <dd className="num text-right">{orderStats.fillRate.toFixed(1)}%</dd>
              <dt className="text-muted-foreground">Deployed capital</dt>
              <dd className="num text-right">{money(totals?.deployed || 0, { decimals: 0 })}</dd>
            </dl>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
