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
    // `leading-normal` is load-bearing. AG Grid publishes --ag-line-height set to
    // the row height (45px here) so single-line text centres itself vertically.
    // Cells that render two stacked lines — an instrument name above a row of
    // Tag chips — inherited it on *each* line, so ~37px of content measured 92px
    // and overflowed a 48px row, bleeding across the row borders. Resetting the
    // line height keeps multi-line cells at their natural size.
    <div
      className={`flex w-full items-center overflow-hidden py-1 text-[13px] leading-normal ${
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
        // Weight the free space instead of splitting it evenly. Every column
        // having flex:1 gave a "Side" badge the same width as "Strategy", so
        // names truncated to "Delta He…" while badge columns sat half empty.
        // Left-aligned columns carry the long text; right/centre-aligned ones are
        // numerics and badges that need far less room.
        flex: c.width ? undefined : c.align === "right" || c.align === "center" ? 1 : 2,
        width: c.width ? parseInt(c.width) : undefined,
        // A 100px floor on every column meant a 9-column panel demanded ~900px
        // inside a ~500px card, pushing 180-380px of columns off-screen. Explicit
        // per-column minWidths still win; this only relaxes the default so more
        // columns fit before the grid has to scroll.
        minWidth: c.key === "sel" ? 44 : c.minWidth || (c.width ? parseInt(c.width) : 80),
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
        // Rows size to their content. Callers render multi-line cells (an
        // instrument name above a row of Tag chips, ~69px) which do not fit a
        // fixed 40-48px row: the cell centres its content and clips it top and
        // bottom, so text bled across the row borders. Fixed heights cannot work
        // here because each caller renders different content — letting the row
        // measure itself is the only thing that stays correct as cells change.
        autoHeight: true,
        wrapText: false,
        suppressMovable: true,
      };

      return colDef;
    });
  }, [columns]);

  // `maxHeight` is a ceiling, not a fixed height. Applying it as `height` (plus a
  // hard 350px floor) forced a one-row broker table to reserve 382px, leaving
  // ~290px of dead space under it. For small tables let the grid size to its
  // content and cap it; only fall back to a fixed, virtualised viewport once
  // there are enough rows for virtualisation to be worth having.
  // Threshold is deliberately low. Beyond a screenful, `domLayout="autoHeight"`
  // puts the grid's own header inside the outer scroller, so column headers
  // scroll out of view — and rows stop being virtualised. Small dashboard panels
  // (1-14 rows) want to shrink; a 50-row log wants a fixed viewport with a
  // sticky header and virtualisation.
  const rowCount = rows?.length ?? 0;
  const fitToContent = !loading && rowCount > 0 && rowCount <= 15;

  return (
    // No card chrome here. This table is section *content*: the surrounding
    // Panel already draws the border, radius, shadow and title. Drawing them
    // again produced a card inside a card — a section header, then a second
    // bordered box with its own header row. The grid now sits flush inside its
    // section, so the only header is the column header.
    <div
      className="flex w-full min-w-0 flex-col overflow-hidden"
      style={fitToContent ? { maxHeight } : { height: maxHeight, minHeight: "180px" }}
    >
      <div
        className="w-full flex-1 overflow-auto"
        style={fitToContent ? { minHeight: 0 } : { height: "100%", minHeight: 0 }}
      >
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
          domLayout={fitToContent ? "autoHeight" : "normal"}
          suppressCellFocus={true}
          animateRows={false}
        />
      </div>
      {footer && <div className="border-t bg-surface p-3 text-sm">{footer}</div>}
    </div>
  );
}
