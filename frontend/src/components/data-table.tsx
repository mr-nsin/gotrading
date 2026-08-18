"use client";

import { useMemo, type ReactNode } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";

import { ModuleRegistry, ClientSideRowModelModule, ValidationModule, RowAutoHeightModule, RowSelectionModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([ClientSideRowModelModule, ValidationModule, RowAutoHeightModule, RowSelectionModule]);

import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  minWidth?: number;
  pinned?: "left" | "right";
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

const CustomHeader = (props: any) => {
  const { align } = props;
  return (
    <div className={`flex w-full items-center text-[13px] font-semibold text-muted-foreground ${
      align === "right" ? "justify-end text-right" : align === "center" ? "justify-center text-center" : "justify-start text-left"
    }`}>
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
        align === "right" ? "justify-end text-right font-mono" : align === "center" ? "justify-center text-center" : "justify-start text-left"
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
        minWidth: c.key === "sel" ? 44 : (c.minWidth || (c.width ? parseInt(c.width) : 100)),
        pinned: c.pinned,
        cellRenderer: CustomCell,
        cellRendererParams: {
          align: c.align,
          cellRenderFunc: c.cell,
        },
        headerComponent: CustomHeader,
        headerComponentParams: { 
          headerNode: c.header,
          align: c.align
        },
        autoHeight: false,
        wrapText: false,
        valueFormatter: () => "",
        suppressMovable: true,
      } as any;

      return colDef;
    });
  }, [columns]);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm" style={{ height: maxHeight, minHeight: "350px" }}>
      <div 
        className="ag-theme-quartz w-full flex-1" 
        style={{ 
          height: "100%", 
          minHeight: 0,
          "--ag-font-family": "var(--font-sans, inherit)",
          "--ag-font-size": "13px",
          "--ag-grid-size": dense ? "4px" : "5px",
          "--ag-background-color": "transparent",
          "--ag-foreground-color": "var(--foreground)",
          "--ag-header-background-color": "var(--surface)",
          "--ag-header-foreground-color": "var(--muted-foreground)",
          "--ag-border-color": "var(--border)",
          "--ag-row-border-color": "var(--border)",
          "--ag-row-hover-color": "var(--surface-2)",
          "--ag-selected-row-background-color": "var(--accent)",
          "--ag-borders": "none",
          "--ag-header-column-separator-display": "none",
          "--ag-header-column-separator-height": "0px",
          "--ag-header-column-separator-width": "0px",
          "--ag-header-column-resize-handle-display": "none",
          "--ag-cell-horizontal-padding": "12px",
        } as any}
      >
        <AgGridReact
          theme="legacy"
          rowData={loading ? undefined : rows}
          columnDefs={gridColumns}
          rowSelection={onRowClick ? { mode: "singleRow", enableClickSelection: true } : undefined}
          onRowClicked={(e) => onRowClick && onRowClick(e.data)}
          headerHeight={dense ? 36 : 44}
          rowHeight={dense ? 40 : 48}
          overlayNoRowsTemplate={`<div class="text-sm text-muted-foreground p-4">${empty}</div>`}
          domLayout="normal"
          suppressCellFocus={true}
        />
      </div>
      {footer && <div className="bg-surface p-3 border-t text-sm">{footer}</div>}
    </div>
  );
}
