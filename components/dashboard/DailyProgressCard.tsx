"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartLegend } from "./ChartLegend";
import type { HourlyPipeProgress, HourlyBackfillProgress } from "@/lib/queries/daily";

const PIPE_TARGET = 18;
const BACKFILL_TARGET = 80;
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];
const PIPE_COLOR = "#f97316";
const PIPE_TARGET_COLOR = "#9a3412";
const BACKFILL_COLOR = "#38bdf8";
const BACKFILL_TARGET_COLOR = "#0e7490";

type DailyProgressCardProps = {
  pipeData: HourlyPipeProgress[];
  backfillData: HourlyBackfillProgress[];
  pipeTarget?: number;
  backfillTarget?: number;
};

function buildChartData(
  pipeData: HourlyPipeProgress[],
  backfillData: HourlyBackfillProgress[],
  pipeTarget: number,
  backfillTarget: number
) {
  const pipeMap = new Map(pipeData.map((d) => [d.hour, d.pipes]));
  const backfillMap = new Map(backfillData.map((d) => [d.hour, d.metres]));

  return HOURS.map((hour, i) => {
    const frac = i / (HOURS.length - 1);
    return {
      hour: `${hour}:00`,
      shortHour: hour,
      pipes: pipeMap.get(hour) ?? 0,
      pipeTarget: Math.round(frac * pipeTarget * 10) / 10,
      backfill: backfillMap.get(hour) ?? 0,
      backfillTarget: Math.round(frac * backfillTarget * 10) / 10,
    };
  });
}

export function DailyProgressCard({
  pipeData,
  backfillData,
  pipeTarget = PIPE_TARGET,
  backfillTarget = BACKFILL_TARGET,
}: DailyProgressCardProps) {
  const chartData = buildChartData(pipeData, backfillData, pipeTarget, backfillTarget);
  const last = chartData[chartData.length - 1];
  const pipesActual = last?.pipes ?? 0;
  const metresActual = last?.backfill ?? 0;

  return (
    <div className="rounded border border-[#1e1e1e] bg-[#0e0e0e]">
      <div
        className="h-0.5 w-full rounded-t"
        style={{ backgroundColor: PIPE_COLOR }}
      />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
            Daily Progress — Cumulative
          </span>
          <span className="rounded bg-zinc-800/80 px-2 py-1 font-mono text-xs text-zinc-300">
            {pipesActual} pipes / {metresActual} m
          </span>
        </div>
        <div className="h-48 min-h-[12rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e1e"
                vertical={false}
              />
              <XAxis
                dataKey="shortHour"
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipes"
                stroke={PIPE_COLOR}
                strokeWidth={2}
                dot={false}
                name="Pipe Laid"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipeTarget"
                stroke={PIPE_TARGET_COLOR}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Pipe Target"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={BACKFILL_COLOR}
                strokeWidth={2}
                dot={false}
                name="Backfill"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfillTarget"
                stroke={BACKFILL_TARGET_COLOR}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Backfill Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend
          items={[
            { label: "Pipe Laid", color: PIPE_COLOR },
            { label: "Pipe Target", color: PIPE_TARGET_COLOR, dashed: true },
            { label: "Backfill", color: BACKFILL_COLOR },
            { label: "Backfill Target", color: BACKFILL_TARGET_COLOR, dashed: true },
          ]}
        />
      </div>
    </div>
  );
}
