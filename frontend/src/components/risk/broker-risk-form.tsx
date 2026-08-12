"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel, StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useBroker, useUpdateBrokerSettings } from "@/hooks/use-api";
import type { BrokerRiskSettings } from "@/lib/api";

interface BrokerRiskFormProps {
  brokerId: string;
}

export function BrokerRiskForm({ brokerId }: BrokerRiskFormProps) {
  const { data: broker, isLoading } = useBroker(brokerId);
  const updateMutation = useUpdateBrokerSettings();

  const [form, setForm] = useState({
    maxDailyLoss: 50000,
    maxMarginUtil: 70,
    maxPositions: 10,
    autoSquareOff: "15:20",
    leverageCap: 5,
    maxExposure: 0,
  });

  useEffect(() => {
    if (broker) {
      const s = broker.settings;
      setForm({
        maxDailyLoss: s?.maxDailyLoss ?? 50000,
        maxMarginUtil: s?.maxMarginUtil ?? 70,
        maxPositions: s?.maxPositions ?? 10,
        autoSquareOff: s?.autoSquareOff ?? "15:20",
        leverageCap: s?.leverageCap ?? 5,
        maxExposure: broker.funds ?? 0,
      });
    }
  }, [broker]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const payload: BrokerRiskSettings = {
      max_daily_loss: form.maxDailyLoss,
      max_margin_util: form.maxMarginUtil,
      max_positions: form.maxPositions,
      auto_square_off: form.autoSquareOff,
      leverage_cap: form.leverageCap,
    };

    updateMutation.mutate(
      { id: brokerId, data: payload },
      {
        onSuccess: () => toast.success(`${broker?.name ?? "Broker"} risk settings saved`),
        onError: () => toast.error("Failed to save broker settings"),
      }
    );
  };

  if (isLoading) {
    return (
      <Panel title="Broker risk limits">
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={`${broker?.name ?? "Broker"} risk limits`}
      subtitle={broker?.clientId ? `Client ID ${broker.clientId}` : undefined}
      actions={broker?.status ? <StatusPill status={broker.status} dot /> : undefined}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max daily loss (₹)</Label>
          <Input
            type="number"
            value={form.maxDailyLoss}
            onChange={(e) => update("maxDailyLoss", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Max margin utilisation ({form.maxMarginUtil}%)
          </Label>
          <Slider
            value={[form.maxMarginUtil]}
            onValueChange={([v]) => update("maxMarginUtil", v)}
            min={10}
            max={100}
            step={1}
            className="mt-2"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max positions</Label>
          <Input
            type="number"
            value={form.maxPositions}
            onChange={(e) => update("maxPositions", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Auto square-off time</Label>
          <Input
            type="time"
            value={form.autoSquareOff}
            onChange={(e) => update("autoSquareOff", e.target.value)}
            className="num h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Leverage cap (x)</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.5"
              value={form.leverageCap}
              onChange={(e) => update("leverageCap", Number(e.target.value))}
              className="num h-8 text-xs"
            />
            <span className="num text-[11px] text-muted-foreground">x</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Max exposure (₹)</Label>
          <Input
            type="number"
            value={form.maxExposure}
            onChange={(e) => update("maxExposure", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="mt-4 h-7 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : `Save ${broker?.name ?? "broker"} settings`}
      </Button>
    </Panel>
  );
}
