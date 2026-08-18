"use client";

import {
 useEffect, useState } from "react";
import {
 toast } from "sonner";

import {
 Panel } from "@/components/ui-kit";
import {
 Button } from "@/components/ui/button";
import {
 Checkbox } from "@/components/ui/checkbox";
import {
 useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/use-api";
import type { ChannelMatrix, NotificationCategory, NotificationChannel } from "@/lib/api";

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "in_app", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "telegram", label: "Telegram" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
];

const CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "trades", label: "Trades" },
  { key: "risk", label: "Risk" },
  { key: "broker", label: "Broker" },
  { key: "orders", label: "Orders" },
  { key: "system", label: "System" },
  { key: "webhooks", label: "Webhooks" },
];

const DEFAULT_MATRIX: ChannelMatrix = {
  trades: { in_app: true, email: true, telegram: false, sms: false, push: true },
  risk: { in_app: true, email: true, telegram: true, sms: true, push: true },
  broker: { in_app: true, email: true, telegram: false, sms: false, push: true },
  orders: { in_app: true, email: false, telegram: false, sms: false, push: true },
  system: { in_app: true, email: false, telegram: false, sms: false, push: false },
  webhooks: { in_app: true, email: false, telegram: false, sms: false, push: false },
};

export function ChannelMatrix() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  const [matrix, setMatrix] = useState<ChannelMatrix>(DEFAULT_MATRIX);

  useEffect(() => {
    if (settings?.channel_matrix) {
      setMatrix({ ...DEFAULT_MATRIX, ...settings.channel_matrix });
    }
  }, [settings]);

  const toggle = (category: NotificationCategory, channel: NotificationChannel, checked: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: checked },
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(
      { channel_matrix: matrix },
      {
        onSuccess: () => toast.success("Channel settings saved"),
        onError: () => toast.error("Failed to save channel settings"),
      }
    );
  };

  if (isLoading) {
    return (
      <Panel title="Channel Settings" subtitle="Per event category">
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Channel Settings" subtitle="Configure delivery channels per event category">
      <div className="overflow-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left">Category</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="px-2 py-2 text-center">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat.key} className="border-b border-border/60">
                <td className="py-2 pr-2 font-medium">{cat.label}</td>
                {CHANNELS.map((ch) => (
                  <td key={ch.key} className="px-2 py-2 text-center">
                    <Checkbox
                      checked={matrix[cat.key]?.[ch.key] ?? false}
                      onCheckedChange={(checked) =>
                        toggle(cat.key, ch.key, checked === true)
                      }
                      className="mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        size="sm"
        className="mt-4 h-7 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save channel settings"}
      </Button>
    </Panel>
  );
}
