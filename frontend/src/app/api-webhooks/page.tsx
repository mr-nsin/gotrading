"use client";

import { useState } from "react";
import { Copy, KeyRound, Plus, RefreshCw, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { toast } from "sonner";

import { KpiCard, PageHeader, Panel, StatusPill, Tag, TableSkeleton } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime, formatNum } from "@/lib/format";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useRotateWebhookSecret,
  useWebhookStats,
  useWebhookLogs,
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRotateApiKey,
  useApiKeyStats,
  useStrategies,
} from "@/hooks/use-api";
import type { Webhook, ApiKey } from "@/lib/api";

const SAMPLE_PAYLOAD = `{
  "secret": "whsec_••••••••",
  "strategy": "nifty-orb-breakout",
  "action": "BUY",
  "symbol": "NIFTY26AUG24500CE",
  "qty": 75,
  "order_type": "MARKET",
  "product": "MIS"
}`;

export default function ApiWebhooksPage() {
  const [ipAllowlist, setIpAllowlist] = useState("52.89.214.238, 34.212.75.30, 54.218.53.128");
  const [requireSecret, setRequireSecret] = useState(true);
  const [rateLimit, setRateLimit] = useState("60");
  const [newName, setNewName] = useState("");
  const [newStrategy, setNewStrategy] = useState("");
  const [open, setOpen] = useState(false);

  const { data: webhooksData, isLoading: webhooksLoading } = useWebhooks();
  const { data: webhookStats } = useWebhookStats();
  const { data: webhookLogs, isLoading: logsLoading } = useWebhookLogs();
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys();
  const { data: apiKeyStats } = useApiKeyStats();
  const { data: strategiesData } = useStrategies();

  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const testWebhookMutation = useTestWebhook();
  const rotateSecretMutation = useRotateWebhookSecret();
  const createApiKeyMutation = useCreateApiKey();
  const deleteApiKeyMutation = useDeleteApiKey();
  const rotateApiKeyMutation = useRotateApiKey();

  const hooks = webhooksData || [];
  const apiKeys = apiKeysData || [];
  const strategies = strategiesData || [];
  const logs = webhookLogs || [];

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleHook = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    updateWebhookMutation.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.info(`Webhook ${newStatus === "active" ? "resumed" : "paused"}`);
        },
      }
    );
  };

  const createHook = () => {
    if (!newName.trim()) {
      toast.error("Give the endpoint a name");
      return;
    }
    createWebhookMutation.mutate(
      {
        name: newName,
        strategy_id: newStrategy || null,
      },
      {
        onSuccess: () => {
          setNewName("");
          setOpen(false);
          toast.success("Webhook endpoint created", { description: "Paste the URL into your TradingView alert." });
        },
        onError: () => {
          toast.error("Failed to create webhook");
        },
      }
    );
  };

  const handleDeleteWebhook = (id: string, name: string) => {
    deleteWebhookMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`${name} deleted`);
      },
      onError: () => {
        toast.error("Failed to delete webhook");
      },
    });
  };

  const handleTestWebhook = (id: string) => {
    testWebhookMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Test signal sent");
      },
      onError: () => {
        toast.error("Test failed");
      },
    });
  };

  const handleGenerateApiKey = () => {
    createApiKeyMutation.mutate(
      { label: `API Key ${apiKeys.length + 1}`, scopes: ["read", "write"] },
      {
        onSuccess: () => {
          toast.success("New API key generated", { description: "Copy it now — it won't be shown again." });
        },
        onError: () => {
          toast.error("Failed to generate API key");
        },
      }
    );
  };

  const handleRotateApiKey = (id: string, label: string) => {
    rotateApiKeyMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`${label} key rotated`);
      },
      onError: () => {
        toast.error("Failed to rotate API key");
      },
    });
  };

  const handleRevokeApiKey = (id: string, label: string) => {
    deleteApiKeyMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`${label} key revoked`);
      },
      onError: () => {
        toast.error("Failed to revoke API key");
      },
    });
  };

  const hookCols: Column<Webhook>[] = [
    { key: "n", header: "Endpoint", cell: (h) => (
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium">{h.name}</div>
        <div className="num truncate text-[10px] text-muted-foreground">{h.url}</div>
      </div>
    ) },
    { key: "s", header: "Strategy", cell: (h) => <Tag>{h.strategy || 'Any'}</Tag> },
    { key: "c", header: "Calls", align: "right", sortable: true, sortValue: (h) => h.calls || 0, cell: (h) => <span className="num">{formatNum(h.calls || 0, 0)}</span> },
    { key: "l", header: "Last call", cell: (h) => <span className="num text-[11px] text-muted-foreground">{h.lastCall ? formatDateTime(h.lastCall) : 'Never'}</span> },
    { key: "st", header: "Status", cell: (h) => <StatusPill status={h.status} dot /> },
    {
      key: "a",
      header: "",
      align: "right",
      cell: (h) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copy(h.url, "Webhook URL")}>
            <Copy className="size-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => handleTestWebhook(h.id)}>
            Test
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => toggleHook(h.id, h.status)}>
            {h.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-loss"
            onClick={() => handleDeleteWebhook(h.id, h.name)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ),
    },
  ];

  const keyCols: Column<ApiKey>[] = [
    { key: "l", header: "Label", cell: (k) => <span className="text-[12px] font-medium">{k.label}</span> },
    { key: "k", header: "Key", cell: (k) => <span className="num text-[11px] text-muted-foreground">{k.keyMasked || k.key}</span> },
    { key: "s", header: "Scopes", cell: (k) => <Tag>{Array.isArray(k.scopes) ? k.scopes.join(', ') : k.scopes}</Tag> },
    { key: "c", header: "Created", cell: (k) => <span className="num text-[11px] text-muted-foreground">{k.createdAt ? formatDateTime(k.createdAt) : 'Unknown'}</span> },
    { key: "u", header: "Last used", cell: (k) => <span className="num text-[11px] text-muted-foreground">{k.lastUsed ? formatDateTime(k.lastUsed) : 'Never'}</span> },
    {
      key: "a",
      header: "",
      align: "right",
      cell: (k) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => handleRotateApiKey(k.id, k.label)}>
            <RefreshCw className="size-3" /> Rotate
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-loss" onClick={() => handleRevokeApiKey(k.id, k.label)}>
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  const activeHooks = hooks.filter((h) => h.status === "active").length;
  const totalCalls = webhookStats?.totalCalls || hooks.reduce((a, h) => a + (h.calls || 0), 0);
  const failed = webhookStats?.failedDeliveries || logs.filter((l) => l.level === "error" || l.level === "critical").length;

  return (
    <div className="space-y-3">
      <PageHeader
        title="API & Webhooks"
        description="Route external signals from TradingView or custom scripts straight into the execution engine."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-[11px]"><Plus className="size-3" /> New webhook</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create webhook endpoint</DialogTitle>
                <DialogDescription className="text-[12px]">
                  A unique URL is generated and mapped to the selected strategy. Signals hitting it place live orders.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Endpoint name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="TradingView — Nifty scalper" className="h-8 text-[12px]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Target strategy</Label>
                  <Select value={newStrategy} onValueChange={setNewStrategy}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select strategy (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-[12px]">Any strategy</SelectItem>
                      {strategies.map((s) => <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={createHook} disabled={createWebhookMutation.isPending}>
                  {createWebhookMutation.isPending ? "Creating..." : "Create endpoint"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label="Active endpoints" value={`${activeHooks}/${hooks.length}`} icon={<WebhookIcon className="size-3.5" />} />
        <KpiCard label="Signals received (30d)" value={formatNum(totalCalls, 0)} />
        <KpiCard label="Failed deliveries" value={String(failed)} tone={failed > 0 ? "loss" : "profit"} />
        <KpiCard label="API keys" value={String(apiKeys.length)} icon={<KeyRound className="size-3.5" />} sub="Live scope" />
      </div>

      <Panel title="Webhook endpoints" subtitle="Each URL maps to one strategy" bodyClassName="p-0" live>
        {webhooksLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : (
          <DataTable columns={hookCols} rows={hooks} rowKey={(h) => h.id} maxHeight="20rem" dense empty="No webhooks configured yet." />
        )}
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Sample payload"
          subtitle="POST JSON body expected by every endpoint"
          actions={<Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copy(SAMPLE_PAYLOAD, "Payload")}><Copy className="size-3" /> Copy</Button>}
        >
          <pre className="num overflow-auto rounded border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-muted-foreground">
{SAMPLE_PAYLOAD}
          </pre>
        </Panel>

        <Panel title="Security" subtitle="Protect your execution endpoints">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded border border-border bg-surface-2 px-2.5 py-2">
              <div>
                <div className="text-[12px] font-medium">Require shared secret</div>
                <div className="text-[10px] text-muted-foreground">Reject payloads without a matching secret field</div>
              </div>
              <Switch checked={requireSecret} onCheckedChange={(v) => { setRequireSecret(v); toast.info(v ? "Secret validation enabled" : "Secret validation disabled"); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">IP allowlist (comma separated)</Label>
              <Input value={ipAllowlist} onChange={(e) => setIpAllowlist(e.target.value)} className="num h-8 text-[11px]" placeholder="52.89.214.238" />
              <p className="text-[10px] text-muted-foreground">TradingView publishes these outbound IPs for alert webhooks.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Rate limit (requests / minute)</Label>
              <Input value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} className="num h-8 text-[12px]" placeholder="60" />
            </div>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => toast.success("Security settings saved")}>Save security settings</Button>
          </div>
        </Panel>
      </div>

      <Panel
        title="API keys"
        subtitle="Programmatic access to orders, positions and reports"
        bodyClassName="p-0"
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={handleGenerateApiKey}
            disabled={createApiKeyMutation.isPending}
          >
            <Plus className="size-3" /> {createApiKeyMutation.isPending ? "Generating..." : "Generate key"}
          </Button>
        }
      >
        {keysLoading ? (
          <TableSkeleton rows={2} cols={6} />
        ) : (
          <DataTable columns={keyCols} rows={apiKeys} rowKey={(k) => k.id} maxHeight="16rem" dense empty="No API keys generated yet." />
        )}
      </Panel>

      <Panel title="Delivery logs" subtitle="Recent inbound webhook events" bodyClassName="p-0" live>
        {logsLoading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : (
          <DataTable
            columns={[
              { key: "t", header: "Time", cell: (l: any) => <span className="num text-[11px] text-muted-foreground">{formatDateTime(l.timestamp || l.time)}</span> },
              { key: "lv", header: "Level", cell: (l: any) => <StatusPill status={l.level || l.status} /> },
              { key: "m", header: "Message", cell: (l: any) => <span className="text-[12px]">{l.message}</span> },
            ]}
            rows={logs}
            rowKey={(l: any) => l.id}
            maxHeight="20rem"
            empty="No webhook deliveries yet."
            dense
          />
        )}
      </Panel>
    </div>
  );
}
