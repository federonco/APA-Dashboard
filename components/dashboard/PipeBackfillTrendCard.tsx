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
import { TARGET_PIPE_METERS_PER_DAY } from "@/lib/constants";

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
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: tokens.text.muted,
          }}
        >
          5-Day Historic Trend — Metres / Day
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
                fontFamily: "'DM Mono', monospace",
              }}
              axisLine={{ stroke: tokens.theme.border }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: tokens.text.muted,
                fontSize: 10,
                fontFamily: "'DM Mono', monospace",
              }}
              axisLine={false}
              tickLine={false}
              unit=" m"
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.75rem",
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toFixed(1)} m`,
                name === "pipes" ? "Pipe Laid" : "Backfill",
              ]}
            />
            <Legend
              wrapperStyle={{
                fontFamily: "'DM Mono', monospace",
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
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="pipes"
              stroke={tokens.charts.pipeLaid}
              strokeWidth={2}
              dot={{ fill: tokens.charts.pipeLaid, r: 3 }}
              name="Pipe Laid"
            />
            <Line
              type="monotone"
              dataKey="backfill"
              stroke={tokens.charts.backfill}
              strokeWidth={2}
              dot={{ fill: tokens.charts.backfill, r: 3 }}
              name="Backfill"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
