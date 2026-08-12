"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/use-api";
import type { AlertRules } from "@/lib/api";

const DEFAULT_RULES: AlertRules = {
  daily_loss_threshold_pct: 2.5,
  margin_util_threshold_pct: 70,
  broker_disconnect_notify: true,
  order_rejection_notify: true,
};

export function AlertRulesForm() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  const [rules, setRules] = useState<AlertRules>(DEFAULT_RULES);

  useEffect(() => {
    if (settings?.alert_rules) {
      setRules({ ...DEFAULT_RULES, ...settings.alert_rules });
    }
  }, [settings]);

  const update = <K extends keyof AlertRules>(key: K, value: AlertRules[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(
      { alert_rules: rules },
      {
        onSuccess: () => toast.success("Alert rules saved"),
        onError: () => toast.error("Failed to save alert rules"),
      }
    );
  };

  if (isLoading) {
    return (
      <Panel title="Alert Rules">
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Alert Rules" subtitle="Threshold-based notification triggers">
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Notify if daily loss exceeds (%)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={rules.daily_loss_threshold_pct}
            onChange={(e) => update("daily_loss_threshold_pct", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Notify if margin utilisation exceeds (%)
          </Label>
          <Input
            type="number"
            step="1"
            value={rules.margin_util_threshold_pct}
            onChange={(e) => update("margin_util_threshold_pct", Number(e.target.value))}
            className="num h-8 text-xs"
          />
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span>Notify on any broker disconnect</span>
          <Switch
            checked={rules.broker_disconnect_notify}
            onCheckedChange={(v) => update("broker_disconnect_notify", v)}
          />
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span>Notify on every order rejection</span>
          <Switch
            checked={rules.order_rejection_notify}
            onCheckedChange={(v) => update("order_rejection_notify", v)}
          />
        </div>
      </div>

      <Button
        size="sm"
        className="mt-4 h-7 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save alert rules"}
      </Button>
    </Panel>
  );
}
