"use client";



import {
 useQueryClient } from "@tanstack/react-query";



import {
 StrategyBuilder } from "@/components/strategy-builder";

import {
 Panel, EmptyState } from "@/components/ui-kit";

import type { Strategy } from "@/lib/api";



interface StrategyConfigTabProps {

  strategy?: Strategy;

}



export function StrategyConfigTab({ strategy }: StrategyConfigTabProps) {

  const queryClient = useQueryClient();



  if (!strategy) {

    return (

      <Panel title="Strategy Configuration">

        <EmptyState message="Load strategy to view configuration" />

      </Panel>

    );

  }



  return (

    <div className="space-y-3">

      <StrategyBuilder

        strategy={strategy}

        mode="edit"

        onSuccess={() => {

          queryClient.invalidateQueries({ queryKey: ["strategies", strategy.id] });

        }}

      />

      <Panel title="Configuration Version History">

        <EmptyState message="Version history — coming soon" />

      </Panel>

    </div>

  );

}

