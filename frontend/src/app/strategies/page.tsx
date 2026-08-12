"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, Sparkline, StatusPill, Tag, KpiCard } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/components/settings-provider";
import { useStrategies, useStartStrategy, usePauseStrategy, useStopStrategy, useBrokers, useDeleteStrategy } from "@/hooks/use-api";
import { formatDateTime, pnlClass } from "@/lib/format";
import type { Strategy } from "@/lib/api";

export default function StrategiesPage() {
  const { money } = useSettings();
  const { data: strategies = [], isLoading } = useStrategies();
  const { data: brokers = [] } = useBrokers();
  const startMutation = useStartStrategy();
  const pauseMutation = usePauseStrategy();
  const stopMutation = useStopStrategy();
  const deleteMutation = useDeleteStrategy();

  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const brokerById = (id: string) => brokers.find((b) => b.id === id);

  const rows = useMemo(() => {
    return strategies.filter((s) => {
      const status = (s.status || "").toLowerCase();
      const matchesFilter =
        filter === "all" ||
        status === filter ||
        (filter === "live" && status === "running") ||
        (filter === "paused" && status === "paused");
      const matchesSearch =
        q === "" ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        (s.segment || s.type || "").toLowerCase().includes(q.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [strategies, filter, q]);

  const handleToggle = (id: string, checked: boolean) => {
    const strategy = strategies.find((s) => s.id === id);
    if (!strategy) return;

    setEnabled((e) => ({ ...e, [id]: checked }));
    
    if (checked) {
      startMutation.mutate(id, {
        onSuccess: () => toast.success(`${strategy.name} deployed live`),
        onError: () => {
          setEnabled((e) => ({ ...e, [id]: false }));
          toast.error(`Failed to start ${strategy.name}`);
        },
      });
    } else {
      pauseMutation.mutate(id, {
        onSuccess: () => toast.warning(`${strategy.name} paused`),
        onError: () => {
          setEnabled((e) => ({ ...e, [id]: true }));
          toast.error(`Failed to pause ${strategy.name}`);
        },
      });
    }
  };

  const isStrategyEnabled = (s: Strategy) => {
    if (s.id in enabled) return enabled[s.id];
    const status = (s.status || "").toLowerCase();
    return status === "live" || status === "running" || status === "active";
  };

  const handleClone = (s: Strategy) => {
    toast.success(`Cloned "${s.name}" as draft`);
  };

  const handleDelete = (s: Strategy) => {
    deleteMutation.mutate(s.id, {
      onSuccess: () => toast.error(`Deleted ${s.name}`),
      onError: () => toast.error(`Failed to delete ${s.name}`),
    });
  };

  const cols: Column<Strategy>[] = [
    {
      key: "toggle",
      header: "On",
      width: "48px",
      cell: (s) => (
        <Switch
          checked={isStrategyEnabled(s)}
          onCheckedChange={(v) => handleToggle(s.id, v)}
          className="scale-75"
        />
      ),
    },
    {
      key: "name",
      header: "Strategy",
      sortable: true,
      sortValue: (s) => s.name,
      cell: (s) => (
        <Link href={`/strategies/${s.id}`} className="block hover:text-primary">
          <div className="font-medium">{s.name}</div>
          {s.description && (
            <div className="truncate text-[11px] text-muted-foreground">{s.description}</div>
          )}
        </Link>
      ),
    },
    {
      key: "segment",
      header: "Segment",
      cell: (s) => <Tag>{s.segment || s.type || "—"}</Tag>,
    },
    {
      key: "brokers",
      header: "Brokers",
      cell: (s) => (
        <div className="flex flex-wrap gap-1">
          {(s.brokers || []).map((b) => (
            <Tag key={b}>{brokerById(b)?.name || b}</Tag>
          ))}
        </div>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      cell: (s) => <Tag className="uppercase">{s.mode || "auto"}</Tag>,
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StatusPill status={s.status} dot />,
    },
    {
      key: "today",
      header: "Today P&L",
      align: "right",
      sortable: true,
      sortValue: (s) => s.todayPnl || s.todays_pnl || 0,
      cell: (s) => {
        const pnl = s.todayPnl || s.todays_pnl || 0;
        return (
          <span className={`num ${pnlClass(pnl)}`}>
            {money(pnl, { sign: true, decimals: 0 })}
          </span>
        );
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
        return (
          <span className={`num ${pnlClass(pnl)}`}>
            {money(pnl, { sign: true, decimals: 0 })}
          </span>
        );
      },
    },
    {
      key: "spark",
      header: "Trend",
      cell: (s) =>
        s.spark ? (
          <Sparkline data={s.spark} positive={(s.overallPnl || s.total_pnl || 0) >= 0} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
      key: "capital",
      header: "Capital",
      align: "right",
      sortable: true,
      sortValue: (s) => s.capital_allocated || s.capital || 0,
      cell: (s) => (
        <span className="num">
          {money(s.capital_allocated || s.capital || 0, { decimals: 0 })}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last Signal",
      align: "right",
      cell: (s) => (
        <span className="num text-[11px] text-muted-foreground">
          {s.lastSignal ? formatDateTime(s.lastSignal) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => handleClone(s)}
            aria-label="Clone"
          >
            <Copy className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6 text-loss" aria-label="Delete">
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  All configuration, backtest history and logs for this strategy will be permanently
                  removed. Open positions must be squared off separately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleDelete(s)}
                >
                  Delete strategy
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const counts = {
    live: strategies.filter((s) => ["live", "running", "active"].includes((s.status || "").toLowerCase())).length,
    paused: strategies.filter((s) => (s.status || "").toLowerCase() === "paused").length,
    backtest: strategies.filter((s) => (s.status || "").toLowerCase() === "backtest").length,
    draft: strategies.filter((s) => (s.status || "").toLowerCase() === "draft").length,
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Strategies"
        description="Deploy, pause, clone and monitor every automated strategy"
        actions={
          <Button asChild size="sm" className="h-7 gap-1 text-xs">
            <Link href="/strategies/new">
              <Plus className="size-3.5" /> New strategy
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard loading={isLoading} label="Total" value={`${strategies.length}`} sub="strategies" />
        <KpiCard loading={isLoading} label="Live" value={`${counts.live}`} tone="profit" />
        <KpiCard loading={isLoading} label="Paused" value={`${counts.paused}`} tone="warn" />
        <KpiCard loading={isLoading} label="Draft" value={`${counts.draft}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-7">
            {["all", "live", "paused", "backtest", "draft"].map((v) => (
              <TabsTrigger key={v} value={v} className="h-6 px-2.5 text-[11px] capitalize">
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or segment…"
          className="h-7 w-56 text-xs"
        />
        <span className="num ml-auto text-[11px] text-muted-foreground">
          {rows.length} strategies
        </span>
      </div>

      <Panel bodyClassName="" live>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(s) => s.id}
          maxHeight="calc(100vh - 18rem)"
          loading={isLoading}
        />
      </Panel>
    </div>
  );
}
