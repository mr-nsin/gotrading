"use client";

import { useEffect, useRef } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import { formatINR } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const Dash = () => <span className="text-[var(--text-muted)]">—</span>;

function directionClass(value: number): string {
  if (value > 0) return "text-[var(--positive)]";
  if (value < 0) return "text-[var(--negative)]";
  return "text-[var(--neutral)]";
}

export const SymbolCell = (props: ICellRendererParams) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const { value, data } = props;

  return (
    <div className="flex min-w-0 flex-col justify-center">
      <div className="cell-symbol truncate leading-tight">{value}</div>
      {(data.segment || data.type) && (
        <div className="mt-0.5 flex gap-1 leading-none">
          {data.segment && (
            <span className="text-[10px] uppercase text-[var(--text-muted)]">{data.segment}</span>
          )}
          {data.type && (
            <span className="text-[10px] uppercase text-[var(--text-muted)]">{data.type}</span>
          )}
        </div>
      )}
    </div>
  );
};

export const SideBadgeCell = (props: ICellRendererParams) => {
  if (!props.data) return <Skeleton className="h-4 w-12" />;
  const side = props.value as string | undefined;
  if (!side) return <Dash />;

  const isBuy = side.toUpperCase() === "BUY";
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        isBuy
          ? "bg-[var(--positive-bg)] text-[var(--side-buy)]"
          : "bg-[var(--negative-bg)] text-[var(--side-sell)]"
      }`}
    >
      {side}
    </span>
  );
};

export const StatusBadgeCell = (props: ICellRendererParams) => {
  if (!props.data) return <Skeleton className="h-4 w-16" />;
  const status = props.value as string | undefined;
  if (!status) return <Dash />;

  const key = status.toLowerCase();

  let bgClass = "bg-[var(--status-closed-bg)]";
  let textClass = "text-[var(--status-closed)]";

  if (["open", "live", "connected", "executed", "active", "completed"].includes(key)) {
    bgClass = "bg-[var(--status-open-bg)]";
    textClass = "text-[var(--status-open)]";
  } else if (["pending", "paused", "running", "warning", "token_expiring"].includes(key)) {
    bgClass = "bg-[var(--status-pending-bg)]";
    textClass = "text-[var(--status-pending)]";
  } else if (["rejected", "error", "critical", "disconnected"].includes(key)) {
    bgClass = "bg-[var(--status-rejected-bg)]";
    textClass = "text-[var(--status-rejected)]";
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${bgClass} ${textClass}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

export const PnlCell = (props: ICellRendererParams) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const value = props.value;
  if (typeof value !== "number") return <Dash />;

  return (
    <span className={`cell-numeric ${directionClass(value)}`}>
      {formatINR(value, { sign: true, decimals: 2 })}
    </span>
  );
};

export const PctCell = (props: ICellRendererParams) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const value = props.value;
  if (typeof value !== "number") return <Dash />;

  return (
    <span className={`cell-numeric ${directionClass(value)}`}>
      {`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`}
    </span>
  );
};

export interface TickCellParams {
  /** Decimal places for the rendered number. Defaults to 2. */
  decimals?: number;
  /** Colour the text by the sign of the value (P&L). Off for absolute prices. */
  colorBySign?: boolean;
  /** Render with a +/- sign. */
  sign?: boolean;
  /** Format as INR currency rather than a bare number. */
  currency?: boolean;
}

/**
 * Live numeric cell with a directional flash, modelled on the TradingView
 * screener.
 *
 * TradingView flashes the whole cell background and distinguishes direction —
 * `.growing` takes a green fill, `.falling` a red one — where AG Grid's
 * built-in `enableCellChangeFlash` only offers a single neutral colour. So this
 * renderer tracks the previous value itself and drives the .flash-up /
 * .flash-down classes defined in globals.css.
 *
 * The flash is applied to `eGridCell` (the cell element) rather than to an inner
 * span so the fill spans the full cell, matching TradingView. Classes are
 * toggled imperatively instead of through React state: at tick rates of several
 * updates per second per row, a state update per tick would re-render the whole
 * cell subtree for a purely visual effect.
 */
export const TickCell = (props: ICellRendererParams & TickCellParams) => {
  const {
    value,
    eGridCell,
    node,
    decimals = 2,
    colorBySign = false,
    sign = false,
    currency = false,
  } = props;

  const numeric = typeof value === "number" ? value : null;

  // Previous value is stored against the row id. AG Grid recycles cell DOM and
  // renderer instances while scrolling, so an unkeyed ref would compare this
  // row's value against whatever row previously occupied the slot and flash
  // spuriously on every scroll.
  const prevRef = useRef<{ id: string; value: number } | null>(null);
  const rowId = node?.id ?? "";

  useEffect(() => {
    if (numeric === null || !eGridCell) return;

    const prev = prevRef.current;
    prevRef.current = { id: rowId, value: numeric };

    // First sight of this row, or the slot was recycled from another row.
    if (!prev || prev.id !== rowId) return;
    if (prev.value === numeric) return;

    const cls = numeric > prev.value ? "flash-up" : "flash-down";

    // Re-adding a class that is already present does not restart a CSS
    // animation. Remove both, force a style recalc, then apply — otherwise
    // consecutive ticks in the same direction only animate once.
    eGridCell.classList.remove("flash-up", "flash-down");
    void eGridCell.offsetWidth;
    eGridCell.classList.add(cls);

    const timer = window.setTimeout(() => eGridCell.classList.remove(cls), 600);
    return () => window.clearTimeout(timer);
  }, [numeric, rowId, eGridCell]);

  if (!props.data) return <Skeleton className="h-4 w-full" />;
  if (numeric === null) return <Dash />;

  const text = currency
    ? formatINR(numeric, { sign, decimals })
    : `${sign && numeric >= 0 ? "+" : ""}${numeric.toFixed(decimals)}`;

  return (
    <span className={`cell-numeric ${colorBySign ? directionClass(numeric) : ""}`}>{text}</span>
  );
};
