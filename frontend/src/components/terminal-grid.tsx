"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  GetRowIdParams,
  GridState,
} from "ag-grid-community";

// NOTE: no `ag-grid-community/styles/*.css` import here, and there must not be
// one anywhere in the app. Next.js CSS imports are global, so a single legacy
// stylesheet imported by any component conflicts with the Theming API for every
// grid on every page (AG Grid error #106).
import { registerGridModules } from "@/lib/grid-modules";
import { terminalTheme, terminalThemeCompact } from "@/lib/theme";
import { orderbookColumns, positionsColumns, strategiesColumns } from "@/lib/grid-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MagnifyingGlass,
  DownloadSimple,
  FadersHorizontal,
  ArrowsClockwise,
} from "@phosphor-icons/react";

registerGridModules();

export type GridVariant = "orderbook" | "positions" | "strategies" | "custom";

export interface TerminalGridProps {
  variant?: GridVariant;
  rowData: any[];
  columnDefs?: ColDef[];
  density?: "comfortable" | "compact";
  onRowSelect?: (selectedRows: any[]) => void;
  onRowClick?: (row: any) => void;
  liveStatus?: "live" | "reconnecting" | "offline";
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  /** CSS height for the grid viewport. Use "fill" to expand to the parent. */
  height?: string;
  /** Field holding a stable unique row id. Enables in-place streaming updates. */
  rowIdField?: string;
  /** Show the selection checkbox column. */
  selectable?: boolean;
  /** Persist column widths/order/sort under this key. Omit to disable. */
  stateKey?: string;
  /** Base filename for CSV export. */
  exportName?: string;
}

export function TerminalGrid({
  variant = "positions",
  rowData,
  columnDefs: customColDefs,
  density = "comfortable",
  onRowSelect,
  onRowClick,
  liveStatus = "live",
  loading,
  error,
  emptyMessage = "No open positions",
  onRetry,
  height = "600px",
  rowIdField = "id",
  selectable = true,
  stateKey,
  exportName,
}: TerminalGridProps) {
  const apiRef = useRef<GridApi | null>(null);
  const [gridDensity, setGridDensity] = useState(density);
  const [searchText, setSearchText] = useState("");
  const [displayedCount, setDisplayedCount] = useState<number | null>(null);

  const presetColumns = useMemo(() => {
    switch (variant) {
      case "orderbook":
        return orderbookColumns;
      case "strategies":
        return strategiesColumns;
      case "positions":
      default:
        return positionsColumns;
    }
  }, [variant]);

  const columns = customColDefs || presetColumns;

  /**
   * Applied to every column. Without this the grid renders fixed-width columns
   * that neither fill the container nor sort, filter or resize — AG Grid enables
   * none of those by default.
   */
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      minWidth: 90,
      flex: 1,
      // Long instrument names must clip, not wrap: variable row heights would
      // break the fixed-height assumption that makes row virtualization cheap.
      wrapText: false,
      autoHeight: false,
    }),
    []
  );

  /**
   * Row identity. With getRowId set, a data refresh updates the existing row
   * nodes in place instead of discarding and rebuilding them, which preserves
   * selection, scroll position and — critically — lets TickCell see a real
   * previous value so it can flash the direction of change.
   */
  const getRowId = useCallback(
    (params: GetRowIdParams) => String(params.data?.[rowIdField]),
    [rowIdField]
  );

  const rowsHaveId = useMemo(
    () => !rowData?.length || rowData[0]?.[rowIdField] != null,
    [rowData, rowIdField]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && rowData?.length && !rowsHaveId) {
      console.warn(
        `[TerminalGrid] rows have no "${rowIdField}" field — falling back to index-based ` +
          `row identity. Streaming updates will rebuild rows and tick flashing will not work. ` +
          `Pass rowIdField to point at a unique key.`
      );
    }
  }, [rowsHaveId, rowData, rowIdField]);

  const onGridReady = useCallback(
    (e: GridReadyEvent) => {
      apiRef.current = e.api;
      setDisplayedCount(e.api.getDisplayedRowCount());

      if (stateKey) {
        try {
          const saved = localStorage.getItem(`grid-state:${stateKey}`);
          if (saved) e.api.setState(JSON.parse(saved) as GridState);
        } catch {
          // Corrupt or unreadable saved state must never block the grid.
        }
      }
    },
    [stateKey]
  );

  const persistState = useCallback(() => {
    if (!stateKey || !apiRef.current) return;
    try {
      localStorage.setItem(`grid-state:${stateKey}`, JSON.stringify(apiRef.current.getState()));
    } catch {
      // Quota or private-mode failures are not worth surfacing.
    }
  }, [stateKey]);

  const onSelectionChanged = useCallback(() => {
    if (onRowSelect && apiRef.current) {
      onRowSelect(apiRef.current.getSelectedNodes().map((n) => n.data));
    }
  }, [onRowSelect]);

  const handleRowClicked = useCallback(
    (e: any) => {
      onRowClick?.(e.data);
    },
    [onRowClick]
  );

  const onFilterTextBoxChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchText(text);
    apiRef.current?.setGridOption("quickFilterText", text);
  }, []);

  const syncCount = useCallback(() => {
    setDisplayedCount(apiRef.current?.getDisplayedRowCount() ?? null);
  }, []);

  const handleExport = useCallback(() => {
    apiRef.current?.exportDataAsCsv({
      fileName: `${exportName || variant}-${new Date().toISOString().slice(0, 10)}.csv`,
      // Export what the user is looking at, including any active quick filter.
      exportedRows: "filteredAndSorted",
    });
  }, [exportName, variant]);

  const handleReset = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.resetColumnState();
    apiRef.current.setFilterModel(null);
    setSearchText("");
    apiRef.current.setGridOption("quickFilterText", "");
    if (stateKey) localStorage.removeItem(`grid-state:${stateKey}`);
  }, [stateKey]);

  const toggleDensity = () =>
    setGridDensity((p) => (p === "comfortable" ? "compact" : "comfortable"));

  const isCompact = gridDensity === "compact";
  const fills = height === "fill";

  return (
    <div
      className={`terminal-grid flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-md,8px)] border border-[var(--border-strong)] bg-[var(--grid-surface)] ${
        fills ? "h-full flex-1" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] bg-[var(--header-bg)] px-3 py-2">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <MagnifyingGlass className="absolute left-2.5 size-4 text-[var(--text-muted)]" />
            <Input
              value={searchText}
              onChange={onFilterTextBoxChanged}
              placeholder="Filter..."
              className="h-8 w-48 border-[var(--border-hairline)] bg-[var(--grid-bg)] pl-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--accent-amber)]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <div
              className={`size-2 rounded-full ${
                liveStatus === "live"
                  ? "animate-pulse bg-[var(--accent-amber)]"
                  : liveStatus === "reconnecting"
                    ? "bg-[var(--text-muted)]"
                    : "bg-[var(--negative)]"
              }`}
            />
            {liveStatus === "live"
              ? "Live"
              : liveStatus === "reconnecting"
                ? "Reconnecting..."
                : "Offline"}
          </div>

          {displayedCount !== null && (
            <span className="cell-numeric text-xs text-[var(--text-muted)]">
              {displayedCount.toLocaleString("en-IN")} rows
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDensity}
            className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--row-bg-hover)] hover:text-[var(--text-primary)]"
          >
            <FadersHorizontal className="size-4" />
            {isCompact ? "Comfortable" : "Compact"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            title="Reset columns, sorting and filters"
            className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--row-bg-hover)] hover:text-[var(--text-primary)]"
          >
            <ArrowsClockwise className="size-4" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--row-bg-hover)] hover:text-[var(--text-primary)]"
          >
            <DownloadSimple className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between border-b border-l-4 border-[var(--border-strong)] border-l-[var(--negative)] bg-[var(--negative-bg)] px-4 py-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">{error}</span>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-7 border-[var(--border-hairline)] text-xs"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Grid viewport — one scroll container on both axes, as TradingView does:
          rows virtualize vertically while extra metric columns scroll
          horizontally under the pinned instrument column. */}
      <div
        className={`relative min-h-0 w-full ${fills ? "flex-1" : ""}`}
        style={fills ? undefined : { height }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 bg-[var(--grid-surface)] p-4">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-full rounded border border-[var(--border-hairline)] bg-[var(--row-bg-alt)] opacity-50"
                />
              ))}
            </div>
          </div>
        )}

        <AgGridReact
          theme={isCompact ? terminalThemeCompact : terminalTheme}
          rowData={loading ? undefined : rowData}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          getRowId={rowsHaveId ? getRowId : undefined}
          onGridReady={onGridReady}
          // Selection is configured here, not per-column: colDef.checkboxSelection
          // has been deprecated since v32.2.
          rowSelection={
            selectable
              ? {
                  mode: "multiRow",
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: false,
                }
              : { mode: "singleRow", checkboxes: false, enableClickSelection: true }
          }
          // The auto-generated selection column otherwise lands in the scrolling
          // section, to the right of the pinned instrument column. Pin and lock
          // it left so the checkbox stays the leftmost thing on the row.
          selectionColumnDef={{
            pinned: "left",
            lockPosition: "left",
            width: 44,
            minWidth: 44,
            maxWidth: 44,
            resizable: false,
            suppressMovable: true,
            suppressHeaderMenuButton: true,
          }}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={handleRowClicked}
          // Batches streaming updates applied via api.applyTransactionAsync into
          // one render pass. 60ms tracks a ~16fps repaint, which is the useful
          // ceiling for reading numbers, and collapses bursts from a tick feed.
          asyncTransactionWaitMillis={60}
          // Never yank the viewport while the user is reading a scrolled row.
          suppressScrollOnNewData
          // Row virtualization: render a small overscan beyond the viewport.
          rowBuffer={10}
          // Row virtualization is the win that matters — it keeps the DOM flat
          // regardless of how many positions or orders are open. Column
          // virtualization is switched off deliberately: these grids carry 6-11
          // columns, so keeping them all mounted costs very little, and it avoids
          // the horizontally-scrolled cells failing to re-render. TradingView's
          // screener likewise keeps its full column set in the DOM.
          suppressColumnVirtualisation
          animateRows={false}
          suppressCellFocus={false}
          tooltipShowDelay={300}
          // No pagination — TradingView's screener scrolls one continuous list,
          // and virtualization makes paging unnecessary.
          pagination={false}
          overlayNoRowsTemplate={`<span style="color:var(--text-muted);font-size:13px">${emptyMessage}</span>`}
          onFilterChanged={syncCount}
          onRowDataUpdated={syncCount}
          onSortChanged={persistState}
          onColumnResized={persistState}
          onColumnMoved={persistState}
          onColumnVisible={persistState}
        />
      </div>
    </div>
  );
}
