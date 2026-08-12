"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  ScrollText,
  ShieldAlert,
  Terminal,
  User,
  Webhook,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardTotals } from "@/hooks/use-api";
import { useSettings } from "@/components/settings-provider";
import { pnlClass } from "@/lib/format";

const groups = [
  {
    label: "Trading",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
      { title: "Strategies", url: "/strategies", icon: Boxes },
      { title: "Positions", url: "/positions", icon: Activity },
      { title: "Orderbook", url: "/orders", icon: ListOrdered },
      { title: "Portfolio", url: "/portfolio", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { title: "Brokers", url: "/brokers", icon: Gauge },
      { title: "API & Webhooks", url: "/api-webhooks", icon: Webhook },
      { title: "Logs", url: "/logs", icon: Terminal },
    ],
  },
  {
    label: "Analysis",
    items: [
      { title: "Backtesting", url: "/backtesting", icon: FlaskConical },
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
  const { money } = useSettings();
  const { data: totals } = useDashboardTotals();

  const todayPnl = totals?.todayPnl || 0;

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <header className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ScrollText className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">GoTrading</div>
          <div className="num truncate text-[10px] text-muted-foreground">NSE · BSE · F&O</div>
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                      isActive(item.url, item.exact) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <footer className="border-t border-sidebar-border p-2">
        <div className="rounded-md bg-sidebar-accent px-2.5 py-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Day P&L</span>
            <span className="live-dot" />
          </div>
          <div className={`num text-sm font-semibold ${pnlClass(todayPnl)}`}>
            {money(todayPnl, { sign: true, decimals: 0 })}
          </div>
        </div>
      </footer>
    </aside>
  );
}
