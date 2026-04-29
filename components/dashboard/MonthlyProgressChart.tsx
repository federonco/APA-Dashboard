"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  sectionSeries?: {
    id: string;
    name: string;
    data: MonthlyDayValue[];
    isComplete?: boolean;
    excludeFromSelector?: boolean;
    guideBased?: boolean;
    totalFittings?: number;
    startCh?: number;
    endCh?: number;
  }[];
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
  target: LineStyle;
  targetUnit: string;
  targetRanges?: TargetRange[];
};

const SETTINGS_KEY = "monthlyProgressChart.settings.v1";

const WA_PUBLIC_HOLIDAYS: Record<number, string[]> = {
  2025: ["2025-01-01", "2025-01-27", "2025-03-03", "2025-04-18", "2025-04-21", "2025-04-25", "2025-06-02", "2025-09-29", "2025-12-25", "2025-12-26"],
  2026: ["2026-01-01", "2026-01-26", "2026-03-02", "2026-04-03", "2026-04-06", "2026-04-27", "2026-06-01", "2026-09-28", "2026-12-25", "2026-12-28"],
  2027: ["2027-01-01", "2027-01-26", "2027-03-01", "2027-03-26", "2027-03-29", "2027-04-26", "2027-06-07", "2027-09-27", "2027-12-27", "2027-12-28"],
};

function isWaWorkingDay(dateStr: string): boolean {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return true;
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const holidayList = WA_PUBLIC_HOLIDAYS[d.getFullYear()] ?? [];
  return !holidayList.includes(dateStr);
}

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
    if (!hasLine(v.pipe) || !hasLine(v.target)) return null;
    return {
      title: v.title,
      pipe: v.pipe,
      target: v.target,
      targetUnit: typeof v.targetUnit === "string" && v.targetUnit.trim() ? v.targetUnit : "Pipe/Fitting",
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

export function MonthlyProgressChart({ data, historicData = [], sectionSeries = [] }: Props) {
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [targetMetersBySection, setTargetMetersBySection] = useState<Record<string, number>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const didDrag = useRef(false);
  const [edgeSpacer, setEdgeSpacer] = useState(0);

  const [settings, setSettings] = useState<ChartEditorSettings>(() => ({
    title: "Daily progress — current month",
    pipe: { color: "#f97316", width: chartLineVisual.strokeWidth, dash: "" },
    target: { color: tokens.text.muted, width: chartLineVisual.targetStrokeWidth, dash: "4 4" },
    targetUnit: "Pipe/Fitting",
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`${SETTINGS_KEY}.targetMetersBySection`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      if (!parsed || typeof parsed !== "object") return;
      setTargetMetersBySection(parsed);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${SETTINGS_KEY}.targetMetersBySection`,
        JSON.stringify(targetMetersBySection)
      );
    } catch {
      // ignore storage failures
    }
  }, [targetMetersBySection]);

  const selectedSourceData = useMemo(() => {
    const selected = sectionSeries.find((s) => s.id === sectionFilter);
    return selected?.data ?? [];
  }, [sectionFilter, sectionSeries]);
  const selectedSectionMeta = useMemo(
    () => sectionSeries.find((s) => s.id === sectionFilter),
    [sectionSeries, sectionFilter]
  );
  const visibleSections = useMemo(
    () =>
      sectionSeries
        .filter((s) => !s.isComplete && !s.excludeFromSelector)
        .map((s) => ({ id: s.id, name: s.name })),
    [sectionSeries]
  );

  useEffect(() => {
    const stillVisible = visibleSections.some((s) => s.id === sectionFilter);
    if (!stillVisible) setSectionFilter(visibleSections[0]?.id ?? "");
  }, [visibleSections, sectionFilter]);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    const walk = x - startX.current;
    if (Math.abs(walk) > 5) didDrag.current = true;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const onMouseLeave = () => {
    isDragging.current = false;
  };

  const centerSelectedSection = (sectionId: string) => {
    const container = scrollRef.current;
    if (!container || !sectionId) return;
    const pill = container.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
    if (!pill) return;
    const left = pill.offsetLeft - (container.clientWidth - pill.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  const recalcEdgeSpacer = () => {
    const container = scrollRef.current;
    if (!container) return;
    const pill = container.querySelector<HTMLElement>("[data-section-id]");
    if (!pill) return;
    const spacer = Math.max(0, (container.clientWidth - pill.clientWidth) / 2);
    setEdgeSpacer(spacer);
  };

  const scrollToSection = (direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const pillWidth = (el.firstElementChild as HTMLElement | null)?.clientWidth ?? 200;
    if (visibleSections.length > 0) {
      const foundIndex = visibleSections.findIndex((s) => s.id === sectionFilter);
      const currentIndex = foundIndex >= 0 ? foundIndex : 0;
      const targetIndex =
        direction === "next"
          ? (currentIndex + 1) % visibleSections.length
          : (currentIndex - 1 + visibleSections.length) % visibleSections.length;
      const nextId = visibleSections[targetIndex]?.id ?? sectionFilter;
      setSectionFilter(nextId);
      centerSelectedSection(nextId);
    }
    el.scrollBy({
      left: direction === "next" ? pillWidth + 12 : -(pillWidth + 12),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!sectionFilter) return;
    centerSelectedSection(sectionFilter);
  }, [sectionFilter]);

  useEffect(() => {
    recalcEdgeSpacer();
    const onResize = () => recalcEdgeSpacer();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visibleSections.length]);

  const chartData = useMemo(() => {
    // Build daily target first, then aggregate to weeks if needed.
    let targetCum = 0;
    let actualCum = 0;
    const isGuideBased =
      selectedSectionMeta?.guideBased &&
      (selectedSectionMeta?.totalFittings ?? 0) > 0 &&
      selectedSectionMeta?.startCh != null &&
      selectedSectionMeta?.endCh != null;
    const guideTotal = selectedSectionMeta?.totalFittings ?? 0;
    const guideMetresPerFitting =
      isGuideBased && guideTotal > 0
        ? Math.abs((selectedSectionMeta?.endCh ?? 0) - (selectedSectionMeta?.startCh ?? 0)) / guideTotal
        : PIPE_LENGTH_M;
    const sectionTargetKey = sectionFilter || "__default__";
    const defaultTargetMeters = Math.max(0, targetMetersBySection[sectionTargetKey] ?? PIPE_LENGTH_M);
    const daily = selectedSourceData.map((d) => {
      const rangeMatch = (settings.targetRanges ?? []).find(
        (r) => r.start && r.end && d.date >= r.start && d.date <= r.end
      );
      const rangeTargetMeters =
        rangeMatch != null
          ? (isGuideBased ? rangeMatch.pipesPerDay * guideMetresPerFitting : rangeMatch.pipesPerDay * PIPE_LENGTH_M)
          : defaultTargetMeters;
      const targetMeters = isWaWorkingDay(d.date) ? rangeTargetMeters : 0;
      targetCum += targetMeters;
      const fittingsForDay = d.pipeMetres / PIPE_LENGTH_M;
      const actualMetersForDay = Math.round(fittingsForDay * guideMetresPerFitting * 10) / 10;
      actualCum += actualMetersForDay;
      return {
        ...d,
        pipeMetres: actualMetersForDay,
        pipeMetresCumulative: Math.round(actualCum * 10) / 10,
        pipeTargetCumulative: Math.round(targetCum),
        pipePipesPerDay: fittingsForDay,
      };
    });

    return daily;
  }, [selectedSourceData, sectionFilter, settings.targetRanges, selectedSectionMeta, targetMetersBySection]);
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props as {
      active?: boolean;
      payload?: readonly any[];
      label?: string;
    };
    if (!active || !payload?.length) return null;
    const pipe = payload.find((p) => p.dataKey === "pipeMetresCumulative");
    const target = payload.find((p) => p.dataKey === "pipeTargetCumulative");
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs shadow-md"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e4e4e7",
          fontFamily: "var(--font-dm-mono), monospace",
          minWidth: "140px",
        }}
      >
        <p className="mb-1 font-semibold text-zinc-500">{label}</p>
        {pipe && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f97316" }} />
              Pipe laid
            </span>
            <span className="font-semibold text-zinc-800">{pipe.value} m</span>
          </div>
        )}
        {target && (
          <div className="mt-0.5 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-400 italic">
              <span
                className="inline-block h-px w-2.5"
                style={{ backgroundColor: "#94a3b8", borderTop: "1.5px dashed #94a3b8" }}
              />
              Projected
            </span>
            <span className="text-zinc-400 italic">{target.value} m</span>
          </div>
        )}
      </div>
    );
  };
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
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex flex-col gap-0.5">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "#f97316",
                fontFamily: "var(--font-barlow), sans-serif",
                letterSpacing: "0.15em",
              }}
            >
              Pipe Installed
            </span>
            <h2
              className="text-xl font-bold leading-tight"
              style={{ color: tokens.text.primary, fontFamily: "var(--font-barlow), sans-serif" }}
            >
              Cumulative Month Progress
            </h2>
          </div>
          {data.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => scrollToSection("prev")}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150"
                style={{
                  border: "1.5px solid #d4d4d8",
                  color: "#71717a",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d4d4d8")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M7.5 2L3.5 6L7.5 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                className="scrollbar-none flex flex-1 cursor-grab gap-3 overflow-x-auto py-1 active:cursor-grabbing"
                style={{
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  userSelect: "none",
                }}
              >
                <div aria-hidden style={{ minWidth: edgeSpacer }} />
                {visibleSections.map((section) => {
                  const isActive = sectionFilter === section.id;
                  return (
                    <button
                      key={section.id}
                      data-section-id={section.id}
                      onClick={() => {
                        if (!didDrag.current) {
                          setSectionFilter(section.id);
                          centerSelectedSection(section.id);
                        }
                      }}
                      className="flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 hover:border-[#f97316]/60"
                      style={{
                        scrollSnapAlign: "start",
                        width: "calc(100% - 3rem)",
                        minWidth: "calc(100% - 3rem)",
                        fontFamily: "var(--font-dm-mono), monospace",
                        background: isActive
                          ? "linear-gradient(to right, transparent 0%, transparent 24%, #fdba7422 40%, #fdba7455 48%, #fdba7455 52%, #fdba7422 60%, transparent 76%, transparent 100%)"
                          : "transparent",
                        color: isActive ? "#1a1a1a" : "#71717a",
                        fontWeight: isActive ? 700 : 600,
                        border: "none",
                        textAlign: "center",
                      }}
                    >
                      {section.name}
                    </button>
                  );
                })}
                <div aria-hidden style={{ minWidth: edgeSpacer }} />
              </div>
              <button
                onClick={() => scrollToSection("next")}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150"
                style={{
                  border: "1.5px solid #d4d4d8",
                  color: "#71717a",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d4d4d8")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M4.5 2L8.5 6L4.5 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
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
          <button
            type="button"
            onClick={() => setEditorOpen((p) => !p)}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-zinc-600 hover:bg-muted"
            aria-label="Chart settings"
          >
            ⋮
          </button>
          {editorOpen && (
            <div
              className="absolute right-0 top-10 z-[9999] w-[520px] max-w-[min(90vw,520px)] rounded-lg border border-border bg-card p-3 shadow-lg"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label
                    className="mb-1 block text-[11px] font-medium text-zinc-600"
                    title="Set the daily target in metres for this section."
                  >
                    Default target (m/day) - per section
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={Math.max(0, targetMetersBySection[sectionFilter || "__default__"] ?? PIPE_LENGTH_M)}
                    onChange={(e) =>
                      setTargetMetersBySection((prev) => {
                        const v = Number(e.target.value);
                        return {
                          ...prev,
                          [sectionFilter || "__default__"]: Number.isFinite(v) && v >= 0 ? v : 0,
                        };
                      })
                    }
                    className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                    title="Set the daily target in metres for this section."
                  />
                </div>
                <div className="col-span-2">
                  <label
                    className="mb-1 block text-[11px] font-medium text-zinc-600"
                    title="Edit unit shown for target."
                  >
                    Unit to measure
                  </label>
                  <input
                    className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
                    value={settings.targetUnit}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        targetUnit: e.target.value || "Pipe/Fitting",
                      }))
                    }
                    placeholder="Pipe/Fitting"
                    title="Edit unit shown for target."
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
                              pipesPerDay: 1,
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
                                ? { color: "#f97316", width: chartLineVisual.strokeWidth, dash: "" }
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
              <Tooltip content={renderTooltip} />
              <Line
                type="monotone"
                dataKey="pipeTargetCumulative"
                name="Projected"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
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
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 ml-1 flex shrink-0 items-center gap-5 pt-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
            <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
              Pipe laid
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="10" className="overflow-visible">
              <line x1="0" y1="5" x2="20" y2="5" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
            </svg>
            <span className="text-xs text-zinc-400 italic" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
              Projected
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
