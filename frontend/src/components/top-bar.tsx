"use client";

import { useEffect, useState } from "react";
import { Moon, Power, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { useSettings } from "@/components/settings-provider";
import { useDashboardTotals, useStrategies, useBrokers, useEmergencyStop } from "@/hooks/use-api";
import { formatPct, pnlClass } from "@/lib/format";
import { StatusPill } from "@/components/ui-kit";

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="num hidden text-[11px] text-muted-foreground lg:inline">
      {now ?? "--:--:--"} IST
    </span>
  );
}

export function TopBar() {
  const { money, theme, toggleTheme, numberMode, setNumberMode, strategyFilter, setStrategyFilter, brokerFilter, setBrokerFilter, killed, setKilled } =
    useSettings();

  const { data: totals } = useDashboardTotals();
  const { data: strategiesData } = useStrategies();
  const { data: brokersData } = useBrokers();
  const emergencyStopMutation = useEmergencyStop();

  const strategies = strategiesData || [];
  const brokers = brokersData || [];

  const t = totals || {
    portfolioValue: 0,
    todayPnl: 0,
    todayPnlPct: 0,
    marginAvailable: 0,
    activeStrategies: 0,
  };

  const handleKillSwitch = () => {
    emergencyStopMutation.mutate(undefined, {
      onSuccess: () => {
        setKilled(true);
        toast.error("Kill switch activated — all strategies paused, square-off dispatched.");
      },
      onError: () => {
        toast.error("Failed to activate kill switch");
      },
    });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex h-12 items-center gap-2 px-2 sm:px-3">
        <div className="flex items-center gap-3 border-l border-border pl-3">
          <div className="leading-tight">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Equity</div>
            <div className="num text-[13px] font-semibold">{money(t.portfolioValue, { decimals: 0 })}</div>
          </div>
          <div className="leading-tight">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Day P&L</div>
            <div className={`num text-[13px] font-semibold ${pnlClass(t.todayPnl)}`}>
              {money(t.todayPnl, { sign: true, decimals: 0 })}{" "}
              <span className="text-[10px]">{formatPct(t.todayPnlPct)}</span>
            </div>
          </div>
          <div className="hidden leading-tight xl:block">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Margin Avl.</div>
            <div className="num text-[13px] font-semibold">{money(t.marginAvailable, { decimals: 0 })}</div>
          </div>
        </div>

        <div className="ml-2 hidden items-center gap-1 border-l border-border pl-3 2xl:flex">
          {brokers.slice(0, 5).map((b) => (
            <StatusPill key={b.id} status={b.status.toLowerCase()} label={b.name} dot />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Clock />
          <button
            type="button"
            aria-label="Open command palette"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
              )
            }
            className="relative hidden h-7 w-44 items-center gap-2 rounded-md border border-input bg-surface-2/60 pl-7 pr-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex"
          >
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
            <span className="flex-1 truncate">Search…</span>
            <kbd className="num rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
          </button>

          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger className="hidden h-7 w-[150px] text-xs lg:flex">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All strategies</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brokerFilter} onValueChange={setBrokerFilter}>
            <SelectTrigger className="hidden h-7 w-[120px] text-xs lg:flex">
              <SelectValue placeholder="Broker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brokers</SelectItem>
              {brokers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="num hidden h-7 px-2 text-[11px] sm:inline-flex"
            onClick={() => setNumberMode(numberMode === "indian" ? "international" : "indian")}
          >
            {numberMode === "indian" ? "L / Cr" : "M / B"}
          </Button>

          <Button variant="ghost" size="icon" className="size-7" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-7 gap-1 px-2 text-[11px] font-semibold">
                <Power className="size-3.5" />
                <span className="hidden sm:inline">KILL</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate emergency kill switch?</AlertDialogTitle>
                <AlertDialogDescription>
                  This squares off <strong>all open positions</strong> across every broker account and pauses
                  all {t.activeStrategies} live strategies immediately. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleKillSwitch}
                  disabled={emergencyStopMutation.isPending}
                >
                  {emergencyStopMutation.isPending ? "Activating..." : "Yes, kill everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {killed && (
        <div className="flex items-center gap-2 border-t border-loss/40 bg-loss-muted px-3 py-1 text-[11px] text-loss">
          <span className="size-1.5 animate-pulse rounded-full bg-loss" />
          Kill switch is ACTIVE — all strategies paused and positions squared off.
          <button className="ml-auto underline" onClick={() => setKilled(false)}>
            Reset
          </button>
        </div>
      )}
    </header>
  );
}
