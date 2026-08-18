import {
 z } from "zod";

import {

  EXPIRY_OPTIONS,
  MODES,
  OPERATORS,
  OPTION_TYPES,
  SEGMENTS,
  SIZING_METHODS,
  STRIKE_SELECTIONS,
  WEEKDAYS,
} from "./constants";

const ruleSchema = z.object({
  id: z.string(),
  indicator: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.string().min(1, "Value is required"),
});

const optionsSchema = z.object({
  optionType: z.enum(OPTION_TYPES),
  strikeSelection: z.enum(STRIKE_SELECTIONS),
  strikeOffset: z.string(),
  expiry: z.enum(EXPIRY_OPTIONS.map((o) => o.value) as [string, ...string[]]),
});

const sizingSchema = z.object({
  type: z.enum(SIZING_METHODS),
  value: z.string().min(1),
  maxPerTrade: z.coerce.number().min(0),
});

const riskSchema = z.object({
  stopLoss: z.string().min(1),
  target: z.string().min(1),
  trailingStop: z.string(),
  maxTradesDay: z.coerce.number().min(1),
  maxLossDay: z.coerce.number().min(0),
  cooldown: z.coerce.number().min(0),
});

const scheduleSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  days: z.array(z.enum(WEEKDAYS)).min(1, "Select at least one trading day"),
});

export const strategyFormSchema = z.object({
  name: z.string().min(1, "Strategy name is required"),
  segment: z.enum(SEGMENTS),
  description: z.string().optional(),
  instruments: z.string().min(1, "At least one instrument is required"),
  mode: z.enum(MODES),
  type: z.string(),
  instrument: z.string(),
  capital_allocated: z.coerce.number().min(10000, "Minimum capital is ₹10,000"),
  entryRules: z.array(ruleSchema),
  exitRules: z.array(ruleSchema),
  entryJoin: z.enum(["AND", "OR"]),
  exitJoin: z.enum(["AND", "OR"]),
  options: optionsSchema,
  sizing: sizingSchema,
  risk: riskSchema,
  schedule: scheduleSchema,
  brokers: z.array(z.string()).min(1, "Select at least one broker"),
  webhook: z.boolean(),
});

export type StrategyFormValues = z.infer<typeof strategyFormSchema>;
export type RuleFormValues = z.infer<typeof ruleSchema>;
