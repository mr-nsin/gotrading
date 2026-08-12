"use client";

import { useFormContext } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { EXPIRY_OPTIONS, OPTION_TYPES, STRIKE_SELECTIONS } from "./constants";
import type { StrategyFormValues } from "./schema";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FormLabel className="text-[11px] text-muted-foreground">{label}</FormLabel>
      {children}
    </div>
  );
}

export function OptionsConfig() {
  const form = useFormContext<StrategyFormValues>();

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <FormField
        control={form.control}
        name="options.optionType"
        render={({ field }) => (
          <FormItem>
            <Row label="Option type">
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OPTION_TYPES.map((o) => (
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
        name="options.strikeSelection"
        render={({ field }) => (
          <FormItem>
            <Row label="Strike selection">
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STRIKE_SELECTIONS.map((o) => (
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
        name="options.strikeOffset"
        render={({ field }) => (
          <FormItem>
            <Row label="Strike offset">
              <FormControl>
                <Input {...field} className="num h-8 text-xs" placeholder="+2" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="options.expiry"
        render={({ field }) => (
          <FormItem>
            <Row label="Expiry">
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </FormItem>
        )}
      />
    </div>
  );
}
