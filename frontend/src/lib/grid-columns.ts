import type { ColDef } from "ag-grid-community";
import {
  SymbolCell,
  SideBadgeCell,
  StatusBadgeCell,
  PnlCell,
  PctCell,
  TickCell,
} from "@/components/grid-cells";

/**
 * Shared column presets.
 *
 * Row selection checkboxes are NOT declared here. `colDef.checkboxSelection` and
 * `colDef.headerCheckboxSelection` were deprecated in v32.2; selection is now
 * configured once through the `rowSelection` grid option in TerminalGrid, which
 * renders the checkbox column itself.
 *
 * Numeric columns use `type: "numericColumn"` so AG Grid right-aligns both the
 * header and the cell, plus `cell-numeric` for the tabular-nums mono stack —
 * digits must occupy equal width or columns of prices will not scan vertically.
 */

const NUM = {
  type: "numericColumn" as const,
  cellClass: "cell-numeric",
  filter: "agNumberColumnFilter" as const,
};

const BADGE = {
  cellClass: "flex items-center justify-center",
  headerClass: "ag-center-header",
  filter: "agTextColumnFilter" as const,
  sortable: true,
};

export const positionsColumns: ColDef[] = [
  {
    field: "symbol",
    headerName: "Instrument",
    // Pinned left, mirroring TradingView's sticky symbol column: the instrument
    // must stay visible while scrolling horizontally through metrics.
    pinned: "left",
    minWidth: 200,
    flex: 2,
    cellRenderer: SymbolCell,
    filter: "agTextColumnFilter",
    tooltipField: "symbol",
  },
  { field: "strategy_name", headerName: "Strategy", minWidth: 150, flex: 1.5 },
  {
    field: "broker_name",
    headerName: "Broker",
    minWidth: 110,
    flex: 1,
    valueFormatter: (p) => p.value ?? "—",
  },
  { field: "side", headerName: "Side", width: 90, cellRenderer: SideBadgeCell, ...BADGE },
  { ...NUM, field: "quantity", headerName: "Qty", width: 100 },
  {
    ...NUM,
    field: "entry_price",
    headerName: "Avg Price",
    minWidth: 110,
    flex: 1,
    cellRenderer: TickCell,
  },
  {
    ...NUM,
    field: "ltp",
    headerName: "LTP",
    minWidth: 110,
    flex: 1,
    cellRenderer: TickCell,
  },
  {
    ...NUM,
    field: "unrealized",
    headerName: "Unreal. P&L",
    minWidth: 130,
    flex: 1.2,
    cellRenderer: TickCell,
    cellRendererParams: { colorBySign: true, sign: true, currency: true },
  },
  {
    ...NUM,
    field: "realized",
    headerName: "Realised",
    minWidth: 120,
    flex: 1,
    cellRenderer: PnlCell,
  },
  {
    ...NUM,
    field: "dayChange",
    headerName: "Day %",
    minWidth: 100,
    flex: 1,
    cellRenderer: PctCell,
  },
  { field: "status", headerName: "Status", width: 110, cellRenderer: StatusBadgeCell, ...BADGE },
];

export const orderbookColumns: ColDef[] = [
  {
    field: "id",
    headerName: "Order ID",
    pinned: "left",
    minWidth: 140,
    cellClass: "cell-numeric",
    filter: "agTextColumnFilter",
  },
  {
    field: "symbol",
    headerName: "Instrument",
    minWidth: 180,
    flex: 2,
    cellRenderer: SymbolCell,
    filter: "agTextColumnFilter",
    tooltipField: "symbol",
  },
  { field: "side", headerName: "Side", width: 90, cellRenderer: SideBadgeCell, ...BADGE },
  { ...NUM, field: "quantity", headerName: "Qty", width: 90 },
  {
    ...NUM,
    field: "price",
    headerName: "Price",
    minWidth: 110,
    flex: 1,
    valueFormatter: (p) => (typeof p.value === "number" ? p.value.toFixed(2) : "MKT"),
  },
  { field: "status", headerName: "Status", width: 120, cellRenderer: StatusBadgeCell, ...BADGE },
];

export const strategiesColumns: ColDef[] = [
  {
    field: "name",
    headerName: "Strategy",
    pinned: "left",
    minWidth: 220,
    flex: 2,
    cellClass: "font-semibold",
    filter: "agTextColumnFilter",
    tooltipField: "name",
  },
  { field: "active_broker_name", headerName: "Broker", minWidth: 140, flex: 1 },
  { field: "status", headerName: "Status", width: 110, cellRenderer: StatusBadgeCell, ...BADGE },
  { ...NUM, field: "open_positions_count", headerName: "Open Pos.", width: 110 },
  {
    ...NUM,
    field: "unrealized_pnl",
    headerName: "Unreal. P&L",
    minWidth: 130,
    flex: 1.2,
    cellRenderer: TickCell,
    cellRendererParams: { colorBySign: true, sign: true, currency: true },
  },
  {
    ...NUM,
    field: "realized_pnl",
    headerName: "Realised P&L",
    minWidth: 130,
    flex: 1.2,
    cellRenderer: PnlCell,
  },
];
