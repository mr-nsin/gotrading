"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { KpiCard, PageHeader, Panel, SideTag, StatusPill, Tag, EmptyState, TableSkeleton } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { EquityChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBroker,
  useBrokerMarginHistory,
  useBrokerStrategies,
  useBrokerOrders,
  useBrokerPositions,
  useReauthenticateBroker,
  useDisconnectBroker,
} from "@/hooks/use-api";
import { useSettings } from "@/components/settings-provider";
import { formatDateTime, formatINR, formatNum, formatTime, pnlClass } from "@/lib/format";
import type { Order, Position } from "@/lib/api";

export default function BrokerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brokerId = params.id as string;
  const { money } = useSettings();

  const { data: broker, isLoading, isError } = useBroker(brokerId);
  const { data: marginHistory = [], isLoading: marginLoading } = useBrokerMarginHistory(brokerId);
  const { data: strategies = [], isLoading: strategiesLoading, isError: strategiesError } =
    useBrokerStrategies(brokerId);
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useBrokerOrders(brokerId);
  const { data: positions = [], isLoading: positionsLoading, isError: positionsError } =
    useBrokerPositions(brokerId);

  const reauthMutation = useReauthenticateBroker();
  const disconnectMutation = useDisconnectBroker();

  const funds = broker?.funds ?? broker?.balance ?? 0;
  const marginUsed = broker?.marginUsed ?? broker?.used ?? 0;
  const marginAvailable = broker?.marginAvailable ?? Math.max(funds - marginUsed, 0);
  const util = funds ? (marginUsed / funds) * 100 : 0;
  const openPositions = positions.filter(
    (p) => p.status?.toLowerCase() === "open" || p.status?.toLowerCase() === "active",
  );

  const handleReauthenticate = () => {
    reauthMutation.mutate(brokerId, {
      onSuccess: () => toast.success("Token refreshed"),
      onError: () => toast.error("Re-authentication failed"),
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(brokerId, {
      onSuccess: () => {
        toast.success("Broker disconnected");
        router.push("/brokers");
      },
      onError: () => toast.error("Failed to disconnect broker"),
    });
  };

  const ordCols: Column<Order>[] = [
    {
      key: "time",
      header: "Time",
      cell: (o) => (
        <span className="num text-muted-foreground">{formatTime(o.timestamp || o.time || "")}</span>
      ),
    },
    {
      key: "symbol",
      header: "Instrument",
      cell: (o) => <span className="num">{o.symbol}</span>,
    },
    {
      key: "side",
      header: "Side",
      cell: (o) => <SideTag side={o.side as "BUY" | "SELL"} />,
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      cell: (o) => <span className="num">{o.quantity ?? o.qty}</span>,
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (o) => <span className="num">{formatNum(o.price || 0)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusPill status={o.status} />,
    },
  ];

  const posCols: Column<Position>[] = [
    {
      key: "symbol",
      header: "Instrument",
      cell: (p) => <span className="num">{p.symbol}</span>,
    },
    {
      key: "strategy",
      header: "Strategy",
      cell: (p) => <Tag>{p.strategy_name || p.strategyId || "Manual"}</Tag>,
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      cell: (p) => <span className="num">{p.quantity ?? p.qty}</span>,
    },
    {
      key: "pnl",
      header: "P&L",
      align: "right",
      cell: (p) => {
        const pnl = p.unrealized ?? p.pnl ?? 0;
        return (
          <span className={`num ${pnlClass(pnl)}`}>
            {formatINR(pnl, { sign: true, decimals: 0 })}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !broker) {
    return (
      <div className="space-y-3">
        <PageHeader title="Broker not found" description="This broker account does not exist or was removed." />
        <Button asChild variant="outline" size="sm">
          <Link href="/brokers">
            <ArrowLeft className="mr-2 size-4" />
            All brokers
          </Link>
        </Button>
      </div>
    );
  }

  const description = [
    broker.code,
    broker.clientId ? `Client ID ${broker.clientId}` : null,
    broker.tokenExpiry ? `Token expiry ${formatDateTime(broker.tokenExpiry)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <PageHeader
        title={broker.name || broker.display_name || "Broker"}
        description={description}
        actions={
          <>
            <StatusPill status={broker.status} dot />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleReauthenticate}
              disabled={reauthMutation.isPending}
            >
              <RefreshCw className="size-3.5" />
              Re-authenticate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs text-loss hover:bg-loss-muted"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              <Unplug className="size-3.5" />
              Disconnect
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/brokers">
                <ArrowLeft className="mr-1 size-3.5" />
                All brokers
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Funds" value={money(funds, { decimals: 0 })} />
        <KpiCard label="Margin Used" value={money(marginUsed, { decimals: 0 })} tone="warn" />
        <KpiCard label="Margin Available" value={money(marginAvailable, { decimals: 0 })} tone="profit" />
        <KpiCard
          label="Utilisation"
          value={`${util.toFixed(1)}%`}
          tone={util > 70 ? "loss" : "neutral"}
        />
        <KpiCard label="Strategies" value={`${strategies.length || broker.strategies || 0}`} />
        <KpiCard label="Open Positions" value={`${openPositions.length}`} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Margin Utilisation (30 days)">
          {marginLoading ? (
            <Skeleton className="mx-3 mb-3 h-[220px]" />
          ) : marginHistory.length === 0 ? (
            <EmptyState message="Margin history unavailable — backend endpoint pending" />
          ) : (
            <EquityChart data={marginHistory} height={220} />
          )}
        </Panel>
        <Panel title="Strategies on this account" bodyClassName="p-3">
          {strategiesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : strategiesError ? (
            <EmptyState message="Unable to load linked strategies" />
          ) : strategies.length === 0 ? (
            <EmptyState message="No strategies linked to this broker" />
          ) : (
            <ul className="space-y-1.5">
              {strategies.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded border border-border bg-surface-2 px-2 py-1.5 text-[12px]"
                >
                  <Link
                    href={`/strategies/${s.id}`}
                    className="truncate hover:text-primary"
                  >
                    {s.name}
                  </Link>
                  <StatusPill status={s.status} />
                  <span className={`num ml-auto ${pnlClass(s.todayPnl)}`}>
                    {money(s.todayPnl, { sign: true, decimals: 0 })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-3">
          <Panel title="Order history" subtitle="Filtered to this broker" bodyClassName="" live>
            {ordersLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : ordersError ? (
              <EmptyState message="Unable to load orders — backend endpoint pending" />
            ) : (
              <DataTable
                columns={ordCols}
                rows={orders}
                rowKey={(o) => o.id}
                maxHeight="24rem"
                emptyMessage="No orders for this broker"
              />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="positions" className="mt-3">
          <Panel title="Positions" bodyClassName="" live>
            {positionsLoading ? (
              <TableSkeleton rows={8} cols={4} />
            ) : positionsError ? (
              <EmptyState message="Unable to load positions — backend endpoint pending" />
            ) : (
              <DataTable
                columns={posCols}
                rows={positions}
                rowKey={(p) => p.id}
                maxHeight="24rem"
                emptyMessage="No positions for this broker"
              />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
