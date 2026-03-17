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
import { PIPE_LENGTH_M } from "@/lib/constants";

const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

type Props = {
  data: MonthlyDayValue[];
  historicData?: MonthlyDayValue[];
};

export function MonthlyProgressChart({ data, historicData = [] }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "historic">("current");
  const [pipesPerDay, setPipesPerDay] = useState<number>(1);
  const [visible, setVisible] = useState({ pipe: true, backfill: true });

  const baseData = viewMode === "historic" && historicData.length > 0 ? historicData : data;
  const chartData = useMemo(
    () => {
      const targetPerDayMeters = pipesPerDay * PIPE_LENGTH_M;
      return baseData.map((d, index) => ({
        ...d,
        pipeTargetCumulative: targetPerDayMeters * (index + 1),
        pipePipesPerDay: d.pipeMetres / PIPE_LENGTH_M,
      }));
    },
    [baseData, pipesPerDay]
  );
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: tokens.text.secondary,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <span>Target:</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={pipesPerDay}
              onChange={(e) =>
                setPipesPerDay(() => {
                  const v = Number(e.target.value);
                  return Number.isFinite(v) && v >= 0 ? v : 0;
                })
              }
              style={{
                width: 52,
                padding: "2px 4px",
                borderRadius: 4,
                border: `1px solid ${tokens.theme.border}`,
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
                textAlign: "right",
              }}
            />
            <span>pipes</span>
          </label>
        </div>
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
              <Line
                type="monotone"
                dataKey="pipeTargetCumulative"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name={`TARGET (${pipesPerDay} pipes)`}
              />
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
