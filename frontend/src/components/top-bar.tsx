"use client";

import {
 useEffect, useState } from "react";
import {
 CalendarIcon, Moon, Power, MagnifyingGlass as Search, Sun } from "@phosphor-icons/react";
import {
 format } from "date-fns";

import {
 Button } from "@/components/ui/button";
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {

  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
 Calendar } from "@/components/ui/calendar";
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
import {
 cn } from "@/lib/utils";
import {
 toast } from "sonner";

import {
 useSettings } from "@/components/settings-provider";
import {
 useDashboardTotals, useStrategies, useBrokers, useEmergencyStop } from "@/hooks/use-api";
import {
 formatPct, pnlClass } from "@/lib/format";
import {
 StatusPill } from "@/components/ui-kit";
import {
 BrokerLogo } from "@/components/broker-logo";

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

  const [date, setDate] = useState<Date | undefined>(new Date());

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
    // flex-col wrapper: the kill-switch banner below was a direct child of a
    // flex-row header, so it laid out as a third column squeezed inside the 56px
    // bar instead of a full-width strip under it.
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex shrink-0 items-center gap-4">
            {/* whitespace-nowrap throughout: without it "₹52.20 L" broke after the
                amount and rendered 40px tall against a 20px line-height, pushing
                the header's content to 65px inside a 56px bar and clipping the
                labels off the top. */}
            <div className="flex shrink-0 flex-col justify-center">
              <span className="whitespace-nowrap text-[10px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">Equity</span>
              <span className="num whitespace-nowrap text-sm font-bold leading-tight tracking-tight">{money(t.portfolioValue, { decimals: 0 })}</span>
            </div>
            <div className="h-8 w-px shrink-0 bg-border" />
            <div className="flex shrink-0 flex-col justify-center">
              <span className="whitespace-nowrap text-[10px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">Day P&L</span>
              <div className={`num flex items-baseline gap-1.5 whitespace-nowrap text-sm font-bold leading-tight tracking-tight ${pnlClass(t.todayPnl)}`}>
                {money(t.todayPnl, { sign: true, decimals: 0 })}
                <span className="whitespace-nowrap text-[11px] font-medium opacity-80">{formatPct(t.todayPnlPct)}</span>
              </div>
            </div>
            <div className="hidden h-8 w-px shrink-0 bg-border xl:block" />
            <div className="hidden shrink-0 flex-col justify-center xl:flex">
              <span className="whitespace-nowrap text-[10px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">Margin Avl.</span>
              <span className="num whitespace-nowrap text-sm font-bold leading-tight tracking-tight">{money(t.marginAvailable, { decimals: 0 })}</span>
            </div>
          </div>

          <div className="hidden min-w-0 items-center gap-1.5 xl:flex">
            {brokers.slice(0, 4).map((b) => (
              <div key={b.id} className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 pr-2">
                <BrokerLogo name={b.name || b.broker_type || ""} size={20} className="shrink-0 rounded-full" />
                <StatusPill status={b.status.toLowerCase()} label={b.name} dot className="truncate border-0 bg-transparent pl-0 text-xs" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Clock />

          {/* These controls were fixed-width and always visible, so at ~730px the
              row could not fit and forced the readouts to wrap. They now reveal
              progressively: selects narrow below xl, and the date picker — the
              widest and least-used control — drops out below lg. */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "hidden h-8 w-[130px] justify-start text-left font-normal lg:inline-flex",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" weight="duotone" />
                  {date ? format(date, "MMM dd, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>

            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="h-8 w-[112px] text-xs font-medium xl:w-[140px]">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {strategies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="h-8 w-[112px] text-xs font-medium xl:w-[140px]">
                <SelectValue placeholder="Broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="num hidden h-8 w-14 px-0 text-xs font-medium sm:inline-flex"
              onClick={() => setNumberMode(numberMode === "indian" ? "international" : "indian")}
            >
              {numberMode === "indian" ? "L / Cr" : "M / B"}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" weight="duotone" /> : <Moon className="h-4 w-4" weight="duotone" />}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8 gap-1.5 px-3 text-xs font-bold shadow-sm">
                  <Power className="size-3.5" weight="bold" />
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
