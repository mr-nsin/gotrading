"use client";

import {
 cn } from "@/lib/utils";
import {
 formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/api";

export interface TimelineEvent {
  t: string;
  label: string;
}

function buildFallbackLifecycle(order: Order): TimelineEvent[] {
  const ts = order.timestamp || order.time || new Date().toISOString();
  const events: TimelineEvent[] = [{ t: ts, label: "Order placed" }];

  const status = order.status.toLowerCase();
  if (["pending", "open"].includes(status)) {
    events.push({ t: ts, label: "Awaiting confirmation" });
  } else if (["executed", "filled"].includes(status)) {
    events.push({ t: ts, label: "Order confirmed" });
    events.push({ t: ts, label: "Order executed" });
  } else if (["rejected", "cancelled"].includes(status)) {
    events.push({ t: ts, label: "Order confirmed" });
    events.push({
      t: ts,
      label: status === "rejected" ? "Order rejected" : "Order cancelled",
    });
  }

  return events;
}

export function OrderTimeline({
  events,
  order,
}: {
  events?: TimelineEvent[];
  order?: Order;
}) {
  const steps =
    events && events.length > 0
      ? events
      : order
        ? buildFallbackLifecycle(order)
        : [];

  if (steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No lifecycle events recorded.</p>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isRejected =
          step.label.toLowerCase().includes("reject") ||
          step.label.toLowerCase().includes("cancel");
        const isExecuted = step.label.toLowerCase().includes("execut");

        return (
          <li key={`${step.label}-${i}`} className="relative">
            {!isLast && (
              <span className="absolute -left-[17px] top-3 h-full w-px bg-border" />
            )}
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 size-2 rounded-full ring-2 ring-background",
                isRejected
                  ? "bg-loss"
                  : isExecuted
                    ? "bg-profit"
                    : isLast
                      ? "bg-primary"
                      : "bg-muted-foreground/50",
              )}
            />
            <div className="text-[12px] font-medium">{step.label}</div>
            <div className="num text-[10px] text-muted-foreground">
              {formatDateTime(step.t)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
