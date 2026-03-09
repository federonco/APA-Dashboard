"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendBadge, computeTrend } from "./TrendBadge";
import type { DayValue } from "@/lib/queries/daily";

type HistoricTrendCardProps = {
  data: DayValue[];
  title: string;
  accentColor: string;
  accentColorDark?: string;
  unit: string;
  valueLabel: string;
};

export function HistoricTrendCard({
  data,
  title,
  accentColor,
  accentColorDark,
  unit,
  valueLabel,
}: HistoricTrendCardProps) {
  const avg =
    data.length > 0
      ? Math.round(
          data.reduce((s, d) => s + d.value, 0) / data.length
        )
      : 0;
  const best = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;

  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const { trend, percentChange } = computeTrend(first, last);

  return (
    <div className="rounded border border-[#1e1e1e] bg-[#0e0e0e]">
      <div
        className="h-0.5 w-full rounded-t"
        style={{ backgroundColor: accentColor }}
      />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
            {title}
          </span>
          <TrendBadge trend={trend} percentChange={percentChange} />
        </div>
        <div className="h-36 min-h-[9rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e1e"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <ReferenceLine
                y={avg}
                stroke={accentColorDark ?? accentColor}
                strokeDasharray="4 2"
                strokeOpacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={2}
                dot={{ fill: accentColor, r: 3 }}
                name={valueLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Avg {avg} {unit}/day · Best {best} {unit}
        </p>
      </div>
    </div>
  );
}
