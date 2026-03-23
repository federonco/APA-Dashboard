"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { DayValue } from "@/lib/queries/daily";
import { tokens } from "@/lib/designTokens";
import { CustomTooltip } from "./CustomTooltip";
import { TARGET_PIPE_METERS_PER_DAY } from "@/lib/constants";
import { MANROPE_STACK } from "@/lib/fonts";
import {
  CHART_GLOW_LINE_NAME,
  chartLineVisual,
  chartSeriesActiveDot,
  chartSeriesDot,
} from "@/lib/chartVisual";

type Props = {
  pipeData: DayValue[];
  backfillData: DayValue[];
  targetMetresPerDay?: number;
};

export function PipeBackfillTrendCard({
  pipeData,
  backfillData,
  targetMetresPerDay = TARGET_PIPE_METERS_PER_DAY,
}: Props) {
  const merged = pipeData.map((p, i) => ({
    day: p.day,
    pipes: p.value,
    backfill: backfillData[i]?.value ?? 0,
  }));

  return (
    <div
      style={{
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
        borderRadius: "0.75rem",
        padding: "1.25rem",
        marginTop: tokens.spacing.gap,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
        <span
          style={{
            fontFamily: MANROPE_STACK,
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: tokens.text.muted,
          }}
        >
          Five-day historic trend — metres per day
        </span>
      </div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={tokens.theme.border}
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{
                fill: tokens.text.muted,
                fontSize: 10,
                fontFamily: MANROPE_STACK,
              }}
              axisLine={{ stroke: tokens.theme.border }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: tokens.text.muted,
                fontSize: 10,
                fontFamily: MANROPE_STACK,
              }}
              axisLine={false}
              tickLine={false}
              unit=" m"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: tokens.theme.border, strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{
                fontFamily: MANROPE_STACK,
                fontSize: "0.65rem",
              }}
              formatter={(value: string) =>
                value === "pipes" ? "Pipe Laid" : "Backfill"
              }
            />
            <ReferenceLine
              y={targetMetresPerDay}
              stroke={tokens.text.muted}
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: `Target ${targetMetresPerDay} m/day`,
                position: "right",
                fill: tokens.text.muted,
                fontSize: 9,
                fontFamily: MANROPE_STACK,
              }}
            />
            <Line
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
              type="monotone"
              dataKey="pipes"
              stroke={tokens.charts.pipeLaid}
              strokeWidth={chartLineVisual.strokeWidth}
              strokeOpacity={chartLineVisual.strokeOpacity}
              dot={chartSeriesDot(tokens.charts.pipeLaid)}
              activeDot={chartSeriesActiveDot(tokens.charts.pipeLaid)}
              name="Pipe laid"
            />
            <Line
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
              type="monotone"
              dataKey="backfill"
              stroke={tokens.charts.backfill}
              strokeWidth={chartLineVisual.strokeWidth}
              strokeOpacity={chartLineVisual.strokeOpacity}
              dot={chartSeriesDot(tokens.charts.backfill)}
              activeDot={chartSeriesActiveDot(tokens.charts.backfill)}
              name="Backfill"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
