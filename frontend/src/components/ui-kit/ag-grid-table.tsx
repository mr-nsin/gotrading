"use client";

import { useMemo } from "react";
import "ag-grid-community/styles/ag-grid.css";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-theme-alpine.css";
import type { ColDef } from "ag-grid-community";

export function AgGridTable<T>({
  rowData,
  columnDefs,
  height = "30rem",
  loading = false,
}: {
  rowData: T[];
  columnDefs: ColDef[];
  height?: string;
  loading?: boolean;
}) {
  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  }), []);

  return (
    <div className="ag-theme-alpine-dark w-full" style={{ height }}>
      <AgGridReact
        rowData={loading ? undefined : rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        animateRows={true}
        rowSelection="single"
        overlayLoadingTemplate={loading ? '<span class="ag-overlay-loading-center">Loading...</span>' : undefined}
        overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">No records match the current filters.</span>'
      />
    </div>
  );
}
