"use client";

import { useState } from "react";
import { PageHeader, Panel, StatusPill, Tag } from "@/components/ui-kit";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useLogs } from "@/hooks/use-api";
import { formatTime } from "@/lib/format";
import type { LogEntry } from "@/lib/api";

const LOG_LEVELS = ["All", "INFO", "WARN", "ERROR", "TRADE"] as const;

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>("All");
  const { data: logs = [], isLoading } = useLogs(
    levelFilter !== "All" ? { level: levelFilter } : undefined
  );

  const columns: Column<LogEntry>[] = [
    {
      key: "time",
      header: "Time",
      cell: (l) => (
        <span className="num text-muted-foreground">
          {formatTime(l.timestamp || l.time || "")}
        </span>
      ),
    },
    {
      key: "level",
      header: "Level",
      cell: (l) => <StatusPill status={l.level} />,
    },
    {
      key: "source",
      header: "Source",
      cell: (l) => (
        <div className="flex gap-1">
          {l.strategy_id && <Tag>{l.strategy_id}</Tag>}
          {l.broker_id && <Tag>{l.broker_id}</Tag>}
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      className: "max-w-xl",
      cell: (l) => (
        <span className="text-xs leading-relaxed">{l.message}</span>
      ),
    },
  ];

  const logCounts = {
    INFO: logs.filter((l) => l.level === "INFO").length,
    WARN: logs.filter((l) => l.level === "WARN").length,
    ERROR: logs.filter((l) => l.level === "ERROR").length,
    TRADE: logs.filter((l) => l.level === "TRADE").length,
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="System Logs"
        description="Real-time execution logs from strategies, brokers, and system"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Info</div>
          <div className="num mt-1 text-xl font-semibold text-primary">
            {logCounts.INFO}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Warnings</div>
          <div className="num mt-1 text-xl font-semibold text-warn">
            {logCounts.WARN}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Errors</div>
          <div className="num mt-1 text-xl font-semibold text-loss">
            {logCounts.ERROR}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Trades</div>
          <div className="num mt-1 text-xl font-semibold text-profit">
            {logCounts.TRADE}
          </div>
        </div>
      </div>

      <Panel
        title="Execution Logs"
        subtitle={`${logs.length} entries`}
        live
        actions={
          <div className="flex gap-1">
            {LOG_LEVELS.map((level) => (
              <Button
                key={level}
                variant={levelFilter === level ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLevelFilter(level)}
              >
                {level}
              </Button>
            ))}
          </div>
        }
        bodyClassName=""
      >
        <DataTable
          columns={columns}
          rows={logs}
          rowKey={(l) => l.id}
          loading={isLoading}
          maxHeight="calc(100vh - 320px)"
        />
      </Panel>
    </div>
  );
}
