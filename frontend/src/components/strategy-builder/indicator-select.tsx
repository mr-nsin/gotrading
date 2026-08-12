"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

import { INDICATORS } from "./constants";

interface IndicatorSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IndicatorSelect({ value, onChange, className }: IndicatorSelectProps) {
  const categories = [...new Set(INDICATORS.map((i) => i.category))];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "h-7 w-[190px] text-xs"}>
        <SelectValue placeholder="Select indicator" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectGroup key={category}>
            <SelectLabel className="text-[10px] uppercase tracking-wider">{category}</SelectLabel>
            {INDICATORS.filter((i) => i.category === category).map((indicator) => (
              <SelectItem key={indicator.value} value={indicator.value} className="text-xs">
                {indicator.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
