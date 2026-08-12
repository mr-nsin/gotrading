"use client";

import { Panel, EmptyState, TableSkeleton } from "@/components/ui-kit";
import { useStrategyPositions } from "@/hooks/use-api";

interface StrategyPositionsTabProps {
  strategyId: string;
}

export function StrategyPositionsTab({ strategyId }: StrategyPositionsTabProps) {
  const { data: positions = [], isLoading, isError } = useStrategyPositions(strategyId);

  return (
    <Panel bodyClassName="" live>
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : isError ? (
        <EmptyState message="Unable to load positions — backend endpoint pending" />
      ) : positions.length === 0 ? (
        <EmptyState message="No open positions for this strategy" />
      ) : (
        <EmptyState message={`${positions.length} positions — table view coming soon`} />
      )}
    </Panel>
  );
}
