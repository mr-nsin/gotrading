import { themeQuartz, type Theme } from "ag-grid-community";

/**
 * Grid theme for the trading terminal, calibrated against the TradingView
 * screener (measured from the live page, Aug 2026):
 *
 *   row height        41px      -> 40 comfortable / 32 compact
 *   header height     50px      -> 40 comfortable / 34 compact (denser than TV;
 *                                  we show more rows per screen than a screener)
 *   body font         14px      -> 13px, tabular-nums for numeric columns
 *   cell padding      0 12 0 20 -> 12px horizontal
 *   first column      sticky    -> pinned left
 *   header            sticky    -> AG Grid default
 *   row striping      none      -> uniform row background
 *
 * The no-striping choice is deliberate and copied from TradingView: alternating
 * backgrounds fight with the transient green/red tick flash, which is the single
 * most important signal in a live grid. Uniform rows keep the flash unambiguous
 * and separation comes from a hairline row border instead.
 *
 * Colors are pulled from the terminal tokens in globals.css rather than
 * duplicated, so the grid follows the rest of the UI. The Theming API accepts
 * any CSS color string, `var()` included.
 */

const base = {
  // Surfaces
  backgroundColor: "var(--grid-surface, #0F1420)",
  foregroundColor: "var(--text-primary, #E7EAF0)",
  chromeBackgroundColor: "var(--header-bg, #0B0F17)",

  // Header
  headerBackgroundColor: "var(--header-bg, #0B0F17)",
  headerTextColor: "var(--text-secondary, #8B93A7)",
  headerFontWeight: 600,
  headerFontSize: 11,

  // Rows — uniform background, hairline separators (see note above)
  oddRowBackgroundColor: "var(--row-bg, #0F1420)",
  rowHoverColor: "var(--row-bg-hover, #182031)",
  selectedRowBackgroundColor: "var(--row-bg-selected, #1B2A3D)",
  borderColor: "var(--border-hairline, #1E2635)",
  rowBorder: true,
  columnBorder: false,

  // Typography — `inherit` keeps the app's font stack; numeric columns switch to
  // the mono stack via the .cell-numeric utility in globals.css
  fontFamily: "inherit",
  headerFontFamily: "inherit",
  fontSize: 13,

  // Accent drives focus rings, checkboxes, sort indicators and the resize handle
  accentColor: "var(--accent-amber, #F5A623)",

  // The TerminalGrid shell draws its own border and radius. Leaving these on
  // would double the border and clip the corners twice.
  wrapperBorder: false,
  wrapperBorderRadius: 0,

  cellHorizontalPadding: 12,
  headerColumnResizeHandleColor: "var(--border-strong, #2A3446)",

  // Compact chrome for the scrollbars inside the viewport
  browserColorScheme: "dark" as const,
} satisfies Parameters<typeof themeQuartz.withParams>[0];

/** Default (comfortable) terminal theme. */
export const terminalTheme: Theme = themeQuartz.withParams({
  ...base,
  spacing: 6,
  rowHeight: 40,
  headerHeight: 40,
});

/** Compact variant — same palette, tighter metrics for dense scanning. */
export const terminalThemeCompact: Theme = themeQuartz.withParams({
  ...base,
  spacing: 4,
  fontSize: 12,
  rowHeight: 32,
  headerHeight: 34,
});

/**
 * Theme for the general-purpose DataTable used on the dashboard, logs, reports
 * and broker pages. It follows the app's shadcn tokens rather than the terminal
 * palette so those panels keep matching the cards they sit in, but it is still a
 * Theming API object — the whole app must be on one styling system, because a
 * single legacy `ag-grid.css` import anywhere breaks the Theming API everywhere.
 */
const panelBase = {
  backgroundColor: "transparent",
  foregroundColor: "var(--foreground)",
  chromeBackgroundColor: "var(--surface)",
  headerBackgroundColor: "var(--surface)",
  headerTextColor: "var(--muted-foreground)",
  headerFontWeight: 600,
  borderColor: "var(--border)",
  rowHoverColor: "var(--surface-2)",
  selectedRowBackgroundColor: "var(--accent)",
  oddRowBackgroundColor: "transparent",
  rowBorder: true,
  columnBorder: false,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  fontFamily: "inherit",
  headerFontFamily: "inherit",
  fontSize: 13,
  accentColor: "var(--primary)",
  cellHorizontalPadding: 12,
  browserColorScheme: "dark" as const,
} satisfies Parameters<typeof themeQuartz.withParams>[0];

export const panelTheme: Theme = themeQuartz.withParams({
  ...panelBase,
  spacing: 5,
  headerHeight: 44,
  rowHeight: 48,
});

export const panelThemeDense: Theme = themeQuartz.withParams({
  ...panelBase,
  spacing: 4,
  headerHeight: 36,
  rowHeight: 40,
});
