"use client";

import {
 useFormContext } from "react-hook-form";

import {
 Checkbox } from "@/components/ui/checkbox";
import {
 FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
 Input } from "@/components/ui/input";

import {
 WEEKDAYS } from "./constants";
import type { StrategyFormValues } from "./schema";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FormLabel className="text-[11px] text-muted-foreground">{label}</FormLabel>
      {children}
    </div>
  );
}

export function ScheduleConfig() {
  const form = useFormContext<StrategyFormValues>();

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="schedule.from"
        render={({ field }) => (
          <FormItem>
            <Row label="Start">
              <FormControl>
                <Input type="time" {...field} className="num h-8 text-xs" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="schedule.to"
        render={({ field }) => (
          <FormItem>
            <Row label="Stop">
              <FormControl>
                <Input type="time" {...field} className="num h-8 text-xs" />
              </FormControl>
            </Row>
          </FormItem>
        )}
      />

      <div className="col-span-2">
        <FormField
          control={form.control}
          name="schedule.days"
          render={({ field }) => (
            <FormItem>
              <Row label="Trading days">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const checked = field.value?.includes(day);
                    return (
                      <label
                        key={day}
                        className="flex cursor-pointer items-center gap-2 rounded border border-border bg-surface-2 px-2 py-1 text-[11px]"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (v) {
                              field.onChange([...(field.value ?? []), day]);
                            } else {
                              field.onChange((field.value ?? []).filter((d) => d !== day));
                            }
                          }}
                          className="size-3.5"
                        />
                        {day}
                      </label>
                    );
                  })}
                </div>
              </Row>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
