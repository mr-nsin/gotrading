"use client";

import { Panel, EmptyState, TableSkeleton } from "@/components/ui-kit";
import { useLogs } from "@/hooks/use-api";

interface StrategyLogsTabProps {
  strategyId: string;
}

export function StrategyLogsTab({ strategyId }: StrategyLogsTabProps) {
  const { data: logs = [], isLoading, isError } = useLogs({ strategy_id: strategyId });

  return (
    <Panel bodyClassName="" live>
      {isLoading ? (
        <TableSkeleton rows={8} cols={3} />
      ) : isError ? (
        <EmptyState message="Unable to load logs" />
      ) : logs.length === 0 ? (
        <EmptyState message="No logs for this strategy" />
      ) : (
        <EmptyState message={`${logs.length} log entries — table view coming soon`} />
      )}
    </Panel>
  );
}
