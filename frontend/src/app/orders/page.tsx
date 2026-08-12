"use client";

import { useMemo, useState } from "react";

import { PageHeader, Panel, StatusPill, SideTag, Tag, KpiCard } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSettings } from "@/components/settings-provider";
import { useOrders, useStrategies, useBrokers } from "@/hooks/use-api";
import { formatDateTime, formatNum, formatTime } from "@/lib/format";
import type { Order } from "@/lib/api";

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[150px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num mt-0.5 text-[12px]">{value}</div>
    </div>
  );
}

export default function OrdersPage() {
  const { money } = useSettings();
  const { data: orders = [], isLoading } = useOrders();
  const { data: strategies = [] } = useStrategies();
  const { data: brokers = [] } = useBrokers();

  const [status, setStatus] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [broker, setBroker] = useState("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Order | null>(null);

  const strategyById = (id: string) => strategies.find((s) => s.id === id);
  const brokerById = (id: string) => brokers.find((b) => b.id === id);

  const normalizeStatus = (s: string) => (s || "").toLowerCase();

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        const orderStatus = normalizeStatus(o.status);
        const matchStatus =
          status === "all" ||
          orderStatus === status ||
          (status === "executed" && (orderStatus === "filled" || orderStatus === "executed")) ||
          (status === "pending" && orderStatus === "pending") ||
          (status === "rejected" && (orderStatus === "rejected" || orderStatus === "cancelled"));
        const matchStrategy =
          strategy === "all" || o.strategyId === strategy || o.strategy_id === strategy;
        const matchBroker = broker === "all" || o.brokerId === broker || o.broker_id === broker;
        const matchSearch =
          q === "" ||
          o.symbol.toLowerCase().includes(q.toLowerCase()) ||
          o.id.toLowerCase().includes(q.toLowerCase());
        return matchStatus && matchStrategy && matchBroker && matchSearch;
      }),
    [orders, status, strategy, broker, q]
  );

  const counts = {
    executed: orders.filter(
      (o) => normalizeStatus(o.status) === "executed" || normalizeStatus(o.status) === "filled"
    ).length,
    pending: orders.filter((o) => normalizeStatus(o.status) === "pending").length,
    rejected: orders.filter((o) => normalizeStatus(o.status) === "rejected").length,
    cancelled: orders.filter((o) => normalizeStatus(o.status) === "cancelled").length,
  };

  const cols: Column<Order>[] = [
    {
      key: "time",
      header: "Time",
      sortable: true,
      sortValue: (o) => o.timestamp || o.time || "",
      cell: (o) => (
        <span className="num text-muted-foreground">
          {formatTime(o.timestamp || o.time || "")}
        </span>
      ),
    },
    {
      key: "id",
      header: "Order ID",
      cell: (o) => <span className="num text-[11px] text-muted-foreground">{o.id}</span>,
    },
    {
      key: "sym",
      header: "Instrument",
      sortable: true,
      sortValue: (o) => o.symbol,
      cell: (o) => (
        <div>
          <div className="num font-medium">{o.symbol}</div>
          <div className="mt-0.5 flex gap-1">
            {o.segment && <Tag>{o.segment}</Tag>}
            {o.product && <Tag>{o.product}</Tag>}
          </div>
        </div>
      ),
    },
    {
      key: "strat",
      header: "Strategy",
      cell: (o) => (
        <Tag>
          {strategyById(o.strategyId || o.strategy_id || "")?.name || "Manual"}
        </Tag>
      ),
    },
    {
      key: "broker",
      header: "Broker",
      cell: (o) => (
        <Tag>{brokerById(o.brokerId || o.broker_id || "")?.name || "—"}</Tag>
      ),
    },
    {
      key: "side",
      header: "Side",
      cell: (o) => <SideTag side={o.side as "BUY" | "SELL"} />,
    },
    {
      key: "type",
      header: "Type",
      cell: (o) => (
        <span className="num text-muted-foreground">
          {o.order_type || o.type || "MARKET"}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      sortable: true,
      sortValue: (o) => o.quantity || o.qty || 0,
      cell: (o) => <span className="num">{o.quantity || o.qty}</span>,
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      sortable: true,
      sortValue: (o) => o.price || 0,
      cell: (o) => <span className="num">{formatNum(o.price || 0)}</span>,
    },
    {
      key: "fill",
      header: "Avg Fill",
      align: "right",
      cell: (o) => (
        <span className="num">
          {o.average_price || o.avgFill ? formatNum(o.average_price || o.avgFill || 0) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusPill status={o.status} />,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (o) => (
        <span className="block max-w-[260px] truncate text-[11px] text-loss">
          {o.reason ?? ""}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Orderbook" description="Every order routed by the execution engine today" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard loading={isLoading} label="Executed" value={`${counts.executed}`} tone="profit" />
        <KpiCard loading={isLoading} label="Pending" value={`${counts.pending}`} tone="warn" />
        <KpiCard loading={isLoading} label="Rejected" value={`${counts.rejected}`} tone="loss" />
        <KpiCard loading={isLoading} label="Cancelled" value={`${counts.cancelled}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol / order ID…"
          className="h-7 w-56 text-xs"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            ["all", "All status"],
            ["executed", "Executed"],
            ["pending", "Pending"],
            ["rejected", "Rejected"],
            ["cancelled", "Cancelled"],
          ]}
        />
        <FilterSelect
          value={strategy}
          onChange={setStrategy}
          options={[
            ["all", "All strategies"],
            ...strategies.map((s) => [s.id, s.name] as [string, string]),
          ]}
        />
        <FilterSelect
          value={broker}
          onChange={setBroker}
          options={[
            ["all", "All brokers"],
            ...brokers.map((b) => [b.id, b.name] as [string, string]),
          ]}
        />
        <Input type="date" className="h-7 w-36 text-xs" />
        <span className="num ml-auto text-[11px] text-muted-foreground">{rows.length} orders</span>
      </div>

      <Panel bodyClassName="" live>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(o) => o.id}
          maxHeight="calc(100vh - 20rem)"
          loading={isLoading}
          onRowClick={setActive}
        />
      </Panel>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="num">{active.symbol}</SheetTitle>
                <SheetDescription className="num">
                  {active.id} · {formatDateTime(active.timestamp || active.time || "")}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Side" value={<SideTag side={active.side as "BUY" | "SELL"} />} />
                  <Field label="Status" value={<StatusPill status={active.status} />} />
                  <Field label="Order type" value={active.order_type || active.type || "MARKET"} />
                  <Field label="Product" value={active.product || "MIS"} />
                  <Field label="Quantity" value={String(active.quantity || active.qty || 0)} />
                  <Field label="Price" value={formatNum(active.price || 0)} />
                  <Field
                    label="Avg fill"
                    value={
                      active.average_price || active.avgFill
                        ? formatNum(active.average_price || active.avgFill || 0)
                        : "—"
                    }
                  />
                  <Field
                    label="Broker"
                    value={brokerById(active.brokerId || active.broker_id || "")?.name ?? "—"}
                  />
                  <Field
                    label="Strategy"
                    value={
                      strategyById(active.strategyId || active.strategy_id || "")?.name ?? "Manual"
                    }
                  />
                  <Field label="Segment" value={active.segment || "—"} />
                </div>

                {active.reason && (
                  <div className="rounded border border-loss/30 bg-loss-muted px-3 py-2 text-[11px] text-loss">
                    {active.reason}
                  </div>
                )}

                {active.lifecycle && active.lifecycle.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Order lifecycle
                    </h3>
                    <ol className="space-y-3 border-l border-border pl-4">
                      {active.lifecycle.map((step, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                          <div className="text-[12px]">{step.label}</div>
                          <div className="num text-[10px] text-muted-foreground">
                            {formatDateTime(step.t)}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
