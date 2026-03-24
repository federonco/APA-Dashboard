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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartLegend } from "./ChartLegend";
import { CustomTooltip } from "./CustomTooltip";
import type { ChainageProgressValue } from "@/lib/queries/daily";
import { MANROPE_STACK } from "@/lib/fonts";
import {
  CHART_GLOW_LINE_NAME,
  chartLineVisual,
  chartSeriesActiveDot,
  chartSeriesDot,
} from "@/lib/chartVisual";

function weekOfMonth(dateStr: string): number {
  const d = parseInt(dateStr.slice(8, 10), 10);
  return Math.ceil(d / 7);
}

function aggregateChainageByWeek(days: ChainageProgressValue[]): ChainageProgressValue[] {
  const byWeek = new Map<number, { pipe: number; backfill: number }>();
  for (const d of days) {
    const w = weekOfMonth(d.date);
    const cur = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
    byWeek.set(w, {
      pipe: cur.pipe + d.pipeChainage,
      backfill: cur.backfill + d.backfillChainage,
    });
  }
  return Array.from({ length: 4 }, (_, i) => i + 1).map((w) => {
    const v = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
    return {
      date: `W${w}`,
      label: `Week ${w}`,
      pipeChainage: v.pipe,
      backfillChainage: v.backfill,
    };
  });
}

type Props = {
  data: ChainageProgressValue[];
  historicData?: ChainageProgressValue[];
};

export function ChainageProgressChart({ data, historicData = [] }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "weeks">("current");
  const [visible, setVisible] = useState({ pipe: true, backfill: true });

  const chartData =
    viewMode === "weeks" && data.length > 0 ? aggregateChainageByWeek(data) : data;
  const toggle = (key: keyof typeof visible) => () =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  const legendItems = useMemo(
    () => [
      { label: "Pipe chainage", color: tokens.charts.pipeLaid, active: visible.pipe, onClick: toggle("pipe") },
      { label: "Backfill chainage", color: tokens.charts.backfill, active: visible.backfill, onClick: toggle("backfill") },
    ],
    [visible]
  );
  if (!chartData.length) {
    return (
      <div
        style={{
          background: tokens.theme.card,
          border: `1px solid ${tokens.theme.border}`,
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
              fontFamily: MANROPE_STACK,
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: "#6B7280",
            }}
          >
            Pipe vs backfill progress — {viewMode === "weeks" ? "weeks of the month" : "chainage"}
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
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
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
            fontFamily: MANROPE_STACK,
            fontSize: tokens.typography.subtitle,
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: "#6B7280",
          }}
        >
          Pipe vs backfill progress — {viewMode === "weeks" ? "weeks of the month" : "chainage"}
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
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECEAF1" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 10, fontFamily: MANROPE_STACK }}
              axisLine={{ stroke: tokens.theme.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 10, fontFamily: MANROPE_STACK }}
              axisLine={false}
              tickLine={false}
              unit=" m"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: tokens.theme.border, strokeWidth: 1 }}
            />
            {visible.pipe && (
              <>
                <Line
                  type="monotone"
                  dataKey="pipeChainage"
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
                  dataKey="pipeChainage"
                  stroke={tokens.charts.pipeLaid}
                  strokeWidth={chartLineVisual.strokeWidth}
                  strokeOpacity={chartLineVisual.strokeOpacity}
                  dot={chartSeriesDot(tokens.charts.pipeLaid)}
                  activeDot={chartSeriesActiveDot(tokens.charts.pipeLaid)}
                  name="Pipe Chainage"
                />
              </>
            )}
            {visible.backfill && (
              <>
                <Line
                  type="monotone"
                  dataKey="backfillChainage"
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
                  dataKey="backfillChainage"
                  stroke={tokens.charts.backfill}
                  strokeWidth={chartLineVisual.strokeWidth}
                  strokeOpacity={chartLineVisual.strokeOpacity}
                  dot={chartSeriesDot(tokens.charts.backfill)}
                  activeDot={chartSeriesActiveDot(tokens.charts.backfill)}
                  name="Backfill Chainage"
                />
              </>
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
