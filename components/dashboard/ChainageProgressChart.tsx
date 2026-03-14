"use client";

import { useState, useMemo } from "react";
import { tokens } from "@/lib/designTokens";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartLegend } from "./ChartLegend";
import type { ChainageProgressValue } from "@/lib/queries/daily";

const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

type Props = {
  data: ChainageProgressValue[];
  historicData?: ChainageProgressValue[];
};

export function ChainageProgressChart({ data, historicData = [] }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "historic">("current");
  const [visible, setVisible] = useState({ pipe: true, backfill: true });

  const chartData = viewMode === "historic" && historicData.length > 0 ? historicData : data;
  const toggle = (key: keyof typeof visible) => () =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  const legendItems = useMemo(
    () => [
      { label: "PIPE CHAINAGE", color: PIPE_COLOR, active: visible.pipe, onClick: toggle("pipe") },
      { label: "BACKFILL CHAINAGE", color: BACKFILL_COLOR, active: visible.backfill, onClick: toggle("backfill") },
    ],
    [visible]
  );
  if (!chartData.length) {
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
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#6B7280",
            }}
          >
            PIPE vs BACKFILL PROGRESS — {viewMode === "historic" ? "HISTORIC (6M)" : "CHAINAGE"}
          </span>
          {historicData.length > 0 && (
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "current" | "historic")}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: "#E8E6EB", color: "#3f3f46" }}
            >
              <option value="current">Current month</option>
              <option value="historic">Historic (6 months)</option>
            </select>
          )}
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
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "1rem",
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#6B7280",
          }}
        >
          PIPE vs BACKFILL PROGRESS — {viewMode === "historic" ? "HISTORIC (6M)" : "CHAINAGE"}
        </span>
        {historicData.length > 0 && (
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "current" | "historic")}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "#E8E6EB", color: "#3f3f46" }}
          >
            <option value="current">Current month</option>
            <option value="historic">Historic (6 months)</option>
          </select>
        )}
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #E8E6EB",
                borderRadius: "0.5rem",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.75rem",
              }}
              formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(1)} Ch`]}
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as { date?: string })?.date ?? ""
              }
              labelStyle={{ fontWeight: 600 }}
            />
            {visible.pipe && (
              <Line
                type="monotone"
                dataKey="pipeChainage"
                stroke={PIPE_COLOR}
                strokeWidth={2}
                dot={{ fill: PIPE_COLOR, r: 3 }}
                name="Pipe Chainage"
              />
            )}
            {visible.backfill && (
              <Line
                type="monotone"
                dataKey="backfillChainage"
                stroke={BACKFILL_COLOR}
                strokeWidth={2}
                dot={{ fill: BACKFILL_COLOR, r: 3 }}
                name="Backfill Chainage"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12 }}>
        <ChartLegend items={legendItems} />
      </div>
    </div>
  );
}
