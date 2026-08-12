"use client";

import { Panel, EmptyState, TableSkeleton } from "@/components/ui-kit";
import { useStrategyOrders } from "@/hooks/use-api";

interface StrategyOrdersTabProps {
  strategyId: string;
}

export function StrategyOrdersTab({ strategyId }: StrategyOrdersTabProps) {
  const { data: orders = [], isLoading, isError } = useStrategyOrders(strategyId);

  return (
    <Panel bodyClassName="" live>
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : isError ? (
        <EmptyState message="Unable to load orders — backend endpoint pending" />
      ) : orders.length === 0 ? (
        <EmptyState message="No orders for this strategy" />
      ) : (
        <EmptyState message={`${orders.length} orders — table view coming soon`} />
      )}
    </Panel>
  );
}
