"use client";

import { Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";

import { ConditionBlock } from "./condition-block";
import type { StrategyFormValues } from "./schema";
import { createEmptyRule } from "./utils";

interface RuleBuilderProps {
  rulesField: "entryRules" | "exitRules";
  joinField: "entryJoin" | "exitJoin";
  label: string;
  defaultJoin?: "AND" | "OR";
}

export function RuleBuilder({ rulesField, joinField, label, defaultJoin = "AND" }: RuleBuilderProps) {
  const form = useFormContext<StrategyFormValues>();
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: rulesField,
  });

  const logic = form.watch(joinField) ?? defaultJoin;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <FormField
          control={form.control}
          name={joinField}
          render={({ field }) => (
            <FormItem>
              <div className="flex rounded border border-border p-0.5">
                {(["AND", "OR"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => field.onChange(l)}
                    className={`num rounded px-2 py-0.5 text-[10px] ${
                      field.value === l
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-6 gap-1 text-[11px]"
          onClick={() => append(createEmptyRule())}
        >
          <Plus className="size-3" /> Add condition
        </Button>
      </div>

      <div className="space-y-1.5">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-1.5">
            {index > 0 && <div className="num pl-2 text-[10px] text-primary">{logic}</div>}
            <ConditionBlock
              rule={form.watch(`${rulesField}.${index}`)}
              onChange={(rule) => update(index, rule)}
              onDelete={() => remove(index)}
            />
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No conditions yet.</p>
        )}
      </div>
      <FormField
        control={form.control}
        name={rulesField}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
