"use client";

import {
 Panel, EmptyState } from "@/components/ui-kit";

interface StrategyPnlTabProps {
  strategyId: string;
}

export function StrategyPnlTab({ strategyId }: StrategyPnlTabProps) {
  return (
    <div className="space-y-3">
      <Panel title="Daily P&L (last 30 sessions)">
        <EmptyState message="Daily P&L chart — coming soon" />
      </Panel>
      <Panel title="Trade-by-trade log" bodyClassName="">
        <EmptyState message={`Trade log for strategy ${strategyId.slice(0, 8)}… — coming soon`} />
      </Panel>
    </div>
  );
}
