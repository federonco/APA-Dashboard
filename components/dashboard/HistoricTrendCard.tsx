"use client";

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
import { MANROPE_STACK } from "@/lib/fonts";
import { tokens } from "@/lib/designTokens";
import {
  CHART_GLOW_LINE_NAME,
  chartLineVisual,
  chartSeriesActiveDot,
  chartSeriesDot,
} from "@/lib/chartVisual";

type HistoricTrendCardProps = {
  data: DayValue[];
  title: string;
  accentColor: string;
  unit: string;
  valueLabel: string;
};

export function HistoricTrendCard({
  data,
  title,
  accentColor,
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
    <div className="rounded-lg border border-border bg-[#FCFBFB]">
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
              data={data}
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
                tick={{ fill: "#6b7280", fontSize: 11, fontFamily: MANROPE_STACK, fontWeight: 400 }}
                axisLine={{ stroke: "#D6D4DC" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11, fontFamily: MANROPE_STACK, fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <ReferenceLine
                y={avg}
                stroke={tokens.text.muted}
                strokeDasharray="4 4"
                strokeWidth={chartLineVisual.targetStrokeWidth}
                strokeOpacity={chartLineVisual.projectionStrokeOpacity}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={chartLineVisual.glowStrokeWidth}
                strokeOpacity={chartLineVisual.glowStrokeOpacity}
                dot={false}
                activeDot={false}
                name={CHART_GLOW_LINE_NAME}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={chartLineVisual.strokeWidth}
                strokeOpacity={chartLineVisual.strokeOpacity}
                dot={chartSeriesDot(accentColor)}
                activeDot={chartSeriesActiveDot(accentColor)}
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
