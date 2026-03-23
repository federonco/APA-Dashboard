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
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import { tokens } from "@/lib/designTokens";
import { MANROPE_STACK } from "@/lib/fonts";
import type { HourlyPipeProgress, HourlyBackfillProgress } from "@/lib/queries/daily";
import {
  CHART_GLOW_LINE_NAME,
  chartLineVisual,
  chartSeriesDot,
  chartTargetDot,
} from "@/lib/chartVisual";

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
        r={chartLineVisual.activeDotRadius}
        fill={chartLineVisual.dotFill}
        stroke={props.stroke}
        strokeWidth={chartLineVisual.dotStrokeWidth}
      />
    );
  };
}

const PIPE_TARGET = 18;
const BACKFILL_TARGET = 80;
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];

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

  const inactiveOpacity = chartLineVisual.inactiveDim;
  const activeDotPipes = useMemo(() => createActiveDot("pipes", setActiveLine), []);
  const activeDotPipeTarget = useMemo(() => createActiveDot("pipeTarget", setActiveLine), []);
  const activeDotBackfill = useMemo(() => createActiveDot("backfill", setActiveLine), []);
  const activeDotBackfillTarget = useMemo(() => createActiveDot("backfillTarget", setActiveLine), []);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#C9783A] bg-[#0e0e0e]">
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-3 flex flex-shrink-0 items-start justify-between">
          <span
            className="font-medium text-[#999]"
            style={{ fontSize: tokens.typography.subtitle, letterSpacing: "0.02em" }}
          >
            Daily progress — cumulative
          </span>
          <span
            className="rounded bg-[#1e1e1e] px-2 py-1 font-semibold tabular-nums text-white"
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
                tick={{ fill: "#999", fontSize: 11, fontFamily: MANROPE_STACK, fontWeight: 400 }}
                axisLine={{ stroke: "#1e1e1e" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#999", fontSize: 11, fontFamily: MANROPE_STACK, fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#999", fontSize: 11, fontFamily: MANROPE_STACK, fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pipes"
                  stroke={tokens.charts.pipeLaid}
                  strokeWidth={chartLineVisual.glowStrokeWidth}
                  strokeOpacity={
                    !activeLine || activeLine === "pipes"
                      ? chartLineVisual.glowStrokeOpacity
                      : inactiveOpacity * chartLineVisual.glowStrokeOpacity
                  }
                  dot={false}
                  activeDot={false}
                  name={CHART_GLOW_LINE_NAME}
                  legendType="none"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pipes"
                  stroke={tokens.charts.pipeLaid}
                  strokeWidth={chartLineVisual.strokeWidth}
                  strokeOpacity={
                    !activeLine || activeLine === "pipes"
                      ? chartLineVisual.strokeOpacity
                      : inactiveOpacity * chartLineVisual.strokeOpacity
                  }
                  dot={chartSeriesDot(tokens.charts.pipeLaid)}
                  activeDot={activeDotPipes}
                  name="Pipe laid"
                />
              </>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipeTarget"
                stroke={tokens.charts.pipeTarget}
                strokeWidth={chartLineVisual.targetStrokeWidth}
                strokeOpacity={
                  !activeLine || activeLine === "pipeTarget"
                    ? chartLineVisual.targetStrokeOpacity
                    : inactiveOpacity * chartLineVisual.targetStrokeOpacity
                }
                strokeDasharray="4 4"
                dot={chartTargetDot(tokens.charts.pipeTarget)}
                activeDot={activeDotPipeTarget}
                name="Pipe Target"
              />
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="backfill"
                  stroke={tokens.charts.backfill}
                  strokeWidth={chartLineVisual.glowStrokeWidth}
                  strokeOpacity={
                    !activeLine || activeLine === "backfill"
                      ? chartLineVisual.glowStrokeOpacity
                      : inactiveOpacity * chartLineVisual.glowStrokeOpacity
                  }
                  dot={false}
                  activeDot={false}
                  name={CHART_GLOW_LINE_NAME}
                  legendType="none"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="backfill"
                  stroke={tokens.charts.backfill}
                  strokeWidth={chartLineVisual.strokeWidth}
                  strokeOpacity={
                    !activeLine || activeLine === "backfill"
                      ? chartLineVisual.strokeOpacity
                      : inactiveOpacity * chartLineVisual.strokeOpacity
                  }
                  dot={chartSeriesDot(tokens.charts.backfill)}
                  activeDot={activeDotBackfill}
                  name="Backfill"
                />
              </>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfillTarget"
                stroke={tokens.charts.backfillTarget}
                strokeWidth={chartLineVisual.targetStrokeWidth}
                strokeOpacity={
                  !activeLine || activeLine === "backfillTarget"
                    ? chartLineVisual.targetStrokeOpacity
                    : inactiveOpacity * chartLineVisual.targetStrokeOpacity
                }
                strokeDasharray="4 4"
                dot={chartTargetDot(tokens.charts.backfillTarget)}
                activeDot={activeDotBackfillTarget}
                name="Backfill target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-shrink-0">
          <ChartLegend
          items={[
            { label: "Pipe laid", color: tokens.charts.pipeLaid },
            { label: "Pipe target", color: tokens.charts.pipeTarget, dashed: true },
            { label: "Backfill", color: tokens.charts.backfill },
            { label: "Backfill target", color: tokens.charts.backfillTarget, dashed: true },
          ]}
        />
        </div>
      </div>
    </div>
  );
}
