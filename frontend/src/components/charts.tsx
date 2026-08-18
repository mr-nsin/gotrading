"use client";

import {

  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
 useSettings } from "@/components/settings-provider";

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-popover px-2 py-1.5 text-[11px] shadow-lg">{children}</div>
  );
}

export function EquityChart({
  data,
  height = 240,
}: {
  data: Array<{ date: string; equity: number; pnl: number }>;
  height?: number;
}) {
  const { money } = useSettings();
  const positive = (data.at(-1)?.pnl ?? 0) >= 0;
  const color = positive ? "var(--profit)" : "var(--loss)";
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" {...axis} minTickGap={40} />
          <YAxis
            {...axis}
            width={58}
            tickFormatter={(v: number) => money(v, { decimals: 0, forceCompact: true })}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="num text-muted-foreground">{label}</div>
                  <div className="num font-semibold">{money(Number(payload[0]?.value ?? 0), { decimals: 0 })}</div>
                </TipBox>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={color}
            strokeWidth={1.8}
            fill="url(#eqGrad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PnlBarChart({
  data,
  xKey = "name",
  height = 240,
  vertical,
}: {
  data: Array<Record<string, unknown>>;
  xKey?: string;
  height?: number;
  vertical?: boolean;
}) {
  const { money } = useSettings();
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={vertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: vertical ? 8 : 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={!!vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" {...axis} tickFormatter={(v: number) => money(v, { decimals: 0, forceCompact: true })} />
              <YAxis type="category" dataKey={xKey} {...axis} width={150} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...axis} minTickGap={16} />
              <YAxis {...axis} width={58} tickFormatter={(v: number) => money(v, { decimals: 0, forceCompact: true })} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.35 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="num text-muted-foreground">{label}</div>
                  <div className="num font-semibold">{money(Number(payload[0]?.value ?? 0), { decimals: 0 })}</div>
                </TipBox>
              ) : null
            }
          />
          <Bar dataKey="pnl" radius={2} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={Number(d["pnl"]) >= 0 ? "var(--profit)" : "var(--loss)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 240,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}) {
  const { money } = useSettings();
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="56%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="var(--surface)"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="text-muted-foreground">{payload[0]?.name}</div>
                  <div className="num font-semibold">{money(Number(payload[0]?.value ?? 0), { decimals: 0 })}</div>
                </TipBox>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CandleChart({
  data,
  height = 280,
}: {
  data: Array<{ t: string; open: number; close: number; high: number; low: number; body: [number, number]; wick: [number, number]; up: boolean }>;
  height?: number;
}) {
  const lows = Math.min(...data.map((d) => d.low));
  const highs = Math.max(...data.map((d) => d.high));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={0}>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="t" {...axis} minTickGap={30} />
          <YAxis
            {...axis}
            width={62}
            domain={[Math.floor(lows - 20), Math.ceil(highs + 20)]}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return active && d ? (
                <TipBox>
                  <div className="num text-muted-foreground">{d.t}</div>
                  <div className="num grid grid-cols-2 gap-x-3">
                    <span>O {d.open.toFixed(2)}</span>
                    <span>H {d.high.toFixed(2)}</span>
                    <span>L {d.low.toFixed(2)}</span>
                    <span>C {d.close.toFixed(2)}</span>
                  </div>
                </TipBox>
              ) : null;
            }}
          />
          <Bar dataKey="wick" barSize={1.5} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.up ? "var(--profit)" : "var(--loss)"} />
            ))}
          </Bar>
          <Bar dataKey="body" barSize={7} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.up ? "var(--profit)" : "var(--loss)"} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniLineChart({
  data,
  dataKey = "value",
  height = 180,
  color = "var(--primary)",
}: {
  data: Array<Record<string, unknown>>;
  dataKey?: string;
  height?: number;
  color?: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" {...axis} minTickGap={30} />
          <YAxis {...axis} width={48} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="num text-muted-foreground">{label}</div>
                  <div className="num font-semibold">{Number(payload[0]?.value ?? 0).toFixed(2)}</div>
                </TipBox>
              ) : null
            }
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
