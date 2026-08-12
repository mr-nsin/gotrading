"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Panel, Tag } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBrokers, useCreateStrategy, useUpdateStrategy } from "@/hooks/use-api";
import type { Strategy } from "@/lib/api";

import { MODES, SEGMENTS } from "./constants";
import { OptionsConfig } from "./options-config";
import { RiskConfig } from "./risk-config";
import { RuleBuilder } from "./rule-builder";
import { ScheduleConfig } from "./schedule-config";
import { type StrategyFormValues, strategyFormSchema } from "./schema";
import { SizingConfig } from "./sizing-config";
import { getDefaultFormValues, toApiPayload } from "./utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FormLabel className="text-[11px] text-muted-foreground">{label}</FormLabel>
      {children}
    </div>
  );
}

export interface StrategyBuilderProps {
  strategy?: Strategy;
  mode?: "create" | "edit";
  onSuccess?: (strategy: Strategy) => void;
  showActions?: boolean;
}

export function StrategyBuilder({
  strategy,
  mode = "create",
  onSuccess,
  showActions = true,
}: StrategyBuilderProps) {
  const router = useRouter();
  const createMutation = useCreateStrategy();
  const updateMutation = useUpdateStrategy();
  const { data: brokers = [] } = useBrokers();

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: getDefaultFormValues(strategy),
  });

  const segment = form.watch("segment");
  const webhook = form.watch("webhook");
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: StrategyFormValues) => {
    const payload = toApiPayload(values);

    if (mode === "edit" && strategy?.id) {
      updateMutation.mutate(
        { id: strategy.id, data: payload as Partial<Strategy> },
        {
          onSuccess: (updated) => {
            toast.success("Strategy updated successfully");
            onSuccess?.(updated);
          },
          onError: () => toast.error("Failed to update strategy"),
        },
      );
      return;
    }

    createMutation.mutate(payload as Partial<Strategy>, {
      onSuccess: (created) => {
        toast.success("Strategy created successfully");
        onSuccess?.(created);
        router.push(`/strategies/${created.id}`);
      },
      onError: () => toast.error("Failed to create strategy"),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="space-y-3 xl:col-span-2">
            <Panel title="Basics">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Strategy name">
                        <FormControl>
                          <Input {...field} placeholder="e.g. Nifty ORB Breakout" className="h-8 text-xs" />
                        </FormControl>
                      </Row>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Segment">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEGMENTS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                    </FormItem>
                  )}
                />

                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <Row label="Description">
                          <FormControl>
                            <Textarea {...field} rows={2} className="text-xs" />
                          </FormControl>
                        </Row>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instruments"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Instruments / universe">
                        <FormControl>
                          <Input {...field} className="num h-8 text-xs" placeholder="NIFTY, BANKNIFTY" />
                        </FormControl>
                      </Row>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Execution mode">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MODES.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m} Trading
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capital_allocated"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Capital allocation (₹)">
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="num h-8 text-xs"
                            min={10000}
                            step={10000}
                          />
                        </FormControl>
                      </Row>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <Row label="Strategy type">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["INTRADAY", "SWING", "OPTIONS", "SCALPING"].map((t) => (
                              <SelectItem key={t} value={t}>
                                {t.charAt(0) + t.slice(1).toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            <Panel title="Rule Builder" subtitle="No-code entry & exit logic from indicator blocks">
              <div className="space-y-4">
                <RuleBuilder
                  rulesField="entryRules"
                  joinField="entryJoin"
                  label="Entry conditions"
                  defaultJoin="AND"
                />
                <div className="h-px bg-border" />
                <RuleBuilder
                  rulesField="exitRules"
                  joinField="exitJoin"
                  label="Exit conditions"
                  defaultJoin="OR"
                />
              </div>
            </Panel>

            {segment === "Options" && (
              <Panel title="Options Configuration">
                <OptionsConfig />
              </Panel>
            )}

            <Panel title="Position Sizing">
              <SizingConfig />
            </Panel>

            <Panel title="Risk Controls (strategy level)">
              <RiskConfig />
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel title="Broker & Account Assignment">
              <FormField
                control={form.control}
                name="brokers"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-1.5">
                      {brokers.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          No brokers connected. Add a broker to assign accounts.
                        </p>
                      ) : (
                        brokers.map((b) => {
                          const brokerId = b.id ?? b.code ?? b.name.toLowerCase().replace(/\s+/g, "");
                          const checked = field.value?.includes(brokerId);
                          return (
                            <label
                              key={brokerId}
                              className="flex cursor-pointer items-center gap-2 rounded border border-border bg-surface-2 px-2 py-1.5 text-[12px]"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  if (v) {
                                    field.onChange([...(field.value ?? []), brokerId]);
                                  } else {
                                    field.onChange((field.value ?? []).filter((x) => x !== brokerId));
                                  }
                                }}
                                className="size-3.5"
                              />
                              <span className="font-medium">{b.display_name ?? b.name}</span>
                              {b.clientId && (
                                <span className="num text-[10px] text-muted-foreground">{b.clientId}</span>
                              )}
                              <Tag className="ml-auto">{b.status.replace(/_/g, " ")}</Tag>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Panel>

            <Panel title="Schedule">
              <ScheduleConfig />
            </Panel>

            <Panel title="Signal Source">
              <FormField
                control={form.control}
                name="webhook"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-medium">TradingView / Webhook alerts</div>
                        <p className="text-[11px] text-muted-foreground">
                          Execute on external signals instead of built-in rules.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    {webhook && (
                      <div className="num mt-2 truncate rounded border border-border bg-surface-2 px-2 py-1.5 text-[10px] text-muted-foreground">
                        https://api.gotrading.in/hooks/v1/tv/{strategy?.id ?? "new-strategy"}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </Panel>
          </div>
        </div>

        {showActions && (
          <div className="flex justify-end gap-2">
            {mode === "create" && (
              <Button type="button" variant="outline" onClick={() => router.push("/strategies")}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                  ? "Save Configuration"
                  : "Create Strategy"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
