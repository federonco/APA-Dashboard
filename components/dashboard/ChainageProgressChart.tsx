"use client";

import { tokens } from "@/lib/designTokens";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChainageProgressValue } from "@/lib/queries/daily";

type Props = {
  data: ChainageProgressValue[];
};

export function ChainageProgressChart({ data }: Props) {
  if (!data.length) {
    return (
      <div
        style={{
          background: "#FCFBFB",
          border: "1px solid #E8E6EB",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginTop: tokens.spacing.gap,
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#6B7280",
            marginBottom: "1rem",
          }}
        >
          PIPE vs BACKFILL PROGRESS — CHAINAGE
        </div>
        <div
          style={{
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6B7280",
            fontSize: "0.8rem",
          }}
        >
          No data available
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FCFBFB",
        border: "1px solid #E8E6EB",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        marginTop: tokens.spacing.gap,
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#6B7280",
          marginBottom: "1rem",
        }}
      >
        PIPE vs BACKFILL PROGRESS — CHAINAGE
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEAF1" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "'DM Mono', monospace" }}
              axisLine={{ stroke: "#E8E6EB" }}
              tickLine={false}
            />
            <YAxis
              domain={["dataMax", "dataMin"]}
              reversed
              tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              unit=" Ch"
            />
            <Legend
              wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem" }}
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #E8E6EB",
                borderRadius: "0.5rem",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.75rem",
              }}
              formatter={(value: number) => [`${Number(value).toFixed(1)} Ch`]}
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as { date?: string })?.date ?? ""
              }
              labelStyle={{ fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="pipeChainage"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: "#f97316", r: 3 }}
              name="Pipe Chainage"
            />
            <Line
              type="monotone"
              dataKey="backfillChainage"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ fill: "#38bdf8", r: 3 }}
              name="Backfill Chainage"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
