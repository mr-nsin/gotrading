"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useRiskSettings, useUpdateRiskSettings } from "@/hooks/use-api";
import type { RiskSettings } from "@/lib/api";

const DEFAULTS: RiskSettings = {
  daily_loss_limit: 150000,
  daily_loss_limit_pct: 3.0,
  max_open_positions: 24,
  max_capital_per_strategy_pct: 65,
  max_order_value: 500000,
  max_per_trade_loss: 25000,
  auto_kill_switch: true,
  circuit_breaker_enabled: true,
  circuit_breaker_threshold: 5,
  circuit_breaker_action: "PAUSE_ALL",
  vix_threshold: 12,
  block_entries_after: "14:45",
};

export function GlobalRiskForm() {
  const { data: settings, isLoading } = useRiskSettings();
  const updateMutation = useUpdateRiskSettings();
  const [form, setForm] = useState<RiskSettings>(DEFAULTS);

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULTS, ...settings });
    }
  }, [settings]);

  const update = <K extends keyof RiskSettings>(key: K, value: RiskSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => toast.success("Global risk settings saved"),
      onError: () => toast.error("Failed to save risk settings"),
    });
  };

  if (isLoading) {
    return (
      <Panel title="Loss & Exposure Limits">
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Loss & Exposure Limits"
      subtitle="Applied across all strategies unless overridden"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max daily loss (₹)</Label>
          <Input
            type="number"
            value={form.daily_loss_limit}
            onChange={(e) => update("daily_loss_limit", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max daily loss (%)</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.1"
              value={form.daily_loss_limit_pct}
              onChange={(e) => update("daily_loss_limit_pct", Number(e.target.value))}
              className="num h-8 text-xs"
            />
            <span className="num text-[11px] text-muted-foreground">%</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Max capital deployment ({form.max_capital_per_strategy_pct}%)
          </Label>
          <Slider
            value={[form.max_capital_per_strategy_pct]}
            onValueChange={([v]) => update("max_capital_per_strategy_pct", v)}
            min={10}
            max={100}
            step={1}
            className="mt-2"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max concurrent open positions</Label>
          <Input
            type="number"
            value={form.max_open_positions}
            onChange={(e) => update("max_open_positions", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max order value per trade (₹)</Label>
          <Input
            type="number"
            value={form.max_order_value}
            onChange={(e) => update("max_order_value", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max loss per trade (₹)</Label>
          <Input
            type="number"
            value={form.max_per_trade_loss}
            onChange={(e) => update("max_per_trade_loss", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-[12px]">
          <div>
            <div>Auto kill-switch on daily loss breach</div>
            <p className="text-[11px] text-muted-foreground">
              Pauses all strategies and squares off automatically.
            </p>
          </div>
          <Switch
            checked={form.auto_kill_switch}
            onCheckedChange={(v) => update("auto_kill_switch", v)}
          />
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <div>
            <div>Circuit breaker / volatility pause</div>
            <p className="text-[11px] text-muted-foreground">
              Pause entries when India VIX exceeds threshold intraday.
            </p>
          </div>
          <Switch
            checked={form.circuit_breaker_enabled}
            onCheckedChange={(v) => update("circuit_breaker_enabled", v)}
          />
        </div>

        {form.circuit_breaker_enabled && (
          <div className="ml-4 space-y-1">
            <Label className="text-[11px] text-muted-foreground">VIX threshold (%)</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.5"
                value={form.vix_threshold}
                onChange={(e) => update("vix_threshold", Number(e.target.value))}
                className="num h-8 w-24 text-xs"
              />
              <span className="num text-[11px] text-muted-foreground">%</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[12px]">
          <div>
            <div>Block new entries after time</div>
            <p className="text-[11px] text-muted-foreground">Intraday strategies only.</p>
          </div>
          <Input
            type="time"
            value={form.block_entries_after}
            onChange={(e) => update("block_entries_after", e.target.value)}
            className="num h-8 w-28 text-xs"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="mt-4 h-7 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save global settings"}
      </Button>
    </Panel>
  );
}
