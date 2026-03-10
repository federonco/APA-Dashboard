"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendBadge, computeTrend } from "./TrendBadge";
import { CustomTooltip } from "./CustomTooltip";
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

  const chartData = useMemo(() =>
    data.map((d) => ({ ...d, _dotColor: "#5F5B66" })),
  [data]
);

  return (
    <div className="rounded-lg border border-[#EEECEF] bg-[#FCFBFB]">
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <span
            className="font-medium text-zinc-600"
            style={{ fontSize: "13px", letterSpacing: "0.02em" }}
          >
            {title}
          </span>
          <TrendBadge trend={trend} percentChange={percentChange} />
        </div>
        <div className="h-36 min-h-[9rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#ECEAF1"
                strokeWidth={1}
                vertical={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ECEAF1", strokeWidth: 1 }} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif", fontWeight: 400 }}
                axisLine={{ stroke: "#D6D4DC" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif", fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <ReferenceLine
                y={avg}
                stroke="#A6A1AF"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#5F5B66"
                strokeWidth={2}
                dot={(props) => {
                  const fill = (props.payload as Record<string, unknown>)?._dotColor as string ?? "#5F5B66";
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={fill}
                    />
                  );
                }}
                activeDot={(props) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill="#ffffff"
                      stroke="#5F5B66"
                      strokeWidth={1.5}
                    />
                  )}
                name={valueLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p
          className="mt-2 font-normal text-zinc-600"
          style={{ fontSize: "11px" }}
        >
          Avg {avg} {unit}/day · Best {best} {unit}
        </p>
      </div>
    </div>
  );
}
