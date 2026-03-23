"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
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

type UnifiedHistoricTrendProps = {
  pipesData: DayValue[];
  backfillData: DayValue[];
};

function mergeData(pipes: DayValue[], backfill: DayValue[]) {
  const dayMap = new Map<string, { pipes: number; backfill: number }>();
  for (const d of pipes) dayMap.set(d.day, { pipes: d.value, backfill: 0 });
  for (const d of backfill) {
    const cur = dayMap.get(d.day) ?? { pipes: 0, backfill: 0 };
    cur.backfill = d.value;
    dayMap.set(d.day, cur);
  }
  return pipes.length > 0
    ? pipes.map((p) => ({
        day: p.day,
        pipes: dayMap.get(p.day)?.pipes ?? 0,
        backfill: dayMap.get(p.day)?.backfill ?? 0,
      }))
    : Array.from(dayMap.entries()).map(([day, v]) => ({
        day,
        pipes: v.pipes,
        backfill: v.backfill,
      }));
}

export function UnifiedHistoricTrend({
  pipesData,
  backfillData,
}: UnifiedHistoricTrendProps) {
  const combined = mergeData(pipesData, backfillData);

  if (combined.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e] p-6">
        <p className="text-sm text-[#999]">No historic data</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e]">
      <div className="h-0.5 w-full rounded-t bg-gradient-to-r from-[#C9783A] to-[#6F8798]" />
      <div className="p-4">
        <span className="text-xs font-medium tracking-wide text-[#999]">
          Five-day historic trend — pipes & backfill
        </span>
        <div className="mt-3 h-48 min-h-[12rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={combined}
              margin={{ top: 4, right: 40, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e1e"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#999", fontSize: 10, fontFamily: MANROPE_STACK }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#999", fontSize: 10, fontFamily: MANROPE_STACK }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#999", fontSize: 10, fontFamily: MANROPE_STACK }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "#1e1e1e", strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipes"
                stroke={tokens.charts.pipeLaid}
                strokeWidth={chartLineVisual.glowStrokeWidth}
                strokeOpacity={chartLineVisual.glowStrokeOpacity}
                dot={false}
                activeDot={false}
                name={CHART_GLOW_LINE_NAME}
                legendType="none"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipes"
                stroke={tokens.charts.pipeLaid}
                strokeWidth={chartLineVisual.strokeWidth}
                strokeOpacity={chartLineVisual.strokeOpacity}
                dot={chartSeriesDot(tokens.charts.pipeLaid)}
                activeDot={chartSeriesActiveDot(tokens.charts.pipeLaid)}
                name="Pipes"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={tokens.charts.backfill}
                strokeWidth={chartLineVisual.glowStrokeWidth}
                strokeOpacity={chartLineVisual.glowStrokeOpacity}
                dot={false}
                activeDot={false}
                name={CHART_GLOW_LINE_NAME}
                legendType="none"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={tokens.charts.backfill}
                strokeWidth={chartLineVisual.strokeWidth}
                strokeOpacity={chartLineVisual.strokeOpacity}
                dot={chartSeriesDot(tokens.charts.backfill)}
                activeDot={chartSeriesActiveDot(tokens.charts.backfill)}
                name="Backfill (m)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
