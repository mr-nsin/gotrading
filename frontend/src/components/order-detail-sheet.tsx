"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { SideTag, StatusPill } from "@/components/ui-kit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/order-timeline";
import { formatDateTime, formatNum } from "@/lib/format";
import type { Order } from "@/lib/api";

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailSheet({ order, open, onOpenChange }: OrderDetailSheetProps) {
  const copyId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {order && (
          <>
            <SheetHeader>
              <SheetTitle className="num">{order.symbol}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="num">{order.id.slice(0, 12)}…</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={copyId}
                  aria-label="Copy order ID"
                >
                  <Copy className="size-3" />
                </Button>
                <span className="text-muted-foreground">·</span>
                <span className="num">
                  {formatDateTime(order.timestamp || order.time || "")}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-1 pb-6 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <DetailField label="Order ID" value={order.id} mono />
                <DetailField label="Symbol" value={order.symbol} />
                <DetailField label="Side" value={<SideTag side={order.side as "BUY" | "SELL"} />} />
                <DetailField label="Status" value={<StatusPill status={order.status} />} />
                <DetailField label="Type" value={order.order_type || order.type || "MARKET"} />
                <DetailField label="Product" value={order.product || "MIS"} />
                <DetailField label="Quantity" value={String(order.quantity || order.qty || 0)} />
                <DetailField label="Price" value={formatNum(order.price || 0)} />
                <DetailField
                  label="Avg fill"
                  value={
                    order.average_price || order.avgFill
                      ? formatNum(order.average_price || order.avgFill || 0)
                      : "—"
                  }
                />
                {order.segment && (
                  <DetailField label="Segment" value={order.segment} />
                )}
              </div>

              {(order.reason || order.error_message) && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-[11px]">
                    {order.reason || order.error_message}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Order lifecycle
                </h3>
                <OrderTimeline events={order.lifecycle} order={order} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[12px] ${mono ? "num truncate font-mono text-[10px]" : "num"}`}>
        {value}
      </div>
    </div>
  );
}
