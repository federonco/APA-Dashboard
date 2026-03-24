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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tokens } from "@/lib/designTokens";
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import type { MonthlyDayValue } from "@/lib/queries/daily";
import { PIPE_LENGTH_M } from "@/lib/constants";
import { MANROPE_STACK } from "@/lib/fonts";
import {
  CHART_GLOW_LINE_NAME,
  chartLineVisual,
  chartSeriesActiveDot,
  chartSeriesDot,
} from "@/lib/chartVisual";

type Props = {
  data: MonthlyDayValue[];
  historicData?: MonthlyDayValue[];
};

function weekOfMonth(dateStr: string): number {
  const d = parseInt(dateStr.slice(8, 10), 10);
  return Math.ceil(d / 7);
}

function aggregateByWeek(days: MonthlyDayValue[]): MonthlyDayValue[] {
  const byWeek = new Map<number, { pipe: number; backfill: number }>();
  for (const d of days) {
    const w = weekOfMonth(d.date);
    const cur = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
    byWeek.set(w, {
      pipe: cur.pipe + d.pipeMetres,
      backfill: cur.backfill + d.backfillMetres,
    });
  }
  let pipeCum = 0;
  let backfillCum = 0;
  return Array.from({ length: 4 }, (_, i) => i + 1).map((w) => {
    const v = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
    pipeCum += v.pipe;
    backfillCum += v.backfill;
    return {
      date: `W${w}`,
      label: `Week ${w}`,
      pipeMetres: v.pipe,
      backfillMetres: v.backfill,
      pipeMetresCumulative: pipeCum,
      backfillMetresCumulative: backfillCum,
    };
  });
}

export function MonthlyProgressChart({ data, historicData = [] }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "weeks">("current");
  const [pipesPerDay, setPipesPerDay] = useState<number>(1);
  const [visible, setVisible] = useState({ pipe: true, backfill: true });

  const baseData =
    viewMode === "weeks" && data.length > 0 ? aggregateByWeek(data) : data;
  const chartData = useMemo(
    () => {
      const isWeekly = viewMode === "weeks" && baseData.length <= 5;
      const targetPerDayMeters = pipesPerDay * PIPE_LENGTH_M;
      const targetPerPoint = isWeekly
        ? targetPerDayMeters * 5
        : targetPerDayMeters;
      return baseData.map((d, index) => ({
        ...d,
        pipeTargetCumulative: targetPerPoint * (index + 1),
        pipePipesPerDay: d.pipeMetres / PIPE_LENGTH_M,
      }));
    },
    [baseData, pipesPerDay, viewMode]
  );
  const toggle = (key: keyof typeof visible) => () =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  const legendItems = useMemo(
    () => [
      { label: "Pipe laid", color: tokens.charts.pipeLaid, active: visible.pipe, onClick: toggle("pipe") },
      { label: "Backfill", color: tokens.charts.backfill, active: visible.backfill, onClick: toggle("backfill") },
    ],
    [visible]
  );
  if (!chartData || chartData.length === 0) {
    return (
      <Card
        style={{
          background: tokens.theme.card,
          border: `1px solid ${tokens.theme.border}`,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.cardPadding,
        }}
      >
        <CardHeader style={{ padding: 0, marginBottom: 12 }}>
          <span
            style={{
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.02em",
            }}
          >
            Daily progress — {viewMode === "weeks" ? "weeks of the month" : "current month"}
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
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.02em",
            }}
          >
            Daily progress — {viewMode === "weeks" ? "weeks of the month" : "current month"}
          </span>
          {data.length > 0 && (
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "current" | "weeks")}
              items={{
                current: "Current month",
                weeks: "Weeks of the month",
              }}
            >
              <SelectTrigger className="h-8 min-w-[10.75rem] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current month</SelectItem>
                <SelectItem value="weeks">Weeks of the month</SelectItem>
              </SelectContent>
            </Select>
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
              fontFamily: MANROPE_STACK,
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
                fontFamily: MANROPE_STACK,
                textAlign: "right",
              }}
            />
            <span>pipes</span>
          </label>
        </div>
      </CardHeader>
      <CardContent
        style={{ padding: 0 }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="w-full min-h-0 flex-1" style={{ minHeight: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.theme.border} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{
                  fill: tokens.text.muted,
                  fontSize: 10,
                  fontFamily: MANROPE_STACK,
                }}
                axisLine={{ stroke: tokens.theme.border }}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: tokens.text.muted,
                  fontSize: 10,
                  fontFamily: MANROPE_STACK,
                }}
                axisLine={false}
                tickLine={false}
                unit=" m"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pipeTargetCumulative"
                stroke={tokens.text.muted}
                strokeWidth={chartLineVisual.targetStrokeWidth}
                strokeOpacity={chartLineVisual.projectionStrokeOpacity}
                strokeDasharray="4 4"
                dot={false}
                name={`Target (${pipesPerDay} pipes)`}
              />
              {visible.pipe && (
                <>
                  <Line
                    type="monotone"
                    dataKey="pipeMetresCumulative"
                    stroke={tokens.charts.pipeLaid}
                    strokeWidth={chartLineVisual.glowStrokeWidth}
                    strokeOpacity={chartLineVisual.glowStrokeOpacity}
                    dot={false}
                    activeDot={false}
                    name={CHART_GLOW_LINE_NAME}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="pipeMetresCumulative"
                    stroke={tokens.charts.pipeLaid}
                    strokeWidth={chartLineVisual.strokeWidth}
                    strokeOpacity={chartLineVisual.strokeOpacity}
                    dot={chartSeriesDot(tokens.charts.pipeLaid)}
                    activeDot={chartSeriesActiveDot(tokens.charts.pipeLaid)}
                    name="Pipe laid"
                  />
                </>
              )}
              {visible.backfill && (
                <>
                  <Line
                    type="monotone"
                    dataKey="backfillMetresCumulative"
                    stroke={tokens.charts.backfill}
                    strokeWidth={chartLineVisual.glowStrokeWidth}
                    strokeOpacity={chartLineVisual.glowStrokeOpacity}
                    dot={false}
                    activeDot={false}
                    name={CHART_GLOW_LINE_NAME}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="backfillMetresCumulative"
                    stroke={tokens.charts.backfill}
                    strokeWidth={chartLineVisual.strokeWidth}
                    strokeOpacity={chartLineVisual.strokeOpacity}
                    dot={chartSeriesDot(tokens.charts.backfill)}
                    activeDot={chartSeriesActiveDot(tokens.charts.backfill)}
                    name="Backfill"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="shrink-0 pt-3">
          <ChartLegend items={legendItems} className="pt-0" />
        </div>
      </CardContent>
    </Card>
  );
}
