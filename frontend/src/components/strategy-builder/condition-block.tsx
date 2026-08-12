"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { OPERATORS } from "./constants";
import { IndicatorSelect } from "./indicator-select";
import type { RuleFormValues } from "./schema";

interface ConditionBlockProps {
  rule: RuleFormValues;
  onChange: (rule: RuleFormValues) => void;
  onDelete: () => void;
}

export function ConditionBlock({ rule, onChange, onDelete }: ConditionBlockProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-border bg-surface-2 p-1.5">
      <IndicatorSelect
        value={rule.indicator}
        onChange={(indicator) => onChange({ ...rule, indicator })}
      />
      <Select
        value={rule.operator}
        onValueChange={(operator) =>
          onChange({ ...rule, operator: operator as RuleFormValues["operator"] })
        }
      >
        <SelectTrigger className="h-7 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">
              {op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={rule.value}
        onChange={(e) => onChange({ ...rule, value: e.target.value })}
        className="num h-7 w-24 text-xs"
        placeholder="Value"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="ml-auto size-6 text-loss"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
