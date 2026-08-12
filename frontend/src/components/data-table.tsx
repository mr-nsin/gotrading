"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  maxHeight = "26rem",
  loading,
  empty = "No records match the current filters.",
  dense,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  onRowClick?: (row: T) => void;
  maxHeight?: string;
  loading?: boolean;
  empty?: string;
  dense?: boolean;
  footer?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div className="min-w-0 overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "whitespace-nowrap px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                )}
              >
                {c.sortable ? (
                  <button
                    onClick={() => toggle(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      c.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {c.header}
                    {sort?.key === c.key ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-2.5 py-2">
                    <Skeleton className="h-3.5 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-xs text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            sorted.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border/60 transition-colors hover:bg-accent/50",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-2.5",
                      dense ? "py-1" : "py-1.5",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                      c.className,
                    )}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
        {footer && <tfoot className="sticky bottom-0 bg-surface-2 text-[11px]">{footer}</tfoot>}
      </table>
    </div>
  );
}
