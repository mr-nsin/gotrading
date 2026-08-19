"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListDashes, Scales, Money, TrendUp } from "@phosphor-icons/react";

import { PageHeader, KpiCard } from "@/components/ui-kit";
import { TerminalGrid } from "@/components/terminal-grid";
import { useSettings } from "@/components/settings-provider";
import { usePositions, useSquareOffPosition, useStrategies, useBrokers } from "@/hooks/use-api";

export default function PositionsPage() {
  const { money } = useSettings();
  const { data: positions = [], isLoading } = usePositions();
  const squareOffMutation = useSquareOffPosition();

  const handleRowSelect = (selectedRows: any[]) => {
    // Currently relying on multiRow selection
  };

  const totalUnrealised = positions.reduce((a, p) => a + (p.unrealized ?? p.pnl ?? 0), 0);
  const totalRealised = positions.reduce((a, p) => a + (p.realized ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Positions"
        description="All open and closed positions across strategies and broker accounts"
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          loading={isLoading}
          label="Positions"
          value={`${positions.length}`}
          icon={<ListDashes className="size-5 text-blue-400" weight="duotone" />}
        />
        <KpiCard
          loading={isLoading}
          label="Unrealised P&L"
          value={money(totalUnrealised, { sign: true, decimals: 0 })}
          tone={totalUnrealised >= 0 ? "profit" : "loss"}
          icon={<Scales className="size-5 text-amber-400" weight="duotone" />}
        />
        <KpiCard
          loading={isLoading}
          label="Realised P&L"
          value={money(totalRealised, { sign: true, decimals: 0 })}
          tone={totalRealised >= 0 ? "profit" : "loss"}
          icon={<Money className="size-5 text-indigo-400" weight="duotone" />}
        />
        <KpiCard
          loading={isLoading}
          label="Net P&L"
          value={money(totalUnrealised + totalRealised, { sign: true, decimals: 0 })}
          tone={totalUnrealised + totalRealised >= 0 ? "profit" : "loss"}
          icon={<TrendUp className="size-5 text-emerald-400" weight="duotone" />}
        />
      </div>

      <TerminalGrid
        variant="positions"
        rowData={positions}
        loading={isLoading}
        height="calc(100vh - 16rem)"
        stateKey="positions"
        exportName="positions"
        emptyMessage="No open positions"
      />
    </div>
  );
}
