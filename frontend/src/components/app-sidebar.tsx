
"use client";

import {
 useState } from "react";
import Link from "next/link";
import {
 usePathname } from "next/navigation";
import {

  ChartLineUp as Activity, ChartBar as BarChart3, Bell, Cube as Boxes, Briefcase, CaretLeft as ChevronLeft, CaretRight as ChevronRight, Flask, Gauge, SquaresFour as LayoutDashboard, ListBullets as ListOrdered, Scroll, WarningCircle as ShieldAlert, Terminal, User, Link as WebhookIcon,  } from "@phosphor-icons/react";

import {
 cn } from "@/lib/utils";
import {
 useDashboardTotals } from "@/hooks/use-api";
import {
 useSettings } from "@/components/settings-provider";
import {
 money, pnlClass } from "@/lib/format";
import {
 Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const groups = [
  {
    label: "Trading",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
      { title: "Strategies", url: "/strategies", icon: Boxes },
      { title: "Positions", url: "/positions", icon: Activity },
      { title: "Orderbook", url: "/orders", icon: ListOrdered },
      { title: "Portfolio", url: "/portfolio", icon: Briefcase },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { title: "Brokers", url: "/brokers", icon: Gauge },
      { title: "API & Webhooks", url: "/api-webhooks", icon: WebhookIcon },
      { title: "Logs", url: "/logs", icon: Terminal },
    ],
  },
  {
    label: "Analysis",
    items: [
      { title: "Backtesting", url: "/backtesting", icon: Flask },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Control",
    items: [
      { title: "Risk Settings", url: "/risk", icon: ShieldAlert },
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Profile", url: "/profile", icon: User },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: totals } = useDashboardTotals();
  const [collapsed, setCollapsed] = useState(false);

  const todayPnl = totals?.todayPnl || 0;

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  // A short delay instead of 0: at zero, tooltips fired on every incidental
  // mouse pass across the collapsed rail, and because the close animation
  // outlasts the next open, two labels could be on screen at once.
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={400}>
      <aside
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        {/* The toggle lives inside the sidebar. It used to be absolutely
            positioned at -right-3 with z-50, which pushed it 12px into the main
            column and over the top bar (z-30) — it overlapped the Equity readout,
            leaving 5px of clearance. Keeping it in flow removes the collision
            entirely. */}
        <header
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "gap-3 px-4"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Scroll className="size-4" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold leading-tight tracking-tight text-sidebar-foreground">
                  GoTrading
                </div>
                <div className="num truncate text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
                  NSE · BSE · F&O
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex size-6 shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <ChevronLeft className="size-3.5" weight="bold" />
              </button>
            </>
          )}
        </header>

        {collapsed && (
          <div className="flex shrink-0 justify-center border-b border-sidebar-border py-2">
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex size-6 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronRight className="size-3.5" weight="bold" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4">
          {groups.map((group, index) => (
            <div key={group.label} className={cn("mb-6", collapsed ? "px-2" : "px-3")}>
              {!collapsed && (
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.label}
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.url}
                          aria-current={isActive(item.url, item.exact) ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            isActive(item.url, item.exact) && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm",
                            collapsed && "justify-center px-0"
                          )}
                        >
                          {/* size-[18px], not size-4.5: Tailwind 3.4's spacing
                              scale has no 4.5 step, so `size-4.5` emitted no CSS
                              and these icons silently fell back to Phosphor's
                              1em default — sizing them off the link's 13.5px
                              font instead of the intended 18px. */}
                          <item.icon className="size-[18px] shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                    </Tooltip>
                  </li>
                ))}
              </ul>
              {collapsed && index < groups.length - 1 && (
                <div className="mt-6 mx-2 border-b border-sidebar-border/50" />
              )}
            </div>
          ))}
        </nav>

        <footer className={cn("shrink-0 border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
          <div className={cn("overflow-hidden rounded-lg bg-sidebar-accent py-2.5", collapsed ? "px-0.5 text-center" : "px-3")}>
            {!collapsed ? (
              <>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="whitespace-nowrap">Day P&L</span>
                  <span className="live-dot shrink-0" />
                </div>
                <div className={`num mt-1 truncate whitespace-nowrap text-[15px] font-bold tracking-tight ${pnlClass(todayPnl)}`}>
                  {money(todayPnl, { sign: true, decimals: 0 })}
                </div>
              </>
            ) : (
              // The 72px rail leaves ~46px of inner width, which "+₹18.05 L"
              // overflows and truncates to an unreadable "+₹18.0…". Drop the
              // symbol and the space to fit, and hang the full figure off a
              // tooltip so nothing is actually lost.
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex cursor-default flex-col items-center justify-center gap-1.5">
                    <span className="live-dot" />
                    <div
                      className={`num w-full truncate whitespace-nowrap text-center text-[10px] font-bold tracking-tighter ${pnlClass(todayPnl)}`}
                    >
                      {money(todayPnl, { sign: true, decimals: 0, compact: true })
                        .replace("₹", "")
                        .replace(/\s+/g, "")}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Day P&L {money(todayPnl, { sign: true, decimals: 0 })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </footer>
      </aside>
    </TooltipProvider>
  );
}
