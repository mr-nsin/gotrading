import { ColDef } from "ag-grid-community";
import { SymbolCell, SideBadgeCell, StatusBadgeCell, PnlCell, PctCell } from "@/components/grid-cells";
import { formatNum } from "@/lib/format";

export const positionsColumns: ColDef[] = [
  {
    headerCheckboxSelection: true,
    checkboxSelection: true,
    width: 44,
    pinned: 'left',
    resizable: false,
    sortable: false,
    filter: false,
    suppressMovable: true,
  },
  {
    field: 'symbol',
    headerName: 'Instrument',
    pinned: 'left',
    minWidth: 180,
    cellRenderer: SymbolCell,
  },
  { field: 'strategy_name', headerName: 'Strategy', minWidth: 140 },
  { field: 'broker_name', headerName: 'Broker', minWidth: 100, valueFormatter: p => p.value ?? '—' },
  {
    field: 'side',
    headerName: 'Side',
    width: 90,
    cellRenderer: SideBadgeCell,
    cellClass: "flex items-center justify-center",
    headerClass: "ag-center-header",
  },
  {
    field: 'quantity',
    headerName: 'Qty',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    width: 100,
  },
  {
    field: 'entry_price',
    headerName: 'Avg Price',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    valueFormatter: p => p.value ? p.value.toFixed(2) : "0.00",
  },
  {
    field: 'ltp',
    headerName: 'LTP',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    enableCellChangeFlash: true,
    valueFormatter: p => p.value ? p.value.toFixed(2) : "0.00",
  },
  {
    field: 'unrealized',
    headerName: 'Unreal. P&L',
    type: 'numericColumn',
    cellRenderer: PnlCell,
    enableCellChangeFlash: true,
  },
  {
    field: 'realized',
    headerName: 'Realised',
    type: 'numericColumn',
    cellRenderer: PnlCell,
  },
  {
    field: 'dayChange',
    headerName: 'Day %',
    type: 'numericColumn',
    cellRenderer: PctCell,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: StatusBadgeCell,
    cellClass: "flex items-center justify-center",
    headerClass: "ag-center-header",
  },
];

export const orderbookColumns: ColDef[] = [
  {
    field: 'id',
    headerName: 'Order ID',
    pinned: 'left',
    minWidth: 130,
    cellClass: 'cell-numeric',
  },
  {
    field: 'symbol',
    headerName: 'Instrument',
    minWidth: 160,
    cellRenderer: SymbolCell,
  },
  {
    field: 'side',
    headerName: 'Side',
    width: 90,
    cellRenderer: SideBadgeCell,
    cellClass: "flex items-center justify-center",
    headerClass: "ag-center-header",
  },
  {
    field: 'quantity',
    headerName: 'Qty',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    width: 90,
  },
  {
    field: 'price',
    headerName: 'Price',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    valueFormatter: p => p.value ? p.value.toFixed(2) : "MKT",
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: StatusBadgeCell,
    cellClass: "flex items-center justify-center",
    headerClass: "ag-center-header",
  },
];

export const strategiesColumns: ColDef[] = [
  {
    field: 'name',
    headerName: 'Strategy',
    pinned: 'left',
    minWidth: 200,
    cellClass: 'font-semibold',
  },
  {
    field: 'active_broker_name',
    headerName: 'Broker',
    minWidth: 140,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: StatusBadgeCell,
    cellClass: "flex items-center justify-center",
    headerClass: "ag-center-header",
  },
  {
    field: 'open_positions_count',
    headerName: 'Open Pos.',
    type: 'numericColumn',
    cellClass: 'cell-numeric',
    width: 110,
  },
  {
    field: 'unrealized_pnl',
    headerName: 'Unreal. P&L',
    type: 'numericColumn',
    cellRenderer: PnlCell,
    enableCellChangeFlash: true,
  },
  {
    field: 'realized_pnl',
    headerName: 'Realised P&L',
    type: 'numericColumn',
    cellRenderer: PnlCell,
  },
];
