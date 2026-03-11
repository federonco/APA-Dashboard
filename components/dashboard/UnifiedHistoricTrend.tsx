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

const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

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
        <p className="font-mono text-sm text-[#999]">No historic data</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e]">
      <div className="h-0.5 w-full rounded-t bg-gradient-to-r from-[#f97316] to-[#38bdf8]" />
      <div className="p-4">
        <span className="font-mono text-xs font-medium uppercase tracking-widest text-[#999]">
          5-Day Historic Trend — Pipes & Backfill
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
                tick={{ fill: "#999", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#999", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#999", fontSize: 10, fontFamily: "monospace" }}
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
                stroke={PIPE_COLOR}
                strokeWidth={2}
                dot={{ fill: PIPE_COLOR, r: 3 }}
                name="Pipes"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={BACKFILL_COLOR}
                strokeWidth={2}
                dot={{ fill: BACKFILL_COLOR, r: 3 }}
                name="Backfill (m)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
