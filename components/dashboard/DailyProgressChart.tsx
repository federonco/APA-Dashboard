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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import type { HourlyPipeProgress, HourlyBackfillProgress } from "@/lib/queries/daily";

type ActiveLine = "pipes" | "pipeTarget" | "backfill" | "backfillTarget" | null;

const PIPE_TARGET = 18;
const BACKFILL_TARGET = 80;
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];

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
        stroke={tokens.text.muted}
        strokeWidth={1.5}
      />
    );
  };
}

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

type Props = {
  pipeData: HourlyPipeProgress[];
  backfillData: HourlyBackfillProgress[];
  pipeTarget?: number;
  backfillTarget?: number;
};

export function DailyProgressChart({
  pipeData,
  backfillData,
  pipeTarget = PIPE_TARGET,
  backfillTarget = BACKFILL_TARGET,
}: Props) {
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
  const activeDotBackfillTarget = useMemo(
    () => createActiveDot("backfillTarget", setActiveLine),
    []
  );

  return (
    <Card
      style={{
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.cardPadding,
      }}
    >
      <CardHeader
        style={{
          padding: 0,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.subtitle,
            fontWeight: 500,
            color: tokens.text.secondary,
            letterSpacing: "0.02em",
          }}
        >
          DAILY PROGRESS — CUMULATIVE
        </span>
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
          {pipesActual} pipes / {metresActual} m
        </span>
      </CardHeader>
      <CardContent style={{ padding: 0 }}>
        <div style={{ minHeight: 192, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={192}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={tokens.theme.border}
                strokeWidth={1}
                vertical={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: tokens.theme.border, strokeWidth: 1 }}
              />
              <XAxis
                dataKey="shortHour"
                tick={{
                  fill: tokens.text.muted,
                  fontSize: 11,
                  fontFamily: tokens.typography.fontFamily,
                }}
                axisLine={{ stroke: tokens.theme.border }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{
                  fill: tokens.text.muted,
                  fontSize: 11,
                  fontFamily: tokens.typography.fontFamily,
                }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fill: tokens.text.muted,
                  fontSize: 11,
                  fontFamily: tokens.typography.fontFamily,
                }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipes"
                stroke={tokens.charts.pipeLaid}
                strokeWidth={activeLine === "pipes" ? 3 : 2.5}
                strokeOpacity={activeLine && activeLine !== "pipes" ? inactiveOpacity : 1}
                dot={{ fill: tokens.charts.pipeLaid, ...actualDotProps }}
                activeDot={activeDotPipes}
                name="Pipe Laid"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pipeTarget"
                stroke={tokens.charts.pipeTarget}
                strokeWidth={activeLine === "pipeTarget" ? 1.25 : 1}
                strokeOpacity={
                  activeLine && activeLine !== "pipeTarget"
                    ? inactiveOpacity * targetLineOpacity
                    : targetLineOpacity
                }
                strokeDasharray="4 4"
                dot={{ fill: tokens.charts.pipeTarget, ...targetDotProps }}
                activeDot={activeDotPipeTarget}
                name="Pipe Target"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfill"
                stroke={tokens.charts.backfill}
                strokeWidth={activeLine === "backfill" ? 3 : 2.5}
                strokeOpacity={activeLine && activeLine !== "backfill" ? inactiveOpacity : 1}
                dot={{ fill: tokens.charts.backfill, ...actualDotProps }}
                activeDot={activeDotBackfill}
                name="Backfill"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="backfillTarget"
                stroke={tokens.charts.backfillTarget}
                strokeWidth={activeLine === "backfillTarget" ? 1.25 : 1}
                strokeOpacity={
                  activeLine && activeLine !== "backfillTarget"
                    ? inactiveOpacity * targetLineOpacity
                    : targetLineOpacity
                }
                strokeDasharray="4 4"
                dot={{ fill: tokens.charts.backfillTarget, ...targetDotProps }}
                activeDot={activeDotBackfillTarget}
                name="Backfill Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 12 }}>
          <ChartLegend
            items={[
              { label: "Pipe Laid", color: tokens.charts.pipeLaid },
              { label: "Pipe Target", color: tokens.charts.pipeTarget, dashed: true },
              { label: "Backfill", color: tokens.charts.backfill },
              { label: "Backfill Target", color: tokens.charts.backfillTarget, dashed: true },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
