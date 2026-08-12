"use client";

import { useState } from "react";
import { AlertTriangle, Shield, Power } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useRiskSettings, useUpdateRiskSettings, useEmergencyStop } from "@/hooks/use-api";
import { formatINR } from "@/lib/format";

export default function RiskPage() {
  const { data: settings, isLoading } = useRiskSettings();
  const updateMutation = useUpdateRiskSettings();
  const emergencyStopMutation = useEmergencyStop();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    daily_loss_limit: 50000,
    max_open_positions: 10,
    max_capital_per_strategy_pct: 30,
    circuit_breaker_threshold: 5,
  });

  const handleEmergencyStop = () => {
    if (confirm("Are you sure you want to trigger emergency stop? This will pause all strategies and square off positions.")) {
      emergencyStopMutation.mutate(undefined, {
        onSuccess: () => toast.success("Emergency stop triggered"),
        onError: () => toast.error("Failed to trigger emergency stop"),
      });
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Risk settings updated");
        setEditMode(false);
      },
      onError: () => toast.error("Failed to update settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Risk Management"
        description="Configure risk limits and emergency controls"
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEmergencyStop}
            disabled={emergencyStopMutation.isPending}
          >
            <Power className="mr-2 size-4" />
            Emergency Stop
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily Risk Limits" className="h-fit">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Daily Loss Limit</div>
                <div className="text-xs text-muted-foreground">
                  Maximum loss allowed per day
                </div>
              </div>
              <div className="num text-lg font-semibold">
                {formatINR(settings?.daily_loss_limit || 50000, { decimals: 0 })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Max Open Positions</div>
                <div className="text-xs text-muted-foreground">
                  Maximum concurrent positions
                </div>
              </div>
              <div className="num text-lg font-semibold">
                {settings?.max_open_positions || 10}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Max Capital per Strategy</div>
                <div className="text-xs text-muted-foreground">
                  Percentage of total capital
                </div>
              </div>
              <div className="num text-lg font-semibold">
                {settings?.max_capital_per_strategy_pct || 30}%
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Circuit Breaker" className="h-fit">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Status</div>
                <div className="text-xs text-muted-foreground">
                  Automatic protection system
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-profit" />
                <span className="text-sm font-medium text-profit">
                  {settings?.circuit_breaker_enabled ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Trigger Threshold</div>
                <div className="text-xs text-muted-foreground">
                  Loss percentage to trigger
                </div>
              </div>
              <div className="num text-lg font-semibold">
                {settings?.circuit_breaker_threshold || 5}%
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Action</div>
                <div className="text-xs text-muted-foreground">
                  What happens when triggered
                </div>
              </div>
              <div className="text-sm font-medium">
                {settings?.circuit_breaker_action === "PAUSE_ALL"
                  ? "Pause All Strategies"
                  : settings?.circuit_breaker_action}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Emergency Controls"
        className="border-destructive/50"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Kill Switch</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The emergency stop will immediately pause all running strategies and initiate
              square-off for all open positions. Use this only in emergency situations.
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={handleEmergencyStop}
              disabled={emergencyStopMutation.isPending}
            >
              <Power className="mr-2 size-4" />
              Activate Emergency Stop
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
