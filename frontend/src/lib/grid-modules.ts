/**
 * Central AG Grid module registration.
 *
 * AG Grid v33+ requires every feature to be registered explicitly. Anything not
 * registered is silently ignored at runtime — a missing CellStyleModule means
 * every `cellClass` in a column def does nothing, with no visible error outside
 * the dev validation overlay.
 *
 * Registration is global to the AG Grid singleton, so this runs once and every
 * grid in the app shares it. Import `registerGridModules` from any grid
 * component and call it at module scope.
 */
import {
  ModuleRegistry,
  // Row model
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  // Styling — required for colDef.cellClass / rowClass / cellStyle
  CellStyleModule,
  RowStyleModule,
  // Tick flashing — required for enableCellChangeFlash
  HighlightChangesModule,
  // Interaction
  RowSelectionModule,
  ColumnHoverModule,
  TooltipModule,
  // Filtering — QuickFilterModule backs the toolbar search box
  QuickFilterModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  // Export
  CsvExportModule,
  // Sizing & layout
  ColumnAutoSizeModule,
  RowAutoHeightModule,
  PinnedRowModule,
  // Imperative APIs used by streaming updates and state persistence
  ColumnApiModule,
  RowApiModule,
  RenderApiModule,
  ScrollApiModule,
  EventApiModule,
  CellApiModule,
  GridStateModule,
  LocaleModule,
  ValidationModule,
} from "ag-grid-community";

let registered = false;

export function registerGridModules(): void {
  if (registered) return;
  registered = true;

  ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ClientSideRowModelApiModule,
    CellStyleModule,
    RowStyleModule,
    HighlightChangesModule,
    RowSelectionModule,
    ColumnHoverModule,
    TooltipModule,
    QuickFilterModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CustomFilterModule,
    CsvExportModule,
    ColumnAutoSizeModule,
    RowAutoHeightModule,
    PinnedRowModule,
    ColumnApiModule,
    RowApiModule,
    RenderApiModule,
    ScrollApiModule,
    EventApiModule,
    CellApiModule,
    GridStateModule,
    LocaleModule,
    // Dev-only: prints the validation overlay that surfaces misconfiguration.
    // Excluded from production builds to save bundle size.
    ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
  ]);
}
