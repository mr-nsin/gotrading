"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, ClientSideRowModelModule, ValidationModule, RowAutoHeightModule, RowSelectionModule, PaginationModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";

import { terminalTheme } from "@/lib/theme";
import { orderbookColumns, positionsColumns, strategiesColumns } from "@/lib/grid-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, DownloadSimple, FadersHorizontal, DotsThree } from "@phosphor-icons/react";

ModuleRegistry.registerModules([ClientSideRowModelModule, ValidationModule, RowAutoHeightModule, RowSelectionModule, PaginationModule]);


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
  height?: string;
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
}: TerminalGridProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridDensity, setGridDensity] = useState(density);
  const [searchText, setSearchText] = useState("");

  const presetColumns = useMemo(() => {
    switch (variant) {
      case "orderbook": return orderbookColumns;
      case "strategies": return strategiesColumns;
      case "positions": default: return positionsColumns;
    }
  }, [variant]);

  const columns = customColDefs || presetColumns;

  const onSelectionChanged = useCallback(() => {
    if (onRowSelect && gridRef.current) {
      const selectedNodes = gridRef.current.api.getSelectedNodes();
      const selectedData = selectedNodes.map(node => node.data);
      onRowSelect(selectedData);
    }
  }, [onRowSelect]);

  const handleRowClicked = useCallback((e: any) => {
    if (onRowClick) {
      onRowClick(e.data);
    }
  }, [onRowClick]);

  const onFilterTextBoxChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption("quickFilterText", e.target.value);
    }
  }, []);

  const toggleDensity = () => {
    setGridDensity(prev => prev === "comfortable" ? "compact" : "comfortable");
  };

  const isCompact = gridDensity === "compact";
  const rowHeight = isCompact ? 32 : 40;
  const headerHeight = 36;

  return (
    <div className="terminal-grid flex flex-col overflow-hidden rounded-[var(--radius-md,8px)] border border-[var(--border-strong)] bg-[var(--grid-surface)]">
      
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
            <div className={`size-2 rounded-full ${
              liveStatus === 'live' ? 'bg-[var(--accent-amber)] animate-pulse' : 
              liveStatus === 'reconnecting' ? 'bg-[var(--text-muted)]' : 'bg-[var(--negative)]'
            }`} />
            {liveStatus === 'live' ? 'Live' : liveStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleDensity} className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--row-bg-hover)] hover:text-[var(--text-primary)]">
            <FadersHorizontal className="size-4" />
            {isCompact ? "Comfortable" : "Compact"}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--row-bg-hover)] hover:text-[var(--text-primary)]">
            <DownloadSimple className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between border-b border-[var(--border-strong)] border-l-4 border-l-[var(--negative)] bg-[var(--negative-bg)] px-4 py-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">{error}</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="h-7 border-[var(--border-hairline)] text-xs">
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Grid Container */}
      <div className="relative w-full" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-10 bg-[var(--grid-surface)] p-4">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded border border-[var(--border-hairline)] bg-[var(--row-bg-alt)] opacity-50" />
              ))}
            </div>
          </div>
        )}
        
        <AgGridReact
          ref={gridRef}
          theme={terminalTheme}
          rowData={loading ? undefined : rowData}
          columnDefs={columns}
          headerHeight={headerHeight}
          rowHeight={rowHeight}
          animateRows={true}
          suppressCellFocus={false}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={handleRowClicked}
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
          overlayNoRowsTemplate={`<div class="text-sm text-[var(--text-muted)] p-4">${emptyMessage}</div>`}
          domLayout="normal"
          pagination={true}
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100]}
        />
      </div>
    </div>
  );
}
