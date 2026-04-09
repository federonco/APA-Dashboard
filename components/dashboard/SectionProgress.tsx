"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tokens } from "@/lib/designTokens";
import type { SectionInfo, SectionProgressData } from "@/lib/queries/daily";
import { PIPE_LENGTH_M, SCHEDULE_PIPES_PER_DAY } from "@/lib/constants";

type Props = {
  sections: SectionInfo[];
  progressBySection: Record<string, SectionProgressData | null>;
};

type EstimationSettings = {
  mode: "auto" | "manual";
  contingencyDays: number;
  manualFinishDate: string;
  pipesPerDayMode: "average" | "manual";
  manualPipesPerDay: number;
};

const SETTINGS_KEY = "sectionProgress.estimationSettings.v1";

// WA public holidays (observed) used by expected-finish estimator.
// Keep this list updated yearly as needed.
const WA_PUBLIC_HOLIDAYS: Record<number, string[]> = {
  2025: [
    "2025-01-01", // New Year's Day
    "2025-01-27", // Australia Day (observed)
    "2025-03-03", // Labour Day
    "2025-04-18", // Good Friday
    "2025-04-21", // Easter Monday
    "2025-04-25", // ANZAC Day
    "2025-06-02", // WA Day
    "2025-09-29", // King's Birthday (WA)
    "2025-12-25", // Christmas Day
    "2025-12-26", // Boxing Day
  ],
  2026: [
    "2026-01-01",
    "2026-01-26",
    "2026-03-02",
    "2026-04-03",
    "2026-04-06",
    "2026-04-27", // ANZAC Day observed
    "2026-06-01",
    "2026-09-28",
    "2026-12-25",
    "2026-12-28", // Boxing Day observed
  ],
  2027: [
    "2027-01-01",
    "2027-01-26",
    "2027-03-01",
    "2027-03-26",
    "2027-03-29",
    "2027-04-26", // ANZAC Day observed
    "2027-06-07",
    "2027-09-27",
    "2027-12-27", // Christmas Day observed
    "2027-12-28", // Boxing Day observed
  ],
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWaNonWorkingDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return true; // Sunday/Saturday
  const key = toDateKey(d);
  const list = WA_PUBLIC_HOLIDAYS[d.getFullYear()] ?? [];
  return list.includes(key);
}

function addWaWorkingDays(from: Date, days: number): Date {
  if (days <= 0) return new Date(from);
  const out = new Date(from);
  let added = 0;
  while (added < days) {
    out.setDate(out.getDate() + 1);
    if (!isWaNonWorkingDay(out)) added += 1;
  }
  return out;
}

export function SectionProgress({ sections, progressBySection }: Props) {
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [settings, setSettings] = useState<EstimationSettings>({
    mode: "auto",
    contingencyDays: 5,
    manualFinishDate: "",
    pipesPerDayMode: "average",
    manualPipesPerDay: SCHEDULE_PIPES_PER_DAY,
  });
  const section = sections.find((s) => s.id === selectedId);
  const progress = section ? progressBySection[section.id] : null;

  const pb = tokens.components.progressBar;
  const percent = progress?.percent ?? 0;
  const installedCh = progress?.installedChainage ?? 0;
  const finalCh = progress?.finalChainage ?? 0;
  const pipeCount = progress?.pipeCount ?? 0;
  const pspLodgedUpToChainage = progress?.pspLodgedUpToChainage ?? null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EstimationSettings>;
      if (!parsed || typeof parsed !== "object") return;
      setSettings((prev) => ({
        mode: parsed.mode === "manual" ? "manual" : "auto",
        contingencyDays:
          typeof parsed.contingencyDays === "number" && Number.isFinite(parsed.contingencyDays)
            ? Math.max(0, Math.round(parsed.contingencyDays))
            : prev.contingencyDays,
        manualFinishDate:
          typeof parsed.manualFinishDate === "string" ? parsed.manualFinishDate : prev.manualFinishDate,
        pipesPerDayMode: parsed.pipesPerDayMode === "manual" ? "manual" : "average",
        manualPipesPerDay:
          typeof parsed.manualPipesPerDay === "number" && Number.isFinite(parsed.manualPipesPerDay)
            ? Math.max(0, parsed.manualPipesPerDay)
            : prev.manualPipesPerDay,
      }));
    } catch {
      // ignore localStorage parsing errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage write errors
    }
  }, [settings]);

  const averagePipesPerDay =
    progress?.avgPipesPerDay && progress.avgPipesPerDay > 0
      ? progress.avgPipesPerDay
      : SCHEDULE_PIPES_PER_DAY;
  const estimatedPipesPerDay =
    settings.pipesPerDayMode === "manual"
      ? Math.max(0, settings.manualPipesPerDay)
      : averagePipesPerDay;

  const expectedFinishText = useMemo(() => {
    if (!section) return null;

    if (settings.mode === "manual" && settings.manualFinishDate) {
      const manualDate = new Date(settings.manualFinishDate + "T12:00:00");
      if (!Number.isNaN(manualDate.getTime())) {
        const label = manualDate.toLocaleDateString("en-AU", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return `Expected finish (manual): ${label}`;
      }
    }

    if (!(pipeCount > 0 && estimatedPipesPerDay > 0)) return null;
    const totalLength = Math.abs(section.endCh - section.startCh);
    const totalPipesPlanned = totalLength > 0 ? totalLength / PIPE_LENGTH_M : 0;
    if (totalPipesPlanned <= 0) return null;

    const remainingPipes = Math.max(0, totalPipesPlanned - pipeCount);
    if (remainingPipes === 0) return "Expected finish: Completed";

    const daysRemaining = Math.ceil(remainingPipes / estimatedPipesPerDay);
    const today = new Date();
    const finish = addWaWorkingDays(
      today,
      daysRemaining + settings.contingencyDays
    );
    const label = finish.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `Expected finish (incl. +${settings.contingencyDays}d contingency, WA public holidays included): ${label}`;
  }, [
    estimatedPipesPerDay,
    pipeCount,
    section,
    settings.contingencyDays,
    settings.manualFinishDate,
    settings.mode,
  ]);

  if (sections.length === 0) {
    return (
      <Card
        style={{
          background: tokens.theme.card,
          border: `1px solid ${tokens.theme.border}`,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.cardPadding,
          marginBottom: tokens.spacing.gap,
        }}
      >
        <CardHeader style={{ padding: 0, marginBottom: 12 }}>
          <p
            style={{
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.02em",
            }}
          >
            Section progress
          </p>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <p style={{ fontSize: tokens.typography.body, color: tokens.text.muted }}>
            No sections configured for this crew
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="relative z-[10000] overflow-visible"
      style={{
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.cardPadding,
        marginBottom: tokens.spacing.gap,
      }}
    >
      <CardHeader style={{ padding: 0, marginBottom: 12 }}>
        <div className="relative flex items-center justify-between gap-2">
          <p
            style={{
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.02em",
            }}
          >
            Section progress
          </p>
          <button
            type="button"
            onClick={() => setEditorOpen((p) => !p)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-zinc-600 hover:bg-muted"
            aria-label="Estimation settings"
            title="Edit expected finish estimation model"
          >
            ⋮
          </button>
          {editorOpen && (
            <div className="absolute right-0 top-10 z-[2147483647] w-[360px] max-w-[min(90vw,360px)] rounded-lg border border-border bg-card p-3 shadow-lg">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                    Estimation mode
                  </label>
                  <select
                    className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
                    value={settings.mode}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        mode: e.target.value === "manual" ? "manual" : "auto",
                      }))
                    }
                  >
                    <option value="auto">Auto (pipes/day + contingency)</option>
                    <option value="manual">Manual finish date</option>
                  </select>
                </div>

                {settings.mode === "auto" ? (
                  <>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                        Pipes / day source
                      </label>
                      <select
                        className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
                        value={settings.pipesPerDayMode}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            pipesPerDayMode: e.target.value === "manual" ? "manual" : "average",
                          }))
                        }
                      >
                        <option value="average">
                          Historical average ({averagePipesPerDay.toFixed(1)})
                        </option>
                        <option value="manual">Manual value</option>
                      </select>
                    </div>

                    {settings.pipesPerDayMode === "manual" && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                          Pipes / day (manual)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                          value={settings.manualPipesPerDay}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              manualPipesPerDay: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                        Contingency (days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                        value={settings.contingencyDays}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            contingencyDays: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-zinc-600">
                      Manual finish date
                    </label>
                    <input
                      type="date"
                      className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
                      value={settings.manualFinishDate}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          manualFinishDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <Tabs
        value={selectedId}
        onValueChange={(v) => setSelectedId(v)}
        className="w-full"
      >
        <div className="mb-2 max-w-xs">
          <label
            htmlFor="section-selector"
            className="mb-1 block text-[11px] font-medium text-zinc-600"
          >
            Section selector
          </label>
          <select
            id="section-selector"
            className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div
            style={{
              width: "100%",
              height: pb.height,
              background: pb.background,
              borderRadius: pb.radius,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percent}%`,
                background: pb.fill,
                borderRadius: pb.radius,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-4">
              <p
                style={{
                  fontSize: tokens.typography.subtitle,
                  fontWeight: 600,
                  color: tokens.text.primary,
                  lineHeight: 1.2,
                }}
              >
                {percent}% complete
              </p>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span
                style={{
                  fontSize: tokens.typography.label,
                  color: tokens.text.muted,
                }}
              >
                Pipe installed Ch {installedCh.toFixed(1)} m / final Ch {finalCh.toFixed(1)} m
              </span>
              <p
                style={{
                  fontSize: tokens.typography.label,
                  color: tokens.text.muted,
                }}
              >
                {pipeCount} pipes installed
              </p>
            </div>
            <div
              style={{
                fontSize: tokens.typography.label,
                color: tokens.text.muted,
              }}
            >
              {pspLodgedUpToChainage != null
                ? `PSP records lodged up to Ch ${pspLodgedUpToChainage.toFixed(1)} m`
                : "PSP records lodged up to —"}
            </div>
            {expectedFinishText && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: tokens.typography.label,
                  color: tokens.text.secondary,
                  fontFamily: tokens.typography.fontFamily,
                }}
              >
                {expectedFinishText}
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </Card>
  );
}
