"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { DayValue } from "@/lib/queries/daily";

const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

type UnifiedHistoricTrendProps = {
  pipesMetresData: DayValue[];
  backfillData: DayValue[];
};

export function UnifiedHistoricTrend({
  pipesMetresData,
  backfillData,
}: UnifiedHistoricTrendProps) {
  const dayMap = new Map<string, { pipesM: number; backfill: number }>();
  for (const d of pipesMetresData) {
    dayMap.set(d.day, { pipesM: d.value, backfill: 0 });
  }
  for (const d of backfillData) {
    const cur = dayMap.get(d.day) ?? { pipesM: 0, backfill: 0 };
    cur.backfill = d.value;
    dayMap.set(d.day, cur);
  }
  const combined =
    pipesMetresData.length > 0
      ? pipesMetresData.map((p) => ({
          day: p.day,
          pipesM: dayMap.get(p.day)?.pipesM ?? 0,
          backfill: dayMap.get(p.day)?.backfill ?? 0,
        }))
      : Array.from(dayMap.entries()).map(([day, v]) => ({
          day,
          pipesM: v.pipesM,
          backfill: v.backfill,
        }));

  if (combined.length === 0) {
    return (
      <div className="rounded border border-[#1e1e1e] bg-[#0e0e0e] p-6">
        <p className="font-mono text-sm text-zinc-500">No historic data</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-[#1e1e1e] bg-[#0e0e0e]">
      <div className="h-0.5 w-full rounded-t bg-gradient-to-r from-[#f97316] to-[#38bdf8]" />
      <div className="p-4">
        <span className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
          5-Day Historic Trend — Pipes (m) & Backfill
        </span>
        <div className="h-48 min-h-[12rem] w-full mt-3">
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
                tick={{
                  fill: "#71717a",
                  fontSize: 10,
                  fontFamily: "var(--font-dm-mono)",
                }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{
                  fill: "#71717a",
                  fontSize: 10,
                  fontFamily: "var(--font-dm-mono)",
                }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fill: "#71717a",
                  fontSize: 10,
                  fontFamily: "var(--font-dm-mono)",
                }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0e0e0e",
                  border: "1px solid #1e1e1e",
                }}
                labelStyle={{ color: "#71717a" }}
                formatter={(value, name) => [
                  value ?? 0,
                  name === "pipesM" ? "Pipes (m)" : "Backfill (m)",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) =>
                  value === "pipesM" ? "Pipes (m)" : "Backfill (m)"
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipesM"
                stroke={PIPE_COLOR}
                strokeWidth={2}
                dot={{ fill: PIPE_COLOR, r: 3 }}
                name="pipesM"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={BACKFILL_COLOR}
                strokeWidth={2}
                dot={{ fill: BACKFILL_COLOR, r: 3 }}
                name="backfill"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Left axis: Pipes (m) — CH current − CH initial / day · Right axis: Backfill (m)
        </p>
      </div>
    </div>
  );
}
