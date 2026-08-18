"use client";

import {
 useFormContext } from "react-hook-form";

import {
 FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
 Input } from "@/components/ui/input";

import type { StrategyFormValues } from "./schema";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FormLabel className="text-[11px] text-muted-foreground">{label}</FormLabel>
      {children}
    </div>
  );
}

export function RiskConfig() {
  const form = useFormContext<StrategyFormValues>();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FormField
        control={form.control}
        name="risk.stopLoss"
        render={({ field }) => (
          <FormItem>
            <Row label="Stop loss">
              <FormControl>
                <Input {...field} className="num h-8 text-xs" placeholder="1.2% fixed" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk.target"
        render={({ field }) => (
          <FormItem>
            <Row label="Target">
              <FormControl>
                <Input {...field} className="num h-8 text-xs" placeholder="2.4%" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk.trailingStop"
        render={({ field }) => (
          <FormItem>
            <Row label="Trailing SL step (%)">
              <FormControl>
                <Input {...field} className="num h-8 text-xs" placeholder="0.4" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk.maxTradesDay"
        render={({ field }) => (
          <FormItem>
            <Row label="Max trades / day">
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="num h-8 text-xs"
                />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk.maxLossDay"
        render={({ field }) => (
          <FormItem>
            <Row label="Max loss / day (₹)">
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="num h-8 text-xs"
                />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk.cooldown"
        render={({ field }) => (
          <FormItem>
            <Row label="Cooldown after loss (min)">
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="num h-8 text-xs"
                />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />
    </div>
  );
}
