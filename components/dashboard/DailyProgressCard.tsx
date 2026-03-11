"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ActiveDotProps } from "recharts";

type ActiveLine = "pipes" | "pipeTarget" | "backfill" | "backfillTarget" | null;

function createActiveDot(lineKey: ActiveLine, onActive: (k: ActiveLine) => void) {
  return (props: ActiveDotProps) => {
    useEffect(() => {
      onActive(lineKey);
      return () => onActive(null);
    }, []);
    return (
      <circle
        cx={props.cx}
        cy={props.cy}
        r={5}
        fill={props.stroke}
        stroke="#999"
        strokeWidth={1.5}
      />
    );
  };
}
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import type { HourlyPipeProgress, HourlyBackfillProgress } from "@/lib/queries/daily";

const PIPE_TARGET = 18;
const BACKFILL_TARGET = 80;
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];
const PIPE_COLOR = "#f97316";
const BACKFILL_COLOR = "#38bdf8";

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
  const [activeLine, setActiveLine] = useState<ActiveLine>(null);
  const chartData = buildChartData(pipeData, backfillData, pipeTarget, backfillTarget);
  const last = chartData[chartData.length - 1];
  const pipesActual = last?.pipes ?? 0;
  const metresActual = last?.backfill ?? 0;

  const actualDotProps = { r: 3 };
  const targetDotProps = { r: 2 };
  const inactiveOpacity = 0.5;
  const targetLineOpacity = 0.55;
  const activeDotPipes = useMemo(() => createActiveDot("pipes", setActiveLine), []);
  const activeDotPipeTarget = useMemo(() => createActiveDot("pipeTarget", setActiveLine), []);
  const activeDotBackfill = useMemo(() => createActiveDot("backfill", setActiveLine), []);
  const activeDotBackfillTarget = useMemo(() => createActiveDot("backfillTarget", setActiveLine), []);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#f97316] bg-[#0e0e0e]">
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-3 flex flex-shrink-0 items-start justify-between">
          <span
            className="font-barlow font-medium text-[#999]"
            style={{ fontSize: "13px", letterSpacing: "0.02em" }}
          >
            DAILY PROGRESS — CUMULATIVE
          </span>
          <span
            className="rounded bg-[#1e1e1e] px-2 py-1 font-mono font-semibold text-white"
            style={{ fontSize: "16px", lineHeight: "1.2" }}
          >
            {pipesActual} pipes / {metresActual} m
          </span>
        </div>
        <div className="min-h-[12rem] flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e1e"
                strokeWidth={1}
                vertical={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1e1e1e", strokeWidth: 1 }} />
              <XAxis
                dataKey="shortHour"
                tick={{ fill: "#999", fontSize: 11, fontFamily: "var(--font-dm-mono), ui-monospace, monospace", fontWeight: 400 }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#999", fontSize: 11, fontFamily: "var(--font-dm-mono), ui-monospace, monospace", fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#999", fontSize: 11, fontFamily: "var(--font-dm-mono), ui-monospace, monospace", fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipes"
                stroke={PIPE_COLOR}
                strokeWidth={activeLine === "pipes" ? 3 : 2.5}
                strokeOpacity={activeLine && activeLine !== "pipes" ? inactiveOpacity : 1}
                dot={{ fill: PIPE_COLOR, ...actualDotProps }}
                activeDot={activeDotPipes}
                name="Pipe Laid"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipeTarget"
                stroke={PIPE_COLOR}
                strokeWidth={activeLine === "pipeTarget" ? 1.25 : 1}
                strokeOpacity={activeLine && activeLine !== "pipeTarget" ? inactiveOpacity * targetLineOpacity : targetLineOpacity}
                strokeDasharray="4 4"
                dot={{ fill: PIPE_COLOR, ...targetDotProps }}
                activeDot={activeDotPipeTarget}
                name="Pipe Target"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={BACKFILL_COLOR}
                strokeWidth={activeLine === "backfill" ? 3 : 2.5}
                strokeOpacity={activeLine && activeLine !== "backfill" ? inactiveOpacity : 1}
                dot={{ fill: BACKFILL_COLOR, ...actualDotProps }}
                activeDot={activeDotBackfill}
                name="Backfill"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfillTarget"
                stroke={BACKFILL_COLOR}
                strokeWidth={activeLine === "backfillTarget" ? 1.25 : 1}
                strokeOpacity={activeLine && activeLine !== "backfillTarget" ? inactiveOpacity * targetLineOpacity : targetLineOpacity}
                strokeDasharray="4 4"
                dot={{ fill: BACKFILL_COLOR, ...targetDotProps }}
                activeDot={activeDotBackfillTarget}
                name="Backfill Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-shrink-0">
          <ChartLegend
          items={[
            { label: "Pipe Laid", color: PIPE_COLOR },
            { label: "Pipe Target", color: PIPE_COLOR, dashed: true },
            { label: "Backfill", color: BACKFILL_COLOR },
            { label: "Backfill Target", color: BACKFILL_COLOR, dashed: true },
          ]}
        />
        </div>
      </div>
    </div>
  );
}
