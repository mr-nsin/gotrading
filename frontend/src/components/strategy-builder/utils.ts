import type { Strategy } from "@/lib/api";

import { createRuleId } from "./constants";
import type { StrategyFormValues } from "./schema";

function parseInstruments(raw?: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  if (!raw) return ["NIFTY", "BANKNIFTY"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseScheduleDays(schedule?: Record<string, unknown>): StrategyFormValues["schedule"]["days"] {
  const days = schedule?.days;
  if (Array.isArray(days)) {
    return days.filter((d): d is StrategyFormValues["schedule"]["days"][number] =>
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(String(d)),
    );
  }
  if (typeof days === "string") {
    const map: Record<string, StrategyFormValues["schedule"]["days"][number]> = {
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
    };
    return days
      .split(/[,\s–-]+/)
      .map((d) => map[d.toLowerCase().slice(0, 3)])
      .filter(Boolean) as StrategyFormValues["schedule"]["days"];
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri"];
}

function parseSettingsOptions(strategy?: Strategy): StrategyFormValues["options"] {
  let settings: Record<string, unknown> = {};
  try {
    const raw = (strategy as Record<string, unknown> | undefined)?.settings_json;
    if (typeof raw === "string") settings = JSON.parse(raw);
    else if (raw && typeof raw === "object") settings = raw as Record<string, unknown>;
  } catch {
    settings = {};
  }
  const options = (settings.options ?? {}) as Record<string, string>;
  return {
    optionType: (options.optionType as StrategyFormValues["options"]["optionType"]) ?? "CE",
    strikeSelection: (options.strikeSelection as StrategyFormValues["options"]["strikeSelection"]) ?? "ATM",
    strikeOffset: options.strikeOffset ?? "+0",
    expiry: (options.expiry as StrategyFormValues["options"]["expiry"]) ?? "weekly",
  };
}

export function getDefaultFormValues(strategy?: Strategy): StrategyFormValues {
  const risk = (strategy?.risk ?? {}) as Record<string, unknown>;
  const sizing = (strategy?.sizing ?? {}) as Record<string, unknown>;
  const schedule = (strategy?.schedule ?? {}) as Record<string, unknown>;
  const instruments = strategy?.instruments?.length
    ? strategy.instruments.join(", ")
    : strategy?.instrument ?? "NIFTY, BANKNIFTY";

  return {
    name: strategy?.name ?? "",
    segment: (strategy?.segment as StrategyFormValues["segment"]) ?? "Options",
    description: strategy?.description ?? "",
    instruments,
    mode: (strategy?.mode as StrategyFormValues["mode"]) ?? "Paper",
    type: strategy?.type ?? "OPTIONS",
    instrument: strategy?.instrument ?? "NIFTY 50",
    capital_allocated: strategy?.capital_allocated ?? strategy?.capital ?? 100000,
    entryRules:
      strategy?.entryRules?.length
        ? strategy.entryRules.map((r) => ({
            id: r.id,
            indicator: r.indicator,
            operator: r.operator as StrategyFormValues["entryRules"][number]["operator"],
            value: r.value,
          }))
        : [],
    exitRules:
      strategy?.exitRules?.length
        ? strategy.exitRules.map((r) => ({
            id: r.id,
            indicator: r.indicator,
            operator: r.operator as StrategyFormValues["exitRules"][number]["operator"],
            value: r.value,
          }))
        : [],
    entryJoin: (strategy?.entryRules?.[0]?.join as "AND" | "OR") ?? "AND",
    exitJoin: (strategy?.exitRules?.[0]?.join as "AND" | "OR") ?? "OR",
    options: parseSettingsOptions(strategy),
    sizing: {
      type: (sizing.type as StrategyFormValues["sizing"]["type"]) ?? "Lot-based",
      value: String(sizing.value ?? sizing.lots ?? "2 lots"),
      maxPerTrade: Number(sizing.maxPerTrade ?? 200000),
    },
    risk: {
      stopLoss: String(risk.stopLoss ?? "1.2% fixed"),
      target: String(risk.target ?? "2.4%"),
      trailingStop: String(risk.trailingStop ?? risk.trailingSL ?? "0.4"),
      maxTradesDay: Number(risk.maxTradesDay ?? 6),
      maxLossDay: Number(risk.maxLossDay ?? 20000),
      cooldown: Number(risk.cooldown ?? 15),
    },
    schedule: {
      from: String(schedule.from ?? "09:20"),
      to: String(schedule.to ?? "15:15"),
      days: parseScheduleDays(schedule),
    },
    brokers: strategy?.brokers?.length ? strategy.brokers : ["zerodha"],
    webhook: strategy?.webhook ?? false,
  };
}

export function createEmptyRule(): StrategyFormValues["entryRules"][number] {
  return {
    id: createRuleId(),
    indicator: "RSI(14)",
    operator: "is above",
    value: "60",
  };
}

/** Map form values to backend API payload (snake_case fields). */
export function toApiPayload(values: StrategyFormValues) {
  const instrumentList = parseInstruments(values.instruments);
  const primaryInstrument = instrumentList[0] ?? values.instrument;

  return {
    name: values.name,
    type: values.type,
    instrument: primaryInstrument,
    capital_allocated: values.capital_allocated,
    segment: values.segment,
    description: values.description ?? "",
    mode: values.mode,
    instruments: instrumentList,
    brokers: values.brokers,
    entry_rules: values.entryRules.map((r) => ({
      id: r.id,
      indicator: r.indicator,
      operator: r.operator,
      value: r.value,
      join: values.entryJoin,
    })),
    exit_rules: values.exitRules.map((r) => ({
      id: r.id,
      indicator: r.indicator,
      operator: r.operator,
      value: r.value,
      join: values.exitJoin,
    })),
    risk: {
      stopLoss: values.risk.stopLoss,
      target: values.risk.target,
      trailingStop: values.risk.trailingStop,
      maxTradesDay: values.risk.maxTradesDay,
      maxLossDay: values.risk.maxLossDay,
      cooldown: values.risk.cooldown,
    },
    sizing: {
      type: values.sizing.type,
      value: values.sizing.value,
      maxPerTrade: values.sizing.maxPerTrade,
    },
    webhook_enabled: values.webhook,
    schedule_json: JSON.stringify({
      from: values.schedule.from,
      to: values.schedule.to,
      days: values.schedule.days,
    }),
    settings_json: JSON.stringify({
      options: values.segment === "Options" ? values.options : undefined,
    }),
  };
}
