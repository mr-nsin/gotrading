"use client";

import { useFormContext } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SIZING_METHODS } from "./constants";
import type { StrategyFormValues } from "./schema";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FormLabel className="text-[11px] text-muted-foreground">{label}</FormLabel>
      {children}
    </div>
  );
}

export function SizingConfig() {
  const form = useFormContext<StrategyFormValues>();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FormField
        control={form.control}
        name="sizing.type"
        render={({ field }) => (
          <FormItem>
            <Row label="Sizing method">
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SIZING_METHODS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
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
        name="sizing.value"
        render={({ field }) => (
          <FormItem>
            <Row label="Size value">
              <FormControl>
                <Input {...field} className="num h-8 text-xs" placeholder="2 lots" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sizing.maxPerTrade"
        render={({ field }) => (
          <FormItem>
            <Row label="Max capital per trade (₹)">
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
