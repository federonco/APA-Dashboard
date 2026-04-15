"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import type {
  DrainerSubsectionInfo,
  SectionInfo,
  SectionProgressData,
  SectionProgressScope,
} from "@/lib/queries/daily";
import { PIPE_LENGTH_M, SCHEDULE_PIPES_PER_DAY } from "@/lib/constants";

type Props = {
  sections: SectionInfo[];
  subsections: DrainerSubsectionInfo[];
  crewCode: string;
  initialProgress: SectionProgressData | null;
};

type EstimationSettings = {
  mode: "auto" | "manual";
  contingencyDays: number;
  manualFinishDate: string;
  pipesPerDayMode: "average" | "manual";
  manualPipesPerDay: number;
};

const SETTINGS_KEY = "sectionProgress.estimationSettings.v1";
const SCOPE_KEY = "sectionProgress.scope.v2";

type ScopeRow = { full: boolean; subIds: string[] };

function defaultSelection(sections: SectionInfo[]): Record<string, ScopeRow> {
  const o: Record<string, ScopeRow> = {};
  for (const s of sections) o[s.id] = { full: true, subIds: [] };
  return o;
}

function parseSelection(
  raw: unknown,
  sections: SectionInfo[],
  subsections: DrainerSubsectionInfo[]
): Record<string, ScopeRow> {
  const base = defaultSelection(sections);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const subBySection = new Map<string, Set<string>>();
  for (const sub of subsections) {
    if (!subBySection.has(sub.drainerSectionId)) subBySection.set(sub.drainerSectionId, new Set());
    subBySection.get(sub.drainerSectionId)!.add(sub.id);
  }
  for (const s of sections) {
    const row = obj[s.id];
    if (!row || typeof row !== "object") continue;
    const full = (row as { full?: unknown }).full === true;
    const idsRaw = (row as { subIds?: unknown }).subIds;
    const ids = Array.isArray(idsRaw)
      ? idsRaw.filter((x): x is string => typeof x === "string")
      : [];
    const valid = new Set(subBySection.get(s.id) ?? []);
    base[s.id] = {
      full,
      subIds: ids.filter((id) => valid.has(id)),
    };
  }
  return base;
}

function buildScopes(
  sections: SectionInfo[],
  subsections: DrainerSubsectionInfo[],
  sel: Record<string, ScopeRow>
): SectionProgressScope[] {
  const scopes: SectionProgressScope[] = [];
  for (const s of sections) {
    const row = sel[s.id] ?? { full: true, subIds: [] };
    if (row.full) {
      scopes.push({ sectionId: s.id, ranges: null });
      continue;
    }
    const subs = subsections.filter((x) => x.drainerSectionId === s.id && row.subIds.includes(x.id));
    if (subs.length === 0) continue;
    scopes.push({
      sectionId: s.id,
      ranges: subs.map((x) => ({ min: x.startCh, max: x.endCh })),
    });
  }
  return scopes;
}

/** Planned lay length (m) for the current scope — matches how progress scopes are built. */
function plannedMetresFromSelection(
  sections: SectionInfo[],
  subsections: DrainerSubsectionInfo[],
  sel: Record<string, ScopeRow>
): number {
  let sum = 0;
  for (const s of sections) {
    const row = sel[s.id] ?? { full: true, subIds: [] };
    if (row.full) {
      sum += Math.abs(s.endCh - s.startCh);
    } else {
      for (const sid of row.subIds) {
        const sub = subsections.find((x) => x.id === sid && x.drainerSectionId === s.id);
        if (sub) sum += Math.abs(sub.endCh - sub.startCh);
      }
    }
  }
  return sum;
}

// WA public holidays (observed) used by expected-finish estimator.
const WA_PUBLIC_HOLIDAYS: Record<number, string[]> = {
  2025: [
    "2025-01-01",
    "2025-01-27",
    "2025-03-03",
    "2025-04-18",
    "2025-04-21",
    "2025-04-25",
    "2025-06-02",
    "2025-09-29",
    "2025-12-25",
    "2025-12-26",
  ],
  2026: [
    "2026-01-01",
    "2026-01-26",
    "2026-03-02",
    "2026-04-03",
    "2026-04-06",
    "2026-04-27",
    "2026-06-01",
    "2026-09-28",
    "2026-12-25",
    "2026-12-28",
  ],
  2027: [
    "2027-01-01",
    "2027-01-26",
    "2027-03-01",
    "2027-03-26",
    "2027-03-29",
    "2027-04-26",
    "2027-06-07",
    "2027-09-27",
    "2027-12-27",
    "2027-12-28",
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
  if (day === 0 || day === 6) return true;
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

export function SectionProgress({
  sections,
  subsections,
  crewCode,
  initialProgress,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, ScopeRow>>(() =>
    defaultSelection(sections)
  );
  const [progress, setProgress] = useState<SectionProgressData | null>(initialProgress);
  const [progressLoading, setProgressLoading] = useState(false);
  const [settings, setSettings] = useState<EstimationSettings>({
    mode: "auto",
    contingencyDays: 5,
    manualFinishDate: "",
    pipesPerDayMode: "average",
    manualPipesPerDay: SCHEDULE_PIPES_PER_DAY,
  });

  const pb = tokens.components.progressBar;
  const percent = progress?.percent ?? 0;
  const installedCh = progress?.installedChainage ?? 0;
  const finalCh = progress?.finalChainage ?? 0;
  const pipeCount = progress?.pipeCount ?? 0;
  const pipeChainageLabel = useMemo(() => {
    if (!progress) return "";
    const pMin = progress.pipeMinCh;
    const pMax = progress.pipeMaxCh;
    if (pMin != null && pMax != null) {
      return `Last pipe installed at Ch ${pMax.toFixed(1)} m (Ch ${pMin.toFixed(1)} to Ch ${pMax.toFixed(1)} m)`;
    }
    if (progress.isAggregated) {
      const lo = progress.scopeChainageLo;
      const hi = progress.scopeChainageHi;
      if (lo != null && hi != null) {
        return `No pipes in selection (Ch ${lo.toFixed(1)} to Ch ${hi.toFixed(1)} m)`;
      }
    }
    return `Pipe installed Ch ${installedCh.toFixed(1)} m / final Ch ${finalCh.toFixed(1)} m`;
  }, [progress, installedCh, finalCh]);

  const pspChainageLabel = useMemo(() => {
    if (!progress) return "";
    const lo = progress.pspLodgedMinCh;
    const hi = progress.pspLodgedMaxCh;
    if (progress.isAggregated && lo != null && hi != null) {
      if (Math.abs(lo - hi) < 0.05) {
        return `PSP records lodged up to Ch ${lo.toFixed(1)} m`;
      }
      return `PSP records lodged Ch ${Math.min(lo, hi).toFixed(1)}–${Math.max(lo, hi).toFixed(1)} m`;
    }
    if (progress.pspLodgedUpToChainage != null) {
      return `PSP records lodged up to Ch ${progress.pspLodgedUpToChainage.toFixed(1)} m`;
    }
    return "PSP records lodged up to —";
  }, [progress]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SCOPE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        setSelection(parseSelection(parsed, sections, subsections));
      } else {
        setSelection(defaultSelection(sections));
      }
    } catch {
      setSelection(defaultSelection(sections));
    }
  }, [sections, subsections]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SCOPE_KEY, JSON.stringify(selection));
    } catch {
      // ignore
    }
  }, [selection]);

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
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const refreshProgress = useCallback(async () => {
    const scopes = buildScopes(sections, subsections, selection);
    if (scopes.length === 0) {
      setProgress(null);
      return;
    }
    setProgressLoading(true);
    try {
      const res = await fetch("/api/dashboard/section-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes, crewCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load progress");
      setProgress(data.progress ?? null);
    } catch {
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }, [sections, subsections, selection, crewCode]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const averagePipesPerDay =
    progress?.avgPipesPerDay && progress.avgPipesPerDay > 0
      ? progress.avgPipesPerDay
      : SCHEDULE_PIPES_PER_DAY;
  const estimatedPipesPerDay =
    settings.pipesPerDayMode === "manual"
      ? Math.max(0, settings.manualPipesPerDay)
      : averagePipesPerDay;

  const expectedFinishText = useMemo(() => {
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

    if (settings.mode !== "auto") return null;

    const plannedM = plannedMetresFromSelection(sections, subsections, selection);
    const totalPipesPlanned = plannedM > 0 ? plannedM / PIPE_LENGTH_M : 0;
    if (totalPipesPlanned <= 0) return null;
    if (!(estimatedPipesPerDay > 0)) return null;

    const remainingPipes = Math.max(0, totalPipesPlanned - pipeCount);
    if (remainingPipes === 0) return "Expected finish: Completed";

    const daysRemaining = Math.ceil(remainingPipes / estimatedPipesPerDay);
    const today = new Date();
    const finish = addWaWorkingDays(today, daysRemaining + settings.contingencyDays);
    const label = finish.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `Expected finish ${label} (+${settings.contingencyDays} working-day contingency; weekends & WA public holidays skipped)`;
  }, [
    sections,
    subsections,
    selection,
    pipeCount,
    estimatedPipesPerDay,
    settings.contingencyDays,
    settings.manualFinishDate,
    settings.mode,
  ]);

  const subsFor = (drainerId: string) =>
    subsections.filter((x) => x.drainerSectionId === drainerId);

  const toggleSectionFull = (sectionId: string, checked: boolean) => {
    setSelection((prev) => ({
      ...prev,
      [sectionId]: checked ? { full: true, subIds: [] } : { full: false, subIds: [] },
    }));
  };

  const toggleSub = (sectionId: string, subId: string, checked: boolean) => {
    setSelection((prev) => {
      const cur = prev[sectionId] ?? { full: true, subIds: [] };
      if (cur.full) return prev;
      const set = new Set(cur.subIds);
      if (checked) set.add(subId);
      else set.delete(subId);
      return { ...prev, [sectionId]: { full: false, subIds: Array.from(set) } };
    });
  };

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
            aria-label="Estimation and scope settings"
            title="Scope (sections/subsections), estimation model"
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>
          {editorOpen && (
            <div className="absolute right-0 top-10 z-[2147483647] max-h-[min(70vh,520px)] w-[min(92vw,400px)] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-zinc-700">OnSite-D scope</p>
              <p className="mb-3 text-[11px] leading-snug text-zinc-500">
                Tick <strong>Entire section</strong> for full chainage, or turn it off and choose
                subsections. Progress and pipes aggregate your selection.
              </p>
              <div className="mb-4 max-h-48 space-y-3 overflow-y-auto border-b border-border pb-3">
                {sections.map((s) => {
                  const row = selection[s.id] ?? { full: true, subIds: [] };
                  const subs = subsFor(s.id);
                  return (
                    <div key={s.id} className="rounded-md border border-zinc-100 bg-zinc-50/80 p-2">
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={row.full}
                          onChange={(e) => toggleSectionFull(s.id, e.target.checked)}
                        />
                        <span>
                          <span className="font-medium text-zinc-800">Entire: {s.name}</span>
                        </span>
                      </label>
                      {subs.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1 border-l border-zinc-200 pl-2">
                          {subs.map((sub) => (
                            <label
                              key={sub.id}
                              className={`flex cursor-pointer items-center gap-2 text-[12px] ${
                                row.full ? "text-zinc-400" : "text-zinc-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={row.full}
                                checked={!row.full && row.subIds.includes(sub.id)}
                                onChange={(e) => toggleSub(s.id, sub.id, e.target.checked)}
                              />
                              {sub.name}{" "}
                              <span className="text-zinc-400">
                                (Ch {sub.startCh}–{sub.endCh})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mb-2 text-xs font-semibold text-zinc-700">Estimation</p>
              <p className="mb-3 text-[10px] leading-snug text-zinc-500">
                Auto finish steps forward in <strong>working days</strong> (Mon–Fri, excluding WA
                public holidays), then adds contingency as further working days.
              </p>
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
      <CardContent style={{ padding: 0 }}>
        {progressLoading && (
          <p className="mb-2 text-xs text-zinc-500">Updating progress…</p>
        )}
        {!progress && !progressLoading && (
          <p style={{ fontSize: tokens.typography.body, color: tokens.text.muted }}>
            No scope selected. Open settings and include at least one section or subsection.
          </p>
        )}
        {progress && (
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
                  {pipeChainageLabel}
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
                {pspChainageLabel}
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
        )}
      </CardContent>
    </Card>
  );
}
