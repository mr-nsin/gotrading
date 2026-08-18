"use client";

import Link from "next/link";
import { Plus, Cards, PlayCircle, PauseCircle, PencilSimple } from "@phosphor-icons/react";

import { PageHeader, KpiCard } from "@/components/ui-kit";
import { TerminalGrid } from "@/components/terminal-grid";
import { Button } from "@/components/ui/button";
import { useStrategies } from "@/hooks/use-api";
import { useTabLoadTime } from "@/hooks/use-tab-load-time";
import { useRouter } from "next/navigation";

export default function StrategiesPage() {
  const { data: strategies = [], isLoading } = useStrategies();
  useTabLoadTime("Strategies", isLoading);
  const router = useRouter();

  const counts = {
    live: strategies.filter((s) => ["live", "running", "active"].includes((s.status || "").toLowerCase())).length,
    paused: strategies.filter((s) => (s.status || "").toLowerCase() === "paused").length,
    backtest: strategies.filter((s) => (s.status || "").toLowerCase() === "backtest").length,
    draft: strategies.filter((s) => (s.status || "").toLowerCase() === "draft").length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Strategies"
        description="Deploy, pause, clone and monitor every automated strategy"
        actions={
          <Button asChild size="sm" className="h-7 gap-1 text-xs">
            <Link href="/strategies/new">
              <Plus className="size-3.5" weight="bold" /> New strategy
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard loading={isLoading} label="Total" value={`${strategies.length}`} sub="strategies" icon={<Cards className="size-5 text-blue-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Live" value={`${counts.live}`} tone="profit" icon={<PlayCircle className="size-5 text-emerald-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Paused" value={`${counts.paused}`} tone="warn" icon={<PauseCircle className="size-5 text-amber-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Draft" value={`${counts.draft}`} icon={<PencilSimple className="size-5 text-slate-400" weight="duotone" />} />
      </div>

      <TerminalGrid
        variant="strategies"
        rowData={strategies}
        loading={isLoading}
        height="calc(100vh - 16rem)"
        onRowClick={(row) => router.push(`/strategies/${row.id}`)}
      />
    </div>
  );
}
