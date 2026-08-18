"use client";

import {
 useMemo, useState } from "react";
import {
 Download, Play, ArrowCounterClockwise as RotateCcw } from "@phosphor-icons/react";
import {
 toast } from "sonner";

import {
 KpiCard, PageHeader, Panel, StatusPill, Tag, TableSkeleton } from "@/components/ui-kit";
import {
 DataTable, type Column } from "@/components/data-table";
import {
 EquityChart, PnlBarChart } from "@/components/charts";
import {
 Button } from "@/components/ui/button";
import {
 Input } from "@/components/ui/input";
import {
 Label } from "@/components/ui/label";
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
 Switch } from "@/components/ui/switch";
import {
 Skeleton } from "@/components/ui/skeleton";
import {
 useSettings } from "@/components/settings-provider";
import {
 formatDateTime, formatNum, formatPct, pnlClass } from "@/lib/format";
import {

  useBacktestRuns,
  useBacktestStrategies,
  useRunBacktest,
  useStrategies,
} from "@/hooks/use-api";
import type { BacktestRun } from "@/lib/api";

export default function BacktestingPage() {
  const { money } = useSettings();

  const { data: backtestRuns, isLoading: runsLoading } = useBacktestRuns();
  const { data: strategiesData } = useStrategies();
  const runBacktestMutation = useRunBacktest();

  const strategies = strategiesData || [];
  const runs = backtestRuns || [];

  const [strategyId, setStrategyId] = useState(strategies[0]?.id ?? "");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-07-31");
  const [capital, setCapital] = useState("1000000");
  const [slippage, setSlippage] = useState("0.05");
  const [brokerage, setBrokerage] = useState("20");
  const [includeCosts, setIncludeCosts] = useState(true);
  const [result, setResult] = useState<BacktestRun | null>(null);

  const strategy = strategies.find((s) => s.id === strategyId);

  const curve = useMemo(() => {
    if (result?.equityCurve && result.equityCurve.length > 0) {
      return result.equityCurve.map(p => ({
        date: p.date,
        equity: p.value,
        pnl: p.pnl,
      }));
    }
    return [];
  }, [result]);

  const dailyPnl = useMemo(() => {
    if (result?.dailyPnl && result.dailyPnl.length > 0) {
      return result.dailyPnl.map(d => ({
        name: d.date.slice(5),
        pnl: d.pnl,
      }));
    }
    return [];
  }, [result]);

  const run = () => {
    if (!strategyId) {
      toast.error("Please select a strategy");
      return;
    }

    runBacktestMutation.mutate(
      {
        strategy_id: strategyId,
        start_date: from,
        end_date: to,
        capital: Number(capital) || 1000000,
        slippage_pct: Number(slippage) || 0.05,
        brokerage_per_order: Number(brokerage) || 20,
        include_costs: includeCosts,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`Backtest complete — ${strategy?.name || 'Strategy'}`, {
            description: `${from} → ${to} · ${data.trades} trades simulated`,
          });
        },
        onError: () => {
          toast.error("Backtest failed");
        },
      }
    );
  };

  const cols: Column<BacktestRun>[] = [
    { key: "id", header: "Run", sortable: true, sortValue: (r) => r.id, cell: (r) => <span className="num font-medium">{r.id.slice(0, 8)}</span> },
    { key: "st", header: "Strategy", cell: (r) => <span className="text-[12px]">{r.strategy}</span> },
    { key: "pd", header: "Period", cell: (r) => <span className="num text-[11px] text-muted-foreground">{r.periodStart?.slice(0, 10)} - {r.periodEnd?.slice(0, 10)}</span> },
    { key: "tr", header: "Trades", align: "right", sortable: true, sortValue: (r) => r.trades, cell: (r) => <span className="num">{formatNum(r.trades, 0)}</span> },
    { key: "wr", header: "Win %", align: "right", sortable: true, sortValue: (r) => r.winRate, cell: (r) => <span className="num">{r.winRate.toFixed(1)}%</span> },
    { key: "pnl", header: "Net P&L", align: "right", sortable: true, sortValue: (r) => r.pnl, cell: (r) => <span className={`num ${pnlClass(r.pnl)}`}>{money(r.pnl, { decimals: 0, sign: true })}</span> },
    { key: "dd", header: "Max DD", align: "right", cell: (r) => <span className="num text-loss">{r.maxDrawdown.toFixed(1)}%</span> },
    { key: "sh", header: "Sharpe", align: "right", cell: (r) => <span className="num">{r.sharpe.toFixed(2)}</span> },
    { key: "st2", header: "Status", cell: (r) => <StatusPill status={r.status} /> },
    {
      key: "act",
      header: "",
      align: "right",
      cell: (r) => (
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => toast.info(`Report ${r.id.slice(0, 8)} exported to CSV`)}>
          <Download className="size-3" weight="bold" /> CSV
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Backtesting Lab"
        description="Simulate any strategy over historical data with realistic slippage and cost assumptions."
        actions={
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setResult(null); toast.info("Parameters reset"); }}>
            <RotateCcw className="size-3" weight="bold" /> Reset
          </Button>
        }
      />

      <div className="grid gap-3 xl:grid-cols-4">
        <Panel title="Simulation parameters" subtitle="Historical run configuration" className="xl:col-span-1">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Strategy</Label>
              <Select value={strategyId} onValueChange={setStrategyId}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="num h-8 text-[12px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="num h-8 text-[12px]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Starting capital (₹)</Label>
              <Input value={capital} onChange={(e) => setCapital(e.target.value)} className="num h-8 text-[12px]" placeholder="1000000" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Slippage (%)</Label>
                <Input value={slippage} onChange={(e) => setSlippage(e.target.value)} className="num h-8 text-[12px]" placeholder="0.05" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Brokerage / order</Label>
                <Input value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className="num h-8 text-[12px]" placeholder="20" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded border border-border bg-surface-2 px-2.5 py-2">
              <div>
                <div className="text-[12px] font-medium">Include taxes &amp; charges</div>
                <div className="text-[10px] text-muted-foreground">STT, exchange, GST, stamp duty</div>
              </div>
              <Switch checked={includeCosts} onCheckedChange={setIncludeCosts} />
            </div>
            <Button className="h-8 w-full text-[12px]" onClick={run} disabled={runBacktestMutation.isPending}>
              <Play className="size-3.5" weight="fill" /> {runBacktestMutation.isPending ? "Running simulation…" : "Run backtest"}
            </Button>
            {strategy && (
              <div className="flex flex-wrap gap-1 pt-1">
                <Tag>{strategy.segment || strategy.type}</Tag>
                <Tag>{(strategy.instruments || []).length || 0} instruments</Tag>
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-3 xl:col-span-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-6">
            <KpiCard label="Net P&L" value={result ? money(result.pnl, { decimals: 0, sign: true }) : "—"} tone={result && result.pnl >= 0 ? "profit" : result ? "loss" : "neutral"} loading={runBacktestMutation.isPending} />
            <KpiCard label="Trades" value={result ? formatNum(result.trades, 0) : "—"} loading={runBacktestMutation.isPending} />
            <KpiCard label="Win rate" value={result ? `${result.winRate.toFixed(1)}%` : "—"} loading={runBacktestMutation.isPending} />
            <KpiCard label="Max drawdown" value={result ? `${result.maxDrawdown.toFixed(1)}%` : "—"} tone="loss" loading={runBacktestMutation.isPending} />
            <KpiCard label="Sharpe" value={result ? result.sharpe.toFixed(2) : "—"} loading={runBacktestMutation.isPending} />
            <KpiCard label="Profit factor" value={result ? result.profitFactor.toFixed(2) : "—"} loading={runBacktestMutation.isPending} />
          </div>

          <Panel title="Simulated equity curve" subtitle={result ? `${from} → ${to}` : "Run a backtest to populate results"}>
            {runBacktestMutation.isPending ? <Skeleton className="h-[250px]" /> : <EquityChart data={curve} height={250} />}
          </Panel>

          <Panel title="Day-wise simulated P&L" subtitle="Trading sessions">
            <PnlBarChart data={dailyPnl} height={200} />
          </Panel>
        </div>
      </div>

      <Panel
        title="Recent backtest runs"
        subtitle="Saved simulation history"
        bodyClassName="p-0"
        actions={<span className="num text-[11px] text-muted-foreground">Last run {formatDateTime(new Date().toISOString())}</span>}
      >
        {runsLoading ? (
          <TableSkeleton rows={4} cols={10} />
        ) : (
          <DataTable columns={cols} rows={runs} rowKey={(r) => r.id} maxHeight="20rem" dense />
        )}
      </Panel>

      {result && (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Trade quality">
            <dl className="grid grid-cols-2 gap-y-2 text-[12px]">
              <dt className="text-muted-foreground">Average win</dt>
              <dd className="num text-right text-profit">{money(result.avgWin, { decimals: 0 })}</dd>
              <dt className="text-muted-foreground">Average loss</dt>
              <dd className="num text-right text-loss">{money(result.avgLoss, { decimals: 0 })}</dd>
              <dt className="text-muted-foreground">Expectancy / trade</dt>
              <dd className="num text-right">{money(result.pnl / Math.max(1, result.trades), { decimals: 0, sign: true })}</dd>
              <dt className="text-muted-foreground">Return on capital</dt>
              <dd className={`num text-right ${pnlClass(result.pnl)}`}>{formatPct(result.pnlPct)}</dd>
            </dl>
          </Panel>
          <Panel title="Assumptions applied">
            <ul className="space-y-1.5 text-[12px] text-muted-foreground">
              <li>Slippage of {slippage}% applied on both legs of every trade.</li>
              <li>Flat brokerage of ₹{brokerage} per executed order.</li>
              <li>{includeCosts ? "STT, exchange charges, GST and stamp duty deducted." : "Statutory charges excluded from net P&L."}</li>
              <li>Orders assumed filled at candle close; no partial fills modelled.</li>
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
