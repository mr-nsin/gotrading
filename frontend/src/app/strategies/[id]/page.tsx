"use client";

import Link from "next/link";
import {
 useParams } from "next/navigation";
import {
 Play, Pause, Square, ArrowLeft } from "@phosphor-icons/react";
import {
 toast } from "sonner";
import {
 useQueryClient } from "@tanstack/react-query";

import {
 PageHeader, StatusPill, Tag } from "@/components/ui-kit";
import {
 Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Button } from "@/components/ui/button";
import {
 Skeleton } from "@/components/ui/skeleton";
import {

  useStrategy,
  useStartStrategy,
  usePauseStrategy,
  useStopStrategy,
  useBrokers,
} from "@/hooks/use-api";
import {
 StrategyOverviewTab } from "@/components/strategy-detail/strategy-overview-tab";
import {
 StrategyPositionsTab } from "@/components/strategy-detail/strategy-positions-tab";
import {
 StrategyOrdersTab } from "@/components/strategy-detail/strategy-orders-tab";
import {
 StrategyPnlTab } from "@/components/strategy-detail/strategy-pnl-tab";
import {
 StrategyConfigTab } from "@/components/strategy-detail/strategy-config-tab";
import {
 StrategyLogsTab } from "@/components/strategy-detail/strategy-logs-tab";

const TAB_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "pnl", label: "P&L" },
  { value: "configuration", label: "Configuration" },
  { value: "logs", label: "Logs" },
] as const;

function normalizeStatus(status: string): "running" | "paused" | "stopped" {
  const key = status.toLowerCase();
  if (key === "live" || key === "running") return "running";
  if (key === "paused") return "paused";
  return "stopped";
}

export default function StrategyDetailPage() {
  const params = useParams();
  const strategyId = params.id as string;
  const queryClient = useQueryClient();

  const { data: strategy, isLoading, isError } = useStrategy(strategyId);
  const { data: brokers = [] } = useBrokers();
  const startMutation = useStartStrategy();
  const pauseMutation = usePauseStrategy();
  const stopMutation = useStopStrategy();

  const invalidateStrategy = () => {
    queryClient.invalidateQueries({ queryKey: ["strategies", strategyId] });
    queryClient.invalidateQueries({ queryKey: ["strategies"] });
  };

  const handleStart = () => {
    startMutation.mutate(strategyId, {
      onSuccess: () => {
        toast.success("Strategy started");
        invalidateStrategy();
      },
      onError: () => toast.error("Failed to start strategy"),
    });
  };

  const handlePause = () => {
    pauseMutation.mutate(strategyId, {
      onSuccess: () => {
        toast.success("Strategy paused");
        invalidateStrategy();
      },
      onError: () => toast.error("Failed to pause strategy"),
    });
  };

  const handleStop = () => {
    stopMutation.mutate(strategyId, {
      onSuccess: () => {
        toast.success("Strategy stopped");
        invalidateStrategy();
      },
      onError: () => toast.error("Failed to stop strategy"),
    });
  };

  const brokerName = (id: string) => {
    const broker = brokers.find(
      (b) => b.id === id || b.code === id || b.name.toLowerCase().replace(/\s+/g, "") === id,
    );
    return broker?.name ?? broker?.display_name ?? id;
  };

  const status = strategy ? normalizeStatus(strategy.status) : "stopped";

  const actionButtons = (
    <>
      {(status === "stopped") && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStart} disabled={startMutation.isPending}>
          <Play className="mr-1.5 size-3.5 text-profit" weight="fill" />
          Start
        </Button>
      )}
      {status === "running" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handlePause} disabled={pauseMutation.isPending}>
            <Pause className="mr-1.5 size-3.5 text-warn" weight="fill" />
            Pause
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStop} disabled={stopMutation.isPending}>
            <Square className="mr-1.5 size-3.5 text-loss" weight="fill" />
            Stop
          </Button>
        </>
      )}
      {status === "paused" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStart} disabled={startMutation.isPending}>
            <Play className="mr-1.5 size-3.5 text-profit" weight="fill" />
            Start
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStop} disabled={stopMutation.isPending}>
            <Square className="mr-1.5 size-3.5 text-loss" weight="fill" />
            Stop
          </Button>
        </>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-8 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !strategy) {
    return (
      <div className="space-y-3">
        <PageHeader title="Strategy not found" description="The requested strategy could not be loaded." />
        <Button asChild variant="outline" size="sm">
          <Link href="/strategies">
            <ArrowLeft className="mr-2 size-4" weight="bold" />
            Back to list
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={strategy.name}
        description={strategy.description}
        actions={
          <>
            <StatusPill status={strategy.status} dot />
            {strategy.segment && <Tag>{strategy.segment}</Tag>}
            {strategy.brokers?.map((b) => (
              <Tag key={b}>{brokerName(b)}</Tag>
            ))}
            {actionButtons}
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/strategies">
                <ArrowLeft className="mr-1.5 size-3.5" weight="bold" />
                Back
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="h-8">
          {TAB_ITEMS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-6 px-2.5 text-[11px]">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <StrategyOverviewTab strategy={strategy} />
        </TabsContent>

        <TabsContent value="positions" className="mt-3">
          <StrategyPositionsTab strategyId={strategyId} />
        </TabsContent>

        <TabsContent value="orders" className="mt-3">
          <StrategyOrdersTab strategyId={strategyId} />
        </TabsContent>

        <TabsContent value="pnl" className="mt-3">
          <StrategyPnlTab strategyId={strategyId} />
        </TabsContent>

        <TabsContent value="configuration" className="mt-3">
          <StrategyConfigTab strategy={strategy} />
        </TabsContent>

        <TabsContent value="logs" className="mt-3">
          <StrategyLogsTab strategyId={strategyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
