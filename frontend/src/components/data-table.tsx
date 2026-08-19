"use client";

import { useMemo, type ReactNode } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ValueGetterParams } from "ag-grid-community";

// No legacy stylesheet imports. Next.js CSS imports are global, so the
// `ag-grid.css` / `ag-theme-quartz.css` imports that used to live here disabled
// the Theming API for every grid in the app (AG Grid error #106) — including
// TerminalGrid on the positions, orders and strategies pages.
import { registerGridModules } from "@/lib/grid-modules";
import { panelTheme, panelThemeDense } from "@/lib/theme";
import { Skeleton } from "@/components/ui/skeleton";

registerGridModules();

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  minWidth?: number;
  pinned?: "left" | "right";
  sortable?: boolean;
  /** Value used for sorting, filtering and CSV export when `cell` renders JSX. */
  sortValue?: (row: T) => number | string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

const CustomHeader = (props: any) => {
  const { align } = props;
  return (
    <div
      className={`flex w-full items-center text-[13px] font-semibold text-muted-foreground ${
        align === "right"
          ? "justify-end text-right"
          : align === "center"
            ? "justify-center text-center"
            : "justify-start text-left"
      }`}
    >
      {props.displayName || props.headerNode}
    </div>
  );
};

const CustomCell = (props: any) => {
  if (!props.data) return <Skeleton className="h-4 w-full" />;
  const { align, cellRenderFunc } = props;

  return (
    <div
      className={`flex h-full w-full items-center overflow-hidden text-[13px] ${
        align === "right"
          ? "justify-end text-right font-mono tabular-nums"
          : align === "center"
            ? "justify-center text-center"
            : "justify-start text-left"
      }`}
    >
      {cellRenderFunc(props.data, props.node.rowIndex)}
    </div>
  );
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  maxHeight = "100%",
  loading,
  empty = "No records found.",
  dense,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  maxHeight?: string;
  loading?: boolean;
  empty?: string;
  dense?: boolean;
  footer?: ReactNode;
}) {
  const gridColumns = useMemo(() => {
    return columns.map((c) => {
      const isString = typeof c.header === "string";

      const colDef: ColDef = {
        colId: c.key,
        field: c.key,
        headerName: isString ? (c.header as string) : undefined,
        sortable: c.sortable !== false,
        flex: c.width ? undefined : 1,
        width: c.width ? parseInt(c.width) : undefined,
        minWidth: c.key === "sel" ? 44 : c.minWidth || (c.width ? parseInt(c.width) : 100),
        pinned: c.pinned,
        cellRenderer: CustomCell,
        cellRendererParams: {
          align: c.align,
          cellRenderFunc: c.cell,
        },
        headerComponent: CustomHeader,
        headerComponentParams: {
          headerNode: c.header,
          align: c.align,
        },
        // `cell` returns JSX, so the grid cannot derive a comparable value from
        // it. Honour the column's `sortValue` when given — previously this field
        // was accepted but never used, so any column relying on it sorted by its
        // raw field value (or not at all, when no such field existed).
        valueGetter: c.sortValue
          ? (p: ValueGetterParams) => (p.data ? c.sortValue!(p.data as T) : null)
          : undefined,
        // Some columns hold non-primitive payloads (e.g. the dashboard's `spark`
        // column carries a sparkline data array) and are rendered purely by
        // `cell`. AG Grid infers a cell data type from the raw field value and
        // warns when an object has no formatter, so collapse objects to an empty
        // string while leaving primitives intact for sorting, filtering and CSV
        // export.
        valueFormatter: c.sortValue
          ? undefined
          : (p) => (p.value != null && typeof p.value === "object" ? "" : (p.value ?? "")),
        autoHeight: false,
        wrapText: false,
        suppressMovable: true,
      };

      return colDef;
    });
  }, [columns]);

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
      style={{ height: maxHeight, minHeight: "350px" }}
    >
      <div className="w-full flex-1" style={{ height: "100%", minHeight: 0 }}>
        <AgGridReact
          theme={dense ? panelThemeDense : panelTheme}
          rowData={loading ? undefined : rows}
          columnDefs={gridColumns}
          // Deliberately no getRowId: `rowKey` is not guaranteed to resolve for
          // every caller (some dashboard rows have no `id`), and a getRowId that
          // returns the same value twice corrupts row identity. DataTable is a
          // static panel table; TerminalGrid is the surface that needs stable row
          // identity for streaming updates.
          rowSelection={
            onRowClick
              ? { mode: "singleRow", checkboxes: false, enableClickSelection: true }
              : undefined
          }
          onRowClicked={(e) => {
            if (onRowClick && e.data != null) onRowClick(e.data);
          }}
          overlayNoRowsTemplate={`<span style="color:var(--muted-foreground);font-size:13px">${empty}</span>`}
          domLayout="normal"
          suppressCellFocus={true}
          animateRows={false}
        />
      </div>
      {footer && <div className="border-t bg-surface p-3 text-sm">{footer}</div>}
    </div>
  );
}
