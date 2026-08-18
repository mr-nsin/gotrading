"use client";

import { useState } from "react";
import { ListChecks, Hourglass, WarningCircle, XCircle } from "@phosphor-icons/react";

import { PageHeader, KpiCard, StatusPill, SideTag } from "@/components/ui-kit";
import { TerminalGrid } from "@/components/terminal-grid";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrders, useStrategies, useBrokers } from "@/hooks/use-api";
import { formatNum, formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/api";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num mt-0.5 text-[12px]">{value}</div>
    </div>
  );
}

const normalizeStatus = (s?: string) => {
  if (!s) return "unknown";
  const str = s.toLowerCase();
  if (["executed", "completed", "filled"].includes(str)) return "executed";
  if (["pending", "open", "trigger pending"].includes(str)) return "pending";
  if (["rejected", "error"].includes(str)) return "rejected";
  if (["cancelled", "canceled"].includes(str)) return "cancelled";
  return str;
};

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: strategies = [] } = useStrategies();
  const { data: brokers = [] } = useBrokers();

  const [active, setActive] = useState<Order | null>(null);

  const brokerById = (id: string) => brokers.find((b) => b.id === id);
  const strategyById = (id: string) => strategies.find((s) => s.id === id);

  const counts = {
    executed: orders.filter((o) => normalizeStatus(o.status) === "executed").length,
    pending: orders.filter((o) => normalizeStatus(o.status) === "pending").length,
    rejected: orders.filter((o) => normalizeStatus(o.status) === "rejected").length,
    cancelled: orders.filter((o) => normalizeStatus(o.status) === "cancelled").length,
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Orderbook" description="Every order routed by the execution engine today" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard loading={isLoading} label="Executed" value={`${counts.executed}`} tone="profit" icon={<ListChecks className="size-5 text-emerald-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Pending" value={`${counts.pending}`} tone="warn" icon={<Hourglass className="size-5 text-amber-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Rejected" value={`${counts.rejected}`} tone="loss" icon={<WarningCircle className="size-5 text-rose-400" weight="duotone" />} />
        <KpiCard loading={isLoading} label="Cancelled" value={`${counts.cancelled}`} icon={<XCircle className="size-5 text-slate-400" weight="duotone" />} />
      </div>

      <TerminalGrid
        variant="orderbook"
        rowData={orders}
        loading={isLoading}
        height="calc(100vh - 16rem)"
        onRowClick={setActive}
      />

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
              <div className="space-y-4 px-4 pb-6 mt-6">
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
