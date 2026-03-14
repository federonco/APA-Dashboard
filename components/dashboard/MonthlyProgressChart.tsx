"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import type { MonthlyDayValue } from "@/lib/queries/daily";

const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

type Props = {
  data: MonthlyDayValue[];
  historicData?: MonthlyDayValue[];
};

export function MonthlyProgressChart({ data, historicData = [] }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "historic">("current");
  const [visible, setVisible] = useState({ pipe: true, backfill: true });

  const chartData = viewMode === "historic" && historicData.length > 0 ? historicData : data;
  const toggle = (key: keyof typeof visible) => () =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  const legendItems = useMemo(
    () => [
      { label: "PIPE LAID", color: PIPE_COLOR, active: visible.pipe, onClick: toggle("pipe") },
      { label: "BACKFILL", color: BACKFILL_COLOR, active: visible.backfill, onClick: toggle("backfill") },
    ],
    [visible]
  );
  if (!chartData || chartData.length === 0) {
    return (
      <Card
        style={{
          background: "#FCFBFB",
          border: "1px solid #E8E6EB",
          borderRadius: "0.75rem",
          padding: "1.25rem",
        }}
      >
        <CardHeader style={{ padding: 0, marginBottom: 12 }}>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#71717a",
              letterSpacing: "0.02em",
            }}
          >
            DAILY PROGRESS — {viewMode === "historic" ? "HISTORIC (6M)" : "CURRENT MONTH"}
          </span>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <div
            style={{
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tokens.text.muted,
              fontSize: "0.8rem",
            }}
          >
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const last = chartData[chartData.length - 1];
  const pipeM = last?.pipeMetresCumulative ?? 0;
  const backfillM = last?.backfillMetresCumulative ?? 0;

  return (
    <Card
      className="h-full flex flex-col"
      style={{
        background: "#FCFBFB",
        border: "1px solid #E8E6EB",
        borderRadius: "0.75rem",
        padding: "1.25rem",
      }}
    >
      <CardHeader
        style={{
          padding: 0,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#71717a",
              letterSpacing: "0.02em",
            }}
          >
            DAILY PROGRESS — {viewMode === "historic" ? "HISTORIC (6M)" : "CURRENT MONTH"}
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
        <span
          style={{
            borderRadius: tokens.radius.badge,
            background: tokens.theme.border,
            padding: "4px 8px",
            fontSize: tokens.typography.body,
            fontWeight: 600,
            color: tokens.text.primary,
          }}
        >
          Pipe {pipeM} m · Backfill {backfillM} m
        </span>
      </CardHeader>
      <CardContent style={{ padding: 0 }}>
        <div style={{ minHeight: 200, width: "100%" }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.theme.border} vertical={false} />
              <XAxis
                dataKey="label"
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
              <Tooltip content={<CustomTooltip />} />
              {visible.pipe && (
                <Line
                  type="monotone"
                  dataKey="pipeMetresCumulative"
                  stroke={PIPE_COLOR}
                  strokeWidth={2}
                  dot={{ fill: PIPE_COLOR, r: 3 }}
                  name="PIPE LAID"
                />
              )}
              {visible.backfill && (
                <Line
                  type="monotone"
                  dataKey="backfillMetresCumulative"
                  stroke={BACKFILL_COLOR}
                  strokeWidth={2}
                  dot={{ fill: BACKFILL_COLOR, r: 3 }}
                  name="BACKFILL"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 12 }}>
          <ChartLegend items={legendItems} />
        </div>
      </CardContent>
    </Card>
  );
}
