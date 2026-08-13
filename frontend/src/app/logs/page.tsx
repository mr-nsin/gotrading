"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, StatusPill, Tag } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { useLogs, useStrategies, useBrokers } from "@/hooks/use-api";
import type { LogEntry } from "@/lib/api";

const CHIPS: Array<[string, string]> = [
  ["all", "All logs"],
  ["strategy", "Strategy execution"],
  ["broker", "Broker / API"],
  ["order", "Order rejections"],
  ["system", "System"],
  ["webhook", "Webhooks"],
];

export default function LogsPage() {
  const { data: logs = [], isLoading } = useLogs();
  const { data: strategies = [] } = useStrategies();
  const { data: brokers = [] } = useBrokers();

  const [source, setSource] = useState("all");
  const [level, setLevel] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [broker, setBroker] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      logs.filter(
        (l) =>
          (source === "all" || (l.source || "").toLowerCase() === source) &&
          (level === "all" || l.level.toLowerCase() === level.toLowerCase()) &&
          (strategy === "all" || l.strategy_id === strategy) &&
          (broker === "all" || l.broker_id === broker) &&
          (q === "" || l.message.toLowerCase().includes(q.toLowerCase())),
      ),
    [logs, source, level, strategy, broker, q],
  );

  const strategyById = (id: string) => strategies.find((s) => s.id === id || s.name === id);
  const brokerById = (id: string) => brokers.find((b) => b.id === id || b.name === id);

  const cols: Column<LogEntry>[] = [
    {
      key: "t",
      header: "Timestamp",
      sortable: true,
      sortValue: (l) => l.timestamp || l.time || "",
      cell: (l) => (
        <span className="num text-muted-foreground">
          {formatDateTime(l.timestamp || l.time || "")}
        </span>
      ),
    },
    { key: "lvl", header: "Level", cell: (l) => <StatusPill status={l.level} /> },
    { key: "src", header: "Source", cell: (l) => <Tag className="uppercase">{l.source || "SYSTEM"}</Tag> },
    {
      key: "ctx",
      header: "Context",
      cell: (l) => (
        <Tag>
          {l.strategy_id
            ? strategyById(l.strategy_id)?.name || l.strategy_id
            : l.broker_id
              ? brokerById(l.broker_id)?.name || l.broker_id
              : "Engine"}
        </Tag>
      ),
    },
    { key: "msg", header: "Message", cell: (l) => <span className="text-[12px]">{l.message}</span> },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Logs"
        description="Every execution, connectivity and system event emitted by the engine"
        actions={
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => toast.success("Exporting logs as CSV…")}>
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setSource(v)}
            className={`rounded border px-2 py-1 text-[11px] ${source === v ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search message…" className="h-7 w-60 text-xs" />
        <Sel value={level} onChange={setLevel} options={[["all", "All severities"], ["info", "Info"], ["warning", "Warning"], ["error", "Error"], ["critical", "Critical"], ["trade", "Trade"]]} />
        <Sel value={strategy} onChange={setStrategy} options={[["all", "All strategies"], ...strategies.map((s) => [s.id, s.name] as [string, string])]} />
        <Sel value={broker} onChange={setBroker} options={[["all", "All brokers"], ...brokers.map((b) => [b.id, b.name] as [string, string])]} />
        <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} className="h-7 w-36 text-xs" />
        <span className="num ml-auto text-[11px] text-muted-foreground">{rows.length} events</span>
      </div>

      <Panel bodyClassName="" live>
        <DataTable columns={cols} rows={rows} rowKey={(l) => l.id} maxHeight="calc(100vh - 18rem)" loading={isLoading} dense />
      </Panel>
    </div>
  );
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
