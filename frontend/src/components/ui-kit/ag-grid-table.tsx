"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

// Legacy `ag-grid.css` / `ag-theme-alpine.css` imports were removed here. Even
// though nothing currently renders this component, a legacy stylesheet import is
// global in Next.js and would have disabled the Theming API across the whole app
// the moment anything imported this file.
import { registerGridModules } from "@/lib/grid-modules";
import { panelTheme } from "@/lib/theme";

registerGridModules();

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
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  );

  return (
    <div className="w-full" style={{ height }}>
      <AgGridReact
        theme={panelTheme}
        rowData={loading ? undefined : rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        animateRows={false}
        rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
        overlayNoRowsTemplate={'<span style="color:var(--muted-foreground);font-size:13px">No records match the current filters.</span>'}
      />
    </div>
  );
}
