"use client";

import { useEffect, useMemo, useState } from "react";
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

type LineStyle = {
  color: string;
  width: number;
  dash: string; // "" means solid
};

type TargetRange = {
  id: string;
  start: string;
  end: string;
  pipesPerDay: number;
};

type ChartEditorSettings = {
  title: string;
  pipe: LineStyle;
  backfill: LineStyle;
  target: LineStyle;
  targetRanges?: TargetRange[];
};

const SETTINGS_KEY = "monthlyProgressChart.settings.v1";

function safeParseSettings(raw: string | null): ChartEditorSettings | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ChartEditorSettings>;
    if (!v || typeof v !== "object") return null;
    if (typeof v.title !== "string") return null;
    const hasLine = (x: unknown): x is LineStyle =>
      !!x &&
      typeof x === "object" &&
      typeof (x as LineStyle).color === "string" &&
      typeof (x as LineStyle).width === "number" &&
      typeof (x as LineStyle).dash === "string";
    if (!hasLine(v.pipe) || !hasLine(v.backfill) || !hasLine(v.target)) return null;
    return {
      title: v.title,
      pipe: v.pipe,
      backfill: v.backfill,
      target: v.target,
      targetRanges: Array.isArray(v.targetRanges)
        ? v.targetRanges
            .filter(
              (r): r is TargetRange =>
                !!r &&
                typeof r === "object" &&
                typeof (r as TargetRange).id === "string" &&
                typeof (r as TargetRange).start === "string" &&
                typeof (r as TargetRange).end === "string" &&
                typeof (r as TargetRange).pipesPerDay === "number"
            )
            .map((r) => ({
              id: r.id,
              start: r.start,
              end: r.end,
              pipesPerDay: r.pipesPerDay,
            }))
        : [],
    };
  } catch {
    return null;
  }
}

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
  const [editorOpen, setEditorOpen] = useState(false);

  const [settings, setSettings] = useState<ChartEditorSettings>(() => ({
    title: "Daily progress — current month",
    pipe: { color: tokens.charts.pipeLaid, width: chartLineVisual.strokeWidth, dash: "" },
    backfill: { color: tokens.charts.backfill, width: chartLineVisual.strokeWidth, dash: "" },
    target: { color: tokens.text.muted, width: chartLineVisual.targetStrokeWidth, dash: "4 4" },
    targetRanges: [],
  }));

  useEffect(() => {
    const parsed = safeParseSettings(
      typeof window !== "undefined" ? window.localStorage.getItem(SETTINGS_KEY) : null
    );
    if (!parsed) return;
    setSettings(parsed);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage failures
    }
  }, [settings]);

  const chartData = useMemo(() => {
    // Build daily target first, then aggregate to weeks if needed.
    let targetCum = 0;
    const daily = data.map((d) => {
      const rangeMatch = (settings.targetRanges ?? []).find(
        (r) => r.start && r.end && d.date >= r.start && d.date <= r.end
      );
      const activeTargetPipes = rangeMatch ? rangeMatch.pipesPerDay : pipesPerDay;
      const targetMeters = activeTargetPipes * PIPE_LENGTH_M;
      targetCum += targetMeters;
      return {
        ...d,
        pipeTargetCumulative: targetCum,
        pipePipesPerDay: d.pipeMetres / PIPE_LENGTH_M,
      };
    });

    if (viewMode !== "weeks" || daily.length === 0) return daily;

    const byWeek = new Map<number, { pipe: number; backfill: number }>();
    for (const d of daily) {
      const w = weekOfMonth(d.date);
      const cur = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
      byWeek.set(w, {
        pipe: cur.pipe + d.pipeMetres,
        backfill: cur.backfill + d.backfillMetres,
      });
    }

    // Simpler and stable: weekly target = sum of daily target increments.
    const targetByWeek = new Map<number, number>();
    for (const d of daily) {
      const w = weekOfMonth(d.date);
      const prev = targetByWeek.get(w) ?? 0;
      const rangeMatch = (settings.targetRanges ?? []).find(
        (r) => r.start && r.end && d.date >= r.start && d.date <= r.end
      );
      const activeTargetPipes = rangeMatch ? rangeMatch.pipesPerDay : pipesPerDay;
      targetByWeek.set(w, prev + activeTargetPipes * PIPE_LENGTH_M);
    }

    let pipeCum = 0;
    let backfillCum = 0;
    let targetWeekCum = 0;
    return Array.from({ length: 4 }, (_, i) => i + 1).map((w) => {
      const v = byWeek.get(w) ?? { pipe: 0, backfill: 0 };
      const targetWeek = targetByWeek.get(w) ?? 0;
      pipeCum += v.pipe;
      backfillCum += v.backfill;
      targetWeekCum += targetWeek;
      return {
        date: `W${w}`,
        label: `Week ${w}`,
        pipeMetres: v.pipe,
        backfillMetres: v.backfill,
        pipeMetresCumulative: pipeCum,
        backfillMetresCumulative: backfillCum,
        pipeTargetCumulative: targetWeekCum,
        pipePipesPerDay: v.pipe / PIPE_LENGTH_M,
      };
    });
  }, [data, pipesPerDay, settings.targetRanges, viewMode]);
  const toggle = (key: keyof typeof visible) => () =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  const legendItems = useMemo(
    () => [
      { label: "Pipe laid", color: settings.pipe.color, active: visible.pipe, onClick: toggle("pipe") },
      { label: "Backfill", color: settings.backfill.color, active: visible.backfill, onClick: toggle("backfill") },
    ],
    [settings, visible]
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
            {settings.title || "Daily progress"}
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
      className="h-full flex flex-col overflow-visible"
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
            {settings.title || "Daily progress"}
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
          <button
            type="button"
            onClick={() => setEditorOpen((p) => !p)}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-zinc-600 hover:bg-muted"
            aria-label="Chart settings"
          >
            ⋮
          </button>
        </div>
        <div
          className="relative"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          {editorOpen && (
            <div
              className="absolute right-0 top-10 z-[9999] w-[520px] max-w-[min(90vw,520px)] rounded-lg border border-border bg-card p-3 shadow-lg"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label
                    className="mb-1 block text-[11px] font-medium text-zinc-600"
                    title="Edit the chart title shown in the card header."
                  >
                    Title
                  </label>
                  <input
                    className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
                    value={settings.title}
                    onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Daily progress — current month"
                    title="Edit the chart title shown in the card header."
                  />
                </div>
                <div className="col-span-2">
                  <label
                    className="mb-1 block text-[11px] font-medium text-zinc-600"
                    title="Set the daily target in number of pipes."
                  >
                    Default target (pipes / day)
                  </label>
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
                    className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                    title="Set the daily target in number of pipes."
                  />
                </div>
                <div className="col-span-2 rounded-md border border-border bg-white/70 p-2">
                  <div className="mb-2 text-[11px] font-medium text-zinc-700" title="Optional target schedule by date range.">
                    Target ranges (date-based)
                  </div>
                  <div className="space-y-2">
                    {(settings.targetRanges ?? []).map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          className="h-8 rounded-md border border-border bg-white px-2 text-xs"
                          value={r.start}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              targetRanges: (s.targetRanges ?? []).map((x) =>
                                x.id === r.id ? { ...x, start: e.target.value } : x
                              ),
                            }))
                          }
                          title="Range start date (inclusive)."
                        />
                        <input
                          type="date"
                          className="h-8 rounded-md border border-border bg-white px-2 text-xs"
                          value={r.end}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              targetRanges: (s.targetRanges ?? []).map((x) =>
                                x.id === r.id ? { ...x, end: e.target.value } : x
                              ),
                            }))
                          }
                          title="Range end date (inclusive)."
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          className="h-8 w-24 rounded-md border border-border bg-white px-2 text-xs"
                          value={r.pipesPerDay}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              targetRanges: (s.targetRanges ?? []).map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      pipesPerDay: Math.max(0, Number(e.target.value) || 0),
                                    }
                                  : x
                              ),
                            }))
                          }
                          title="Target pipes per day for this range."
                        />
                        <button
                          type="button"
                          className="h-8 rounded-md border border-border bg-card px-2 text-xs text-zinc-700 hover:bg-muted"
                          onClick={() =>
                            setSettings((s) => ({
                              ...s,
                              targetRanges: (s.targetRanges ?? []).filter((x) => x.id !== r.id),
                            }))
                          }
                          title="Remove this target range."
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-zinc-700 hover:bg-muted"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          targetRanges: [
                            ...(s.targetRanges ?? []),
                            {
                              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              start: data[0]?.date ?? "",
                              end: data[data.length - 1]?.date ?? "",
                              pipesPerDay,
                            },
                          ],
                        }))
                      }
                      title="Add a date range with custom target."
                    >
                      + Add range
                    </button>
                  </div>
                </div>

                {([
                  ["Pipe laid", "pipe"] as const,
                  ["Backfill", "backfill"] as const,
                  ["Target", "target"] as const,
                ]).map(([label, key]) => (
                  <div key={key} className="col-span-2">
                    <div className="mb-1 text-[11px] font-medium text-zinc-600">
                      {label}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        value={settings[key].color}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [key]: { ...s[key], color: e.target.value },
                          }))
                        }
                        className="h-8 w-10 rounded-md border border-border bg-white p-1"
                        aria-label={`${label} color`}
                        title={`Change ${label} line color.`}
                      />
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={settings[key].width}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [key]: {
                              ...s[key],
                              width: Math.max(1, Number(e.target.value) || 1),
                            },
                          }))
                        }
                        className="h-8 w-20 rounded-md border border-border bg-white px-2 text-sm"
                        aria-label={`${label} stroke width`}
                        title={`Change ${label} line thickness.`}
                      />
                      <input
                        value={settings[key].dash}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [key]: { ...s[key], dash: e.target.value },
                          }))
                        }
                        className="h-8 w-44 rounded-md border border-border bg-white px-2 text-sm"
                        aria-label={`${label} dash pattern`}
                        placeholder='Dash (e.g. "4 4")'
                        title={`Change ${label} line dash pattern (empty means solid).`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            [key]:
                              key === "pipe"
                                ? { color: tokens.charts.pipeLaid, width: chartLineVisual.strokeWidth, dash: "" }
                                : key === "backfill"
                                  ? { color: tokens.charts.backfill, width: chartLineVisual.strokeWidth, dash: "" }
                                  : { color: tokens.text.muted, width: chartLineVisual.targetStrokeWidth, dash: "4 4" },
                          }))
                        }
                        className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-zinc-700 hover:bg-muted"
                        title={`Reset ${label} style to default.`}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            stroke={settings.target.color}
            strokeWidth={settings.target.width}
                strokeOpacity={chartLineVisual.projectionStrokeOpacity}
            strokeDasharray={settings.target.dash || undefined}
                dot={false}
                name={`Target (at ${pipesPerDay} pipes/day)`}
              />
              {visible.pipe && (
                <>
                  <Line
                    type="monotone"
                    dataKey="pipeMetresCumulative"
                stroke={settings.pipe.color}
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
                stroke={settings.pipe.color}
                strokeWidth={settings.pipe.width}
                    strokeOpacity={chartLineVisual.strokeOpacity}
                strokeDasharray={settings.pipe.dash || undefined}
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
                stroke={settings.backfill.color}
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
                stroke={settings.backfill.color}
                strokeWidth={settings.backfill.width}
                    strokeOpacity={chartLineVisual.strokeOpacity}
                strokeDasharray={settings.backfill.dash || undefined}
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
