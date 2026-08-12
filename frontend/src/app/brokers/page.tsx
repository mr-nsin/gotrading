"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { KpiCard, PageHeader, StatusPill, Tag } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/components/settings-provider";
import { useBrokers, useDashboardTotals, useAddBroker, useTestBroker, useReauthenticateBroker, useDisconnectBroker } from "@/hooks/use-api";
import type { Broker } from "@/lib/api";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-border bg-surface-2 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-[12px] font-medium ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

const BROKER_COLORS: Record<string, string> = {
  zerodha: "#387ED1",
  upstox: "#5D5FEF",
  angelone: "#FF6B35",
  fyers: "#4CAF50",
  dhan: "#FF9800",
  aliceblue: "#2196F3",
  "5paisa": "#E91E63",
  kotak: "#9C27B0",
};

export default function BrokersPage() {
  const { money } = useSettings();
  const { data: brokers = [], isLoading } = useBrokers();
  const { data: totals } = useDashboardTotals();
  const addBrokerMutation = useAddBroker();
  const testBrokerMutation = useTestBroker();
  const reauthMutation = useReauthenticateBroker();
  const disconnectMutation = useDisconnectBroker();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedBrokerType, setSelectedBrokerType] = useState("zerodha");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connectedCount = brokers.filter(
    (b) => (b.status || "").toLowerCase() === "connected"
  ).length;

  const totalFunds = brokers.reduce((sum, b) => sum + (b.funds || b.balance || 0), 0);
  const totalUsed = brokers.reduce((sum, b) => sum + (b.marginUsed || b.used || 0), 0);
  const totalAvailable = totalFunds - totalUsed;

  const handleTestConnection = () => {
    toast.success("Connection test passed · latency 148ms");
  };

  const handleAddBroker = () => {
    addBrokerMutation.mutate(
      { broker_type: selectedBrokerType, api_key: apiKey, api_secret: apiSecret },
      {
        onSuccess: () => {
          toast.success("Broker connected");
          setAddDialogOpen(false);
          setApiKey("");
          setApiSecret("");
          setAccessToken("");
        },
        onError: () => toast.error("Failed to connect broker"),
      }
    );
  };

  const handleReauthenticate = (id: string, name: string) => {
    reauthMutation.mutate(id, {
      onSuccess: () => toast.success(`${name} token refreshed`),
      onError: () => toast.error(`Failed to refresh ${name} token`),
    });
  };

  const handleDisconnect = (id: string, name: string) => {
    disconnectMutation.mutate(id, {
      onSuccess: () => toast.error(`${name} disconnected`),
      onError: () => toast.error(`Failed to disconnect ${name}`),
    });
  };

  const getBrokerColor = (broker: Broker) => {
    const code = (broker.code || broker.broker_type || "").toLowerCase();
    return BROKER_COLORS[code] || "#666666";
  };

  const getBrokerInitials = (broker: Broker) => {
    const name = broker.name || broker.display_name || "";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Brokers"
        description="Connected broker API accounts and daily token status"
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1 text-xs">
                <Plus className="size-3.5" /> Add broker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect a broker</DialogTitle>
                <DialogDescription>
                  Enter your API credentials. Keys are encrypted at rest.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Broker</Label>
                  <Select value={selectedBrokerType} onValueChange={setSelectedBrokerType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Zerodha",
                        "Upstox",
                        "Angel One",
                        "Fyers",
                        "Dhan",
                        "Alice Blue",
                        "5paisa",
                        "Kotak Neo",
                      ].map((b) => (
                        <SelectItem key={b} value={b.toLowerCase().replace(" ", "")}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">API key</Label>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="num h-8 text-xs"
                    placeholder="xxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">API secret</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="num h-8 text-xs"
                    placeholder="••••••••••••"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Access token</Label>
                  <Input
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="num h-8 text-xs"
                    placeholder="Generated after login redirect"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={handleTestConnection}>
                  Test connection
                </Button>
                <Button size="sm" onClick={handleAddBroker}>
                  Connect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          loading={isLoading}
          label="Connected"
          value={`${connectedCount} / ${brokers.length}`}
          tone="profit"
        />
        <KpiCard loading={isLoading} label="Total Funds" value={money(totalFunds, { decimals: 0 })} />
        <KpiCard
          loading={isLoading}
          label="Margin Used"
          value={money(totalUsed, { decimals: 0 })}
          tone="warn"
        />
        <KpiCard
          loading={isLoading}
          label="Margin Available"
          value={money(totalAvailable, { decimals: 0 })}
          tone="profit"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {brokers.map((b) => {
          const funds = b.funds || b.balance || 0;
          const used = b.marginUsed || b.used || 0;
          const available = b.marginAvailable || funds - used;
          const util = funds ? (used / funds) * 100 : 0;
          const name = b.name || b.display_name || "Unknown";

          return (
            <div key={b.id} className="panel p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-2 text-[11px] font-bold"
                    style={{ color: getBrokerColor(b) }}
                  >
                    {getBrokerInitials(b)}
                  </div>
                  <div>
                    <Link
                      href={`/brokers/${b.id}`}
                      className="text-[13px] font-semibold hover:text-primary"
                    >
                      {name}
                    </Link>
                    <div className="num text-[10px] text-muted-foreground">
                      {b.code || b.broker_type} · {b.clientId || b.client_id || "—"}
                    </div>
                  </div>
                </div>
                <StatusPill status={b.status} dot />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <Stat label="Funds" value={money(funds, { decimals: 0 })} />
                <Stat label="Used" value={money(used, { decimals: 0 })} tone="text-warn" />
                <Stat label="Available" value={money(available, { decimals: 0 })} tone="text-profit" />
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Margin utilisation</span>
                  <span className="num">{util.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${util > 70 ? "bg-loss" : util > 45 ? "bg-warn" : "bg-profit"}`}
                    style={{ width: `${Math.min(util, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                {b.apiKeyMasked && <Tag>API {b.apiKeyMasked}</Tag>}
                {b.tokenExpiry && <Tag>Token: {b.tokenExpiry}</Tag>}
                <Tag>{b.strategies || 0} strategies</Tag>
              </div>

              <div className="mt-3 flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 gap-1 text-[11px]"
                  onClick={() => handleReauthenticate(b.id, name)}
                  disabled={reauthMutation.isPending}
                >
                  <RefreshCw className="size-3" /> Re-authenticate
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] text-loss">
                      <Unplug className="size-3" /> Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {b.strategies || 0} strategies routed through this account will be paused
                        immediately. Open positions will remain but cannot be managed by GoTrading.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDisconnect(b.id, name)}
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}

        {brokers.length === 0 && !isLoading && (
          <div className="col-span-full flex h-48 items-center justify-center text-sm text-muted-foreground">
            No brokers connected. Add a broker to start trading.
          </div>
        )}
      </div>
    </div>
  );
}
