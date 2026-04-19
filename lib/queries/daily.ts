/**
 * Dashboard operational queries use the admin client to avoid JWT/session
 * refresh failures during server-side rendering (PGRST303, JWT expired).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getLastNWorkingDays, getWorkingDaysInRange } from "@/lib/utils/workingDays";
import { PIPE_LENGTH_M } from "@/lib/constants";

export type HourlyPipeProgress = { hour: string; pipes: number };
export type HourlyBackfillProgress = { hour: string; metres: number };
export type WaterByActivity = { activity: string; litres: number };
export type DayValue = { day: string; value: number };
export type MonthlyDayValue = {
  date: string;
  label: string;
  pipeMetres: number;
  backfillMetres: number;
  pipeMetresCumulative: number;
  backfillMetresCumulative: number;
};
export type ChainageProgressValue = {
  date: string;
  label: string;
  pipeChainage: number;
  backfillChainage: number;
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTodayPerth(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
}

function toPerthDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
}

function getTargetDate(date?: string): string {
  return date ?? getTodayPerth();
}

/** Day boundaries UTC */
function dayStartEndUtc(date?: string): { start: string; end: string } {
  const target = getTargetDate(date);
  return {
    start: `${target}T00:00:00.000Z`,
    end: `${target}T23:59:59.999Z`,
  };
}

/** Day boundaries Perth UTC+8 — for wc_water_logs created_at */
function dayStartEndPerth(date?: string): { start: string; end: string } {
  const target = getTargetDate(date);
  return {
    start: `${target}T00:00:00+08:00`,
    end: `${target}T23:59:59.999+08:00`,
  };
}

const BACKFILL_M_PER_RECORD = 20;

/**
 * Calculate daily backfill metres from psp_records.
 * Each valid record = 20 m. Valid = recorded_at, location_id, chainage numeric, day in validDays.
 */
function calculateDailyBackfillFromRecords(
  rows: { recorded_at?: string; chainage?: unknown; location_id?: string }[],
  validDays: string[]
): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const r of rows) {
    const rawTs = r.recorded_at;
    if (!rawTs) continue;
    const locId = r.location_id;
    const chainage = Number(r.chainage);
    if (!locId || isNaN(chainage)) continue;
    const day = toPerthDate(String(rawTs));
    if (!day || !validDays.includes(day)) continue;
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  const result: Record<string, number> = {};
  for (const day of validDays) {
    const count = byDay[day] ?? 0;
    result[day] = Math.round(count * BACKFILL_M_PER_RECORD * 10) / 10;
  }
  return result;
}

function dayToLabel(d: string): string {
  const dt = new Date(d + "T12:00:00");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${names[dt.getDay()]} ${dt.getDate()}`;
}

export async function getCrewId(crewName: string): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("crews")
    .select("id")
    .eq("name", crewName)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getVehicleIdsForCrew(crewId: string): Promise<string[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wc_vehicles")
    .select("id")
    .eq("crew_id", crewId);
  if (error) return [];
  return (data ?? [])
    .map((r) => (r as { id?: string | null }).id)
    .filter((id): id is string => !!id);
}

export async function getSectionIdsForCrew(crewId: string): Promise<string[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("drainer_sections")
    .select("id")
    .eq("crew_id", crewId);
  return data?.map((s) => s.id) ?? [];
}

export type SectionInfo = {
  id: string;
  name: string;
  startCh: number;
  endCh: number;
  direction: "onwards" | "backwards";
};

export type SectionProgressData = {
  sectionId: string;
  installedChainage: number;
  finalChainage: number;
  pspLodgedUpToChainage: number | null;
  percent: number;
  pipeCount: number;
  avgPipesPerDay: number;
  /** True when the value combines multiple drainer sections or scoped ranges. */
  isAggregated?: boolean;
  /** Min/max chainage among pipes in scope (metres). */
  pipeMinCh?: number;
  pipeMaxCh?: number;
  /** Selected scope along-chain extent (subsection union or full section), metres. */
  scopeChainageLo?: number;
  scopeChainageHi?: number;
  /** When multiple scopes contribute PSP figures (metres). */
  pspLodgedMinCh?: number;
  pspLodgedMaxCh?: number;
};

/** Chainage interval (metres) for OnSite-D subsection scoping; min/max order normalized internally. */
export type ChainageScopeRange = { min: number; max: number };

export type DrainerSubsectionInfo = {
  id: string;
  name: string;
  startCh: number;
  endCh: number;
  drainerSectionId: string;
};

export async function resolveUnifiedSectionIdForDrainer(
  drainerSectionId: string
): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data: asUnified } = await supabase
    .from("sections")
    .select("id")
    .eq("id", drainerSectionId)
    .maybeSingle();
  if (asUnified?.id) return asUnified.id;

  const { data: viaSectionLegacy } = await supabase
    .from("sections")
    .select("id")
    .eq("app_config->>legacy_id", drainerSectionId)
    .maybeSingle();
  if (viaSectionLegacy?.id) return viaSectionLegacy.id;

  const { data: viaSubLegacy } = await supabase
    .from("subsections")
    .select("section_id")
    .eq("app_config->>legacy_id", drainerSectionId)
    .maybeSingle();
  if (viaSubLegacy?.section_id) return String(viaSubLegacy.section_id);

  // Fallback: unified `sections` row whose name matches this drainer (subsections hang off `sections`).
  const { data: drRow } = await supabase
    .from("drainer_sections")
    .select("name")
    .eq("id", drainerSectionId)
    .maybeSingle();
  const drName = String((drRow as { name?: string | null })?.name ?? "").trim();
  if (drName.length > 0) {
    const { data: exactHits } = await supabase
      .from("sections")
      .select("id")
      .ilike("name", drName)
      .limit(2);
    if (exactHits?.length === 1) {
      return (exactHits[0] as { id: string }).id;
    }
    const { data: fuzzyHits } = await supabase
      .from("sections")
      .select("id")
      .ilike("name", `%${drName}%`)
      .limit(2);
    if (fuzzyHits?.length === 1) {
      return (fuzzyHits[0] as { id: string }).id;
    }
  }

  return null;
}

export async function getDrainerSubsectionsForCrew(
  crewId: string | null
): Promise<DrainerSubsectionInfo[]> {
  if (!hasSupabaseEnv() || !crewId) return [];
  const supabase = createAdminClient();
  if (!supabase) return [];
  try {
    const { data: drainers, error: de } = await supabase
      .from("drainer_sections")
      .select("id")
      .eq("crew_id", crewId);
    if (de) throw de;
    const out: DrainerSubsectionInfo[] = [];
    const seenSubsectionIds = new Set<string>();
    for (const d of drainers ?? []) {
      const drainerId = (d as { id: string }).id;
      const unifiedId = await resolveUnifiedSectionIdForDrainer(drainerId);
      if (!unifiedId) continue;
      const { data: subs, error: se } = await supabase
        .from("subsections")
        .select("id, name, start_ch, end_ch")
        .eq("section_id", unifiedId)
        .order("name");
      if (se) continue;
      for (const s of subs ?? []) {
        const subId = (s as { id: string }).id;
        if (seenSubsectionIds.has(subId)) continue;
        seenSubsectionIds.add(subId);
        const a = Number((s as { start_ch?: unknown }).start_ch);
        const b = Number((s as { end_ch?: unknown }).end_ch);
        if (Number.isNaN(a) || Number.isNaN(b)) continue;
        out.push({
          id: subId,
          name: String((s as { name?: string }).name ?? "Subsection"),
          startCh: a,
          endCh: b,
          drainerSectionId: drainerId,
        });
      }
    }
    return out;
  } catch (e) {
    console.error("[Dashboard] getDrainerSubsectionsForCrew failed:", e);
    return [];
  }
}

function normalizeChainageRanges(ranges: ChainageScopeRange[]): ChainageScopeRange[] {
  const norm = ranges
    .map((r) => ({ min: Math.min(r.min, r.max), max: Math.max(r.min, r.max) }))
    .filter((r) => r.max > r.min && Number.isFinite(r.min) && Number.isFinite(r.max))
    .sort((a, b) => a.min - b.min);
  const merged: ChainageScopeRange[] = [];
  for (const r of norm) {
    const last = merged[merged.length - 1];
    if (!last || r.min > last.max) merged.push({ ...r });
    else last.max = Math.max(last.max, r.max);
  }
  return merged;
}

function chainageInRanges(ch: number, ranges: ChainageScopeRange[]): boolean {
  return ranges.some((r) => ch >= r.min && ch <= r.max);
}

export type SectionProgressScope = {
  sectionId: string;
  /** null = full drainer section; non-empty = union of chainage windows (OnSite-D subsections). */
  ranges: ChainageScopeRange[] | null;
};

async function getPspLocationIdsForSection(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  sectionId: string,
  crewId: string | null
): Promise<string[]> {
  // Prefer direct section mapping when schema has it.
  const bySection = await supabase
    .from("locations")
    .select("id")
    .eq("location_type", "psp")
    .eq("section_id", sectionId);
  if (!bySection.error) {
    return (bySection.data ?? []).map((r) => r.id);
  }
  if (bySection.error.code === "42703") {
    const byDrainerSection = await supabase
      .from("locations")
      .select("id")
      .eq("location_type", "psp")
      .eq("drainer_section_id", sectionId);
    if (!byDrainerSection.error) {
      return (byDrainerSection.data ?? []).map((r) => r.id);
    }
  }
  // Fallback to crew-scoped PSP locations.
  if (!crewId) return [];
  const byCrew = await supabase
    .from("locations")
    .select("id")
    .eq("location_type", "psp")
    .eq("crew_id", crewId);
  if (byCrew.error) return [];
  return (byCrew.data ?? []).map((r) => r.id);
}

export async function getSectionsForCrew(crewId: string | null): Promise<SectionInfo[]> {
  if (!hasSupabaseEnv() || !crewId) return [];
  try {
    const supabase = createAdminClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("drainer_sections")
      .select("id, name, start_ch, end_ch, direction")
      .eq("crew_id", crewId);
    if (error) throw error;
    return (data ?? []).map((s) => ({
      id: s.id,
      name: s.name ?? "Section",
      startCh: Number(s.start_ch) || 0,
      endCh: Number(s.end_ch) || 0,
      direction: (s.direction === "backwards" ? "backwards" : "onwards") as "onwards" | "backwards",
    }));
  } catch (err) {
    console.error("[Dashboard] getSectionsForCrew failed:", err);
    return [];
  }
}

async function computeSectionChainageProgress(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  sectionId: string,
  scopeRanges: ChainageScopeRange[] | null
): Promise<SectionProgressData | null> {
  const [{ data: section }, { data: pipesRaw }] = await Promise.all([
    supabase
      .from("drainer_sections")
      .select("start_ch, end_ch, direction, crew_id")
      .eq("id", sectionId)
      .maybeSingle(),
    supabase
      .from("drainer_pipe_records")
      .select("chainage, date_installed")
      .eq("section_id", sectionId)
      .not("chainage", "is", null),
  ]);
  if (!section) return null;

  const startCh = Number(section.start_ch) || 0;
  const endCh = Number(section.end_ch) || 0;
  const direction = section.direction === "backwards";
  const crewId = (section as { crew_id?: string | null }).crew_id ?? null;
  const totalSectionLength = Math.abs(startCh - endCh);
  if (totalSectionLength <= 0) return null;

  const mergedScopes =
    scopeRanges && scopeRanges.length > 0 ? normalizeChainageRanges(scopeRanges) : null;

  const pipes = (pipesRaw ?? []).filter((p) => {
    const ch = Number((p as { chainage?: unknown }).chainage);
    if (Number.isNaN(ch)) return false;
    if (!mergedScopes || mergedScopes.length === 0) return true;
    return chainageInRanges(ch, mergedScopes);
  });

  const scopeChainageLo =
    mergedScopes && mergedScopes.length > 0
      ? Math.min(...mergedScopes.map((r) => r.min))
      : Math.min(startCh, endCh);
  const scopeChainageHi =
    mergedScopes && mergedScopes.length > 0
      ? Math.max(...mergedScopes.map((r) => r.max))
      : Math.max(startCh, endCh);

  if (!pipes.length) {
    if (!mergedScopes || mergedScopes.length === 0) return null;
    return {
      sectionId,
      installedChainage: direction ? endCh : startCh,
      finalChainage: endCh,
      pspLodgedUpToChainage: null,
      percent: 0,
      pipeCount: 0,
      avgPipesPerDay: 0,
      scopeChainageLo: Math.round(scopeChainageLo * 10) / 10,
      scopeChainageHi: Math.round(scopeChainageHi * 10) / 10,
    };
  }

  const chainages = pipes.map((p) => Number((p as { chainage?: unknown }).chainage)).filter((n) => !isNaN(n));
  const minCh = Math.min(...chainages);
  const maxCh = Math.max(...chainages);

  let totalLength: number;
  let metresCovered: number;
  let installedChainage: number;
  const finalChainage = endCh;

  if (!mergedScopes || mergedScopes.length === 0) {
    totalLength = totalSectionLength;
    metresCovered = direction ? startCh - minCh : maxCh - startCh;
    installedChainage = direction ? minCh : maxCh;
  } else {
    totalLength = mergedScopes.reduce((s, r) => s + (r.max - r.min), 0);
    if (totalLength <= 0) return null;
    metresCovered = 0;
    for (const r of mergedScopes) {
      const inRange = pipes.filter((p) => {
        const ch = Number((p as { chainage?: unknown }).chainage);
        return !Number.isNaN(ch) && ch >= r.min && ch <= r.max;
      });
      if (inRange.length === 0) continue;
      if (direction) {
        const minR = Math.min(...inRange.map((p) => Number((p as { chainage?: unknown }).chainage)));
        metresCovered += Math.max(0, r.max - Math.max(r.min, minR));
        installedChainage = minCh;
      } else {
        const maxR = Math.max(...inRange.map((p) => Number((p as { chainage?: unknown }).chainage)));
        metresCovered += Math.max(0, Math.min(r.max, maxR) - r.min);
        installedChainage = maxCh;
      }
    }
    if (!direction) installedChainage = maxCh;
    else installedChainage = minCh;
  }

  const percent = Math.min(100, Math.round((metresCovered / totalLength) * 100));
  const workedDays = new Set(
    pipes.map((p) => (p as { date_installed?: string | null }).date_installed).filter((d): d is string => !!d)
  ).size;
  const avgPipesPerDay =
    workedDays > 0 ? Math.round((pipes.length / workedDays) * 10) / 10 : 0;

  const pspLocationIds = await getPspLocationIdsForSection(supabase, sectionId, crewId);
  let pspLodgedUpToChainage: number | null = null;
  if (pspLocationIds.length > 0) {
    const { data: pspRows } = await supabase
      .from("psp_records")
      .select("chainage, location_id")
      .in("location_id", pspLocationIds)
      .not("chainage", "is", null);
    let pspChainages = (pspRows ?? [])
      .map((r) => Number((r as { chainage?: unknown }).chainage))
      .filter((n) => !isNaN(n));
    if (mergedScopes && mergedScopes.length > 0) {
      pspChainages = pspChainages.filter((ch) => chainageInRanges(ch, mergedScopes));
    }
    if (pspChainages.length > 0) {
      pspLodgedUpToChainage = direction
        ? Math.min(...pspChainages)
        : Math.max(...pspChainages);
    }
  }

  return {
    sectionId,
    installedChainage: Math.round(installedChainage * 10) / 10,
    finalChainage,
    pspLodgedUpToChainage:
      pspLodgedUpToChainage != null ? Math.round(pspLodgedUpToChainage * 10) / 10 : null,
    percent,
    pipeCount: pipes.length,
    avgPipesPerDay,
    pipeMinCh: Math.round(minCh * 10) / 10,
    pipeMaxCh: Math.round(maxCh * 10) / 10,
    scopeChainageLo: Math.round(scopeChainageLo * 10) / 10,
    scopeChainageHi: Math.round(scopeChainageHi * 10) / 10,
  };
}

export async function getSectionChainageProgress(
  sectionId: string,
  scopeRanges?: ChainageScopeRange[] | null
): Promise<SectionProgressData | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createAdminClient();
    if (!supabase) return null;
    return computeSectionChainageProgress(supabase, sectionId, scopeRanges ?? null);
  } catch (err) {
    console.error("[Dashboard] getSectionChainageProgress failed:", err);
    return null;
  }
}

/** Combine multiple OnSite-D scopes (sections and/or subsection chainage windows) into one summary. */
export async function getAggregatedSectionProgress(
  scopes: SectionProgressScope[]
): Promise<SectionProgressData | null> {
  if (!hasSupabaseEnv() || scopes.length === 0) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  try {
    const entries: { scope: SectionProgressScope; progress: SectionProgressData }[] = [];
    for (const s of scopes) {
      const p = await computeSectionChainageProgress(supabase, s.sectionId, s.ranges);
      if (p) entries.push({ scope: s, progress: p });
    }
    if (entries.length === 0) return null;
    if (entries.length === 1) {
      return scopes.length > 1
        ? { ...entries[0].progress, isAggregated: true }
        : entries[0].progress;
    }

    const parts = entries.map((e) => e.progress);
    const totalPipes = parts.reduce((a, p) => a + p.pipeCount, 0);
    const weightedAvg =
      totalPipes > 0
        ? parts.reduce((a, p) => a + p.avgPipesPerDay * p.pipeCount, 0) / totalPipes
        : 0;
    const plannedLengths = await Promise.all(
      entries.map(async ({ scope: sc }) => {
        const { data: sec } = await supabase
          .from("drainer_sections")
          .select("start_ch, end_ch")
          .eq("id", sc.sectionId)
          .maybeSingle();
        if (!sec) return 0;
        const a = Number(sec.start_ch);
        const b = Number(sec.end_ch);
        const full = Math.abs(a - b);
        if (sc.ranges && sc.ranges.length > 0) {
          const m = normalizeChainageRanges(sc.ranges);
          return m.reduce((s, r) => s + (r.max - r.min), 0);
        }
        return full;
      })
    );
    const coveredSum = parts.reduce(
      (a, p, i) => a + (plannedLengths[i] ?? 0) * (p.percent / 100),
      0
    );
    const plannedTotal = plannedLengths.reduce((a, b) => a + b, 0);
    const percent =
      plannedTotal > 0 ? Math.min(100, Math.round((coveredSum / plannedTotal) * 100)) : 0;

    const pipeMins = parts
      .map((p) => p.pipeMinCh)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const pipeMaxs = parts
      .map((p) => p.pipeMaxCh)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const scopeLos = parts
      .map((p) => p.scopeChainageLo)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const scopeHis = parts
      .map((p) => p.scopeChainageHi)
      .filter((v): v is number => v != null && Number.isFinite(v));

    const pipeMinAgg = pipeMins.length ? Math.min(...pipeMins) : undefined;
    const pipeMaxAgg = pipeMaxs.length ? Math.max(...pipeMaxs) : undefined;
    const scopeLoAgg = scopeLos.length ? Math.min(...scopeLos) : undefined;
    const scopeHiAgg = scopeHis.length ? Math.max(...scopeHis) : undefined;

    const pspVals = parts
      .map((p) => p.pspLodgedUpToChainage)
      .filter((v): v is number => v != null && Number.isFinite(v));
    let pspMinAgg: number | undefined;
    let pspMaxAgg: number | undefined;
    if (pspVals.length > 0) {
      pspMinAgg = Math.min(...pspVals);
      pspMaxAgg = Math.max(...pspVals);
    }
    const pspSingle =
      pspMinAgg != null &&
      pspMaxAgg != null &&
      Math.abs(pspMinAgg - pspMaxAgg) < 0.05
        ? Math.round(pspMinAgg * 10) / 10
        : null;

    return {
      sectionId: parts.map((p) => p.sectionId).join(","),
      installedChainage:
        pipeMaxAgg != null ? Math.round(pipeMaxAgg * 10) / 10 : 0,
      finalChainage: scopeHiAgg != null ? Math.round(scopeHiAgg * 10) / 10 : 0,
      pspLodgedUpToChainage: pspSingle,
      pspLodgedMinCh:
        pspMinAgg != null ? Math.round(pspMinAgg * 10) / 10 : undefined,
      pspLodgedMaxCh:
        pspMaxAgg != null ? Math.round(pspMaxAgg * 10) / 10 : undefined,
      percent,
      pipeCount: totalPipes,
      avgPipesPerDay: Math.round(weightedAvg * 10) / 10,
      isAggregated: true,
      pipeMinCh: pipeMinAgg != null ? Math.round(pipeMinAgg * 10) / 10 : undefined,
      pipeMaxCh: pipeMaxAgg != null ? Math.round(pipeMaxAgg * 10) / 10 : undefined,
      scopeChainageLo: scopeLoAgg != null ? Math.round(scopeLoAgg * 10) / 10 : undefined,
      scopeChainageHi: scopeHiAgg != null ? Math.round(scopeHiAgg * 10) / 10 : undefined,
    };
  } catch (err) {
    console.error("[Dashboard] getAggregatedSectionProgress failed:", err);
    return null;
  }
}

function dailyToHourlyPipes(total: number): HourlyPipeProgress[] {
  const hours = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];
  return hours.map((hour, i) => {
    const frac = (i + 1) / hours.length;
    return { hour, pipes: Math.round(total * frac * 10) / 10 };
  });
}

function dailyToHourlyMetres(total: number): HourlyBackfillProgress[] {
  const hours = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];
  return hours.map((hour, i) => {
    const frac = (i + 1) / hours.length;
    return { hour, metres: Math.round(total * frac * 10) / 10 };
  });
}

// --- MOCKS (fallback on error or missing env) ---
const MOCK_HOURLY_PIPES: HourlyPipeProgress[] = [
  { hour: "07", pipes: 0 }, { hour: "08", pipes: 2 }, { hour: "09", pipes: 5 },
  { hour: "10", pipes: 9 }, { hour: "11", pipes: 12 }, { hour: "12", pipes: 14 },
  { hour: "13", pipes: 15 }, { hour: "14", pipes: 17 }, { hour: "15", pipes: 18 },
  { hour: "16", pipes: 20 }, { hour: "17", pipes: 22 },
];
const MOCK_HOURLY_BACKFILL: HourlyBackfillProgress[] = [
  { hour: "07", metres: 0 }, { hour: "08", metres: 8 }, { hour: "09", metres: 18 },
  { hour: "10", metres: 30 }, { hour: "11", metres: 42 }, { hour: "12", metres: 50 },
  { hour: "13", metres: 55 }, { hour: "14", metres: 62 }, { hour: "15", metres: 70 },
  { hour: "16", metres: 75 }, { hour: "17", metres: 80 },
];
const MOCK_WATER_BY_TASK: WaterByActivity[] = [
  { activity: "Pipe jointing", litres: 12000 }, { activity: "Dust suppression", litres: 8000 },
  { activity: "Testing", litres: 5000 }, { activity: "Other", litres: 3000 },
];
const MOCK_DAY_VALUES: DayValue[] = [
  { day: "Mon 3", value: 18 }, { day: "Tue 4", value: 22 }, { day: "Wed 5", value: 20 },
  { day: "Thu 6", value: 16 }, { day: "Fri 7", value: 24 },
];

function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SECRET_SUPABASE_SERVICE_ROLE_KEY;
  /* Dashboard server queries use the admin client; anon alone would crash createClient */
  return !!(url && anon && service);
}

// --- 1. PIPES TODAY (drainer_pipe_records, date_installed, section_id → crew) ---
export async function fetchPipesToday(
  crewId?: string | null,
  date?: string
): Promise<{ data: { count: number; meters: number }; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: { count: 22, meters: 22 * PIPE_LENGTH_M }, isMock: true };
  }
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return { data: { count: 22, meters: 22 * PIPE_LENGTH_M }, isMock: true };
    }
    const targetDate = getTargetDate(date);
    let sectionIds: string[] = [];
    if (crewId) sectionIds = await getSectionIdsForCrew(crewId);

    let pipeQuery = supabase
      .from("drainer_pipe_records")
      .select("id", { count: "exact", head: true })
      .eq("date_installed", targetDate);
    if (sectionIds.length > 0) pipeQuery = pipeQuery.in("section_id", sectionIds);

    const { count, error } = await pipeQuery;
    if (error) throw error;
    const pipeCount = count ?? 0;
    return { data: { count: pipeCount, meters: pipeCount * PIPE_LENGTH_M }, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchPipesToday failed:", error);
    return { data: { count: 22, meters: 22 * PIPE_LENGTH_M }, isMock: true };
  }
}

// --- 2. BACKFILL TODAY (psp_records, recorded_at → distinct chainage count × 20 m) ---
export async function fetchBackfillToday(
  crewId?: string | null,
  date?: string
): Promise<{ data: { meters: number }; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: { meters: 80 }, isMock: true };
  }
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return { data: { meters: 80 }, isMock: true };
    }
    const targetDate = getTargetDate(date);
    const { start, end } = dayStartEndPerth(targetDate);

    let pspQuery = supabase
      .from("psp_records")
      .select("recorded_at, chainage, location_id")
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .not("chainage", "is", null);

    if (crewId) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id")
        .eq("location_type", "psp")
        .eq("crew_id", crewId);
      const locIds = locs?.map((l) => l.id) ?? [];
      if (locIds.length > 0) pspQuery = pspQuery.in("location_id", locIds);
    }

    const { data: rows, error } = await pspQuery;
    if (error) throw error;

    const byDay = calculateDailyBackfillFromRecords(rows ?? [], [targetDate]);
    const meters = byDay[targetDate] ?? 0;
    return { data: { meters }, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchBackfillToday failed:", error);
    return { data: { meters: 80 }, isMock: true };
  }
}

// --- 3. WATER TODAY (wc_water_logs + wc_tasks, created_at, volume_liters) ---
export async function fetchWaterToday(
  crewCode?: string | null,
  date?: string
): Promise<{ data: { totalKL: number }; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: { totalKL: 28 }, isMock: true };
  }
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return { data: { totalKL: 28 }, isMock: true };
    }
    const { start, end } = dayStartEndPerth(date);

    let query = supabase
      .from("wc_water_logs")
      .select("volume_liters")
      .gte("created_at", start)
      .lte("created_at", end);
    if (crewCode) {
      const crewId = await getCrewId(crewCode);
      if (!crewId) {
        return { data: { totalKL: 0 }, isMock: false };
      }
      const vehicleIds = await getVehicleIdsForCrew(crewId);
      if (vehicleIds.length > 0) {
        query = query.or(
          `crew_id.eq.${crewId},and(crew_id.is.null,vehicle_id.in.(${vehicleIds.join(",")}))`
        );
      } else {
        query = query.eq("crew_id", crewId);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const totalL = (rows ?? []).reduce(
      (sum, r) => sum + (Number((r as { volume_liters?: number }).volume_liters) || 0),
      0
    );
    const totalKL = Math.round((totalL / 1000) * 10) / 10;
    return { data: { totalKL }, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchWaterToday failed:", error);
    return { data: { totalKL: 28 }, isMock: true };
  }
}

// --- 4. WATER BY TASK (wc_water_logs JOIN wc_tasks) ---
export async function fetchWaterByTask(
  crewCode?: string | null,
  date?: string
): Promise<{ data: WaterByActivity[]; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: MOCK_WATER_BY_TASK, isMock: true };
  }
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return { data: MOCK_WATER_BY_TASK, isMock: true };
    }
    const { start, end } = dayStartEndPerth(date);

    let query = supabase
      .from("wc_water_logs")
      .select("volume_liters, task_id, wc_tasks(name)")
      .gte("created_at", start)
      .lte("created_at", end);
    if (crewCode) {
      const crewId = await getCrewId(crewCode);
      if (!crewId) {
        return { data: [], isMock: false };
      }
      const vehicleIds = await getVehicleIdsForCrew(crewId);
      if (vehicleIds.length > 0) {
        query = query.or(
          `crew_id.eq.${crewId},and(crew_id.is.null,vehicle_id.in.(${vehicleIds.join(",")}))`
        );
      } else {
        query = query.eq("crew_id", crewId);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const byTask: Record<string, number> = {};
    for (const r of rows ?? []) {
      const litres = Number((r as { volume_liters?: number }).volume_liters) || 0;
      const task = (r as { wc_tasks?: { name?: string } | null }).wc_tasks;
      const name = task?.name ?? "Other";
      byTask[name] = (byTask[name] ?? 0) + litres;
    }

    const result = Object.entries(byTask).map(([activity, litres]) => ({ activity, litres }));
    return { data: result, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchWaterByTask failed:", error);
    return { data: MOCK_WATER_BY_TASK, isMock: true };
  }
}

// --- 5. LAST 5 WORKING DAYS ---
export async function getLast5DaysPipes(
  crewId?: string | null
): Promise<DayValue[]> {
  if (!hasSupabaseEnv()) return MOCK_DAY_VALUES;
  try {
    const supabase = createAdminClient();
    if (!supabase) return MOCK_DAY_VALUES;
    const days = getLastNWorkingDays(5);
    const start = days[0];
    const end = days[days.length - 1];

    let query = supabase
      .from("drainer_pipe_records")
      .select("date_installed")
      .gte("date_installed", start)
      .lte("date_installed", end);

    if (crewId) {
      const sectionIds = await getSectionIdsForCrew(crewId);
      if (sectionIds.length > 0) query = query.in("section_id", sectionIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const byDay: Record<string, number> = {};
    for (const r of data ?? []) {
      const d = (r as { date_installed?: string }).date_installed;
      if (d && days.includes(d)) byDay[d] = (byDay[d] ?? 0) + 1;
    }
    return days.map((d) => ({ day: dayToLabel(d), value: byDay[d] ?? 0 }));
  } catch (error) {
    console.error("[Dashboard] getLast5DaysPipes failed:", error);
    return MOCK_DAY_VALUES;
  }
}

export async function getLast5DaysBackfill(
  crewId?: string | null
): Promise<DayValue[]> {
  if (!hasSupabaseEnv()) return MOCK_DAY_VALUES.map((d) => ({ ...d, value: 80 }));
  try {
    const supabase = createAdminClient();
    if (!supabase) return MOCK_DAY_VALUES.map((d) => ({ ...d, value: 80 }));
    const days = getLastNWorkingDays(5);
    const { start: startTs } = dayStartEndPerth(days[0]);
    const { end: endTs } = dayStartEndPerth(days[days.length - 1]);

    let pspQuery = supabase
      .from("psp_records")
      .select("recorded_at, chainage, location_id")
      .gte("recorded_at", startTs)
      .lte("recorded_at", endTs)
      .not("chainage", "is", null);

    if (crewId) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id")
        .eq("location_type", "psp")
        .eq("crew_id", crewId);
      const locIds = locs?.map((l) => l.id) ?? [];
      if (locIds.length > 0) pspQuery = pspQuery.in("location_id", locIds);
    }

    const { data: rows, error } = await pspQuery;
    if (error) throw error;

    const byDay = calculateDailyBackfillFromRecords(rows ?? [], days);
    return days.map((d) => ({ day: dayToLabel(d), value: byDay[d] ?? 0 }));
  } catch (error) {
    console.error("[Dashboard] getLast5DaysBackfill failed:", error);
    return MOCK_DAY_VALUES.map((d) => ({ ...d, value: 80 }));
  }
}

// --- 6. HOURLY PROGRESS (derived from daily totals) ---
export async function getTodayPipeProgress(
  crewId?: string | null,
  date?: string
): Promise<HourlyPipeProgress[]> {
  const res = await fetchPipesToday(crewId, date);
  if (res.isMock) return MOCK_HOURLY_PIPES;
  return dailyToHourlyPipes(res.data.count);
}

export async function getTodayBackfillProgress(
  crewId?: string | null,
  date?: string
): Promise<HourlyBackfillProgress[]> {
  const res = await fetchBackfillToday(crewId, date);
  if (res.isMock) return MOCK_HOURLY_BACKFILL;
  return dailyToHourlyMetres(res.data.meters);
}

export async function getTodayWaterByActivity(
  crewCode?: string | null,
  date?: string
): Promise<WaterByActivity[]> {
  const res = await fetchWaterByTask(crewCode, date);
  return res.data;
}

/** Vehicles defined in wc_vehicles with at least one wc_water_logs record on the given day.
 * Returns a comma-separated list of vehicle names/IDs.
 */
export async function getActiveVehicleCount(
  crewCode?: string | null,
  date?: string
): Promise<string> {
  if (!hasSupabaseEnv()) return "";
  try {
    const supabase = createAdminClient();
    if (!supabase) return "";
    const { start, end } = dayStartEndPerth(date);

    // 1) Get all active vehicles (by id). Support both schemas:
    // - new: wc_vehicles.is_active
    // - legacy: wc_vehicles.active
    let vehicles: Array<{ id?: string | null; name?: string | null }> | null = null;
    {
      const { data, error } = await supabase
        .from("wc_vehicles")
        .select("id, name, is_active")
        .eq("is_active", true);
      if (!error) {
        vehicles = data as Array<{ id?: string | null; name?: string | null }>;
      } else if (error.code === "42703") {
        const legacy = await supabase
          .from("wc_vehicles")
          .select("id, name, active")
          .eq("active", true);
        if (legacy.error) throw legacy.error;
        vehicles = legacy.data as Array<{ id?: string | null; name?: string | null }>;
      } else {
        throw error;
      }
    }

    const vehicleIds = Array.from(
      new Set(
        (vehicles ?? [])
          .map((v) => (v as { id?: string | null }).id)
          .filter((id): id is string => !!id)
      )
    );
    if (!vehicleIds.length) return "";

    const vehicleNameMap = new Map<string, string>();
    for (const v of vehicles ?? []) {
      const id = (v as { id?: string | null }).id;
      const name = (v as { name?: string | null }).name;
      if (id) vehicleNameMap.set(id, name || id);
    }

    // 2) Logs for those vehicles on the given day (and crew if provided)
    let logsQuery = supabase
      .from("wc_water_logs")
      .select("vehicle_id")
      .gte("created_at", start)
      .lte("created_at", end)
      .in("vehicle_id", vehicleIds);
    if (crewCode) {
      const crewId = await getCrewId(crewCode);
      if (!crewId) return "";
      // Include legacy/unassigned rows where crew_id is null but vehicle belongs to crew
      logsQuery = logsQuery.or(
        `crew_id.eq.${crewId},crew_id.is.null`
      );
    }

    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) throw logsError;

    const active = new Set(
      (logs ?? [])
        .map((r) => (r as { vehicle_id?: string | null }).vehicle_id)
        .filter((id): id is string => !!id)
    );
    const labels = Array.from(active).map((id) => vehicleNameMap.get(id) ?? id);
    return labels.join(", ");
  } catch (err) {
    console.error("[Dashboard] getActiveVehicleCount failed:", err);
    return "";
  }
}

// --- CURRENT MONTH DAILY PROGRESS ---
export async function getCurrentMonthDailyProgress(
  crewId?: string | null
): Promise<MonthlyDayValue[]> {
  const today = getTodayPerth();
  const now = new Date();
  const firstStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const workingDays = getWorkingDaysInRange(firstStr, today);

  if (!hasSupabaseEnv()) {
    return workingDays.map((d, i) => ({
      date: d,
      label: dayToLabel(d),
      pipeMetres: 20 * PIPE_LENGTH_M,
      backfillMetres: 70,
      pipeMetresCumulative: (i + 1) * 20 * PIPE_LENGTH_M,
      backfillMetresCumulative: (i + 1) * 70,
    }));
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return workingDays.map((d, i) => ({
        date: d,
        label: dayToLabel(d),
        pipeMetres: 20 * PIPE_LENGTH_M,
        backfillMetres: 70,
        pipeMetresCumulative: (i + 1) * 20 * PIPE_LENGTH_M,
        backfillMetresCumulative: (i + 1) * 70,
      }));
    }
    let sectionIds: string[] = [];
    if (crewId) sectionIds = await getSectionIdsForCrew(crewId);

    const { start: startTs } = dayStartEndPerth(workingDays[0]);
    const { end: endTs } = dayStartEndPerth(workingDays[workingDays.length - 1]);

    let pipeQuery = supabase
      .from("drainer_pipe_records")
      .select("date_installed")
      .gte("date_installed", workingDays[0])
      .lte("date_installed", workingDays[workingDays.length - 1]);
    if (sectionIds.length > 0) pipeQuery = pipeQuery.in("section_id", sectionIds);

    const { data: pipeRows, error: pipeErr } = await pipeQuery;
    if (pipeErr) throw pipeErr;

    const pipeByDay: Record<string, number> = {};
    for (const r of pipeRows ?? []) {
      const d = (r as { date_installed?: string }).date_installed;
      if (d && workingDays.includes(d)) {
        pipeByDay[d] = (pipeByDay[d] ?? 0) + 1;
      }
    }

    let pspQuery = supabase
      .from("psp_records")
      .select("recorded_at, chainage, location_id")
      .gte("recorded_at", startTs)
      .lte("recorded_at", endTs)
      .not("chainage", "is", null);
    if (crewId) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id")
        .eq("location_type", "psp")
        .eq("crew_id", crewId);
      const locIds = locs?.map((l) => l.id) ?? [];
      if (locIds.length > 0) pspQuery = pspQuery.in("location_id", locIds);
    }

    const { data: pspRows, error: pspErr } = await pspQuery;
    if (pspErr) throw pspErr;

    let pipeCum = 0;
    let prevBackfillCum = 0;
    const result = workingDays.map((d) => {
      const pipeM = Math.round(((pipeByDay[d] ?? 0) * PIPE_LENGTH_M) * 10) / 10;
      pipeCum += pipeM;
      const mockBackfillCum = Math.max(0, Math.round((pipeCum - 25) * 10) / 10);
      const backfillM = Math.max(0, Math.round((mockBackfillCum - prevBackfillCum) * 10) / 10);
      prevBackfillCum = mockBackfillCum;
      return {
        date: d,
        label: dayToLabel(d),
        pipeMetres: pipeM,
        backfillMetres: backfillM,
        pipeMetresCumulative: Math.round(pipeCum * 10) / 10,
        backfillMetresCumulative: mockBackfillCum,
      };
    });
    return result;
  } catch (error) {
    console.error("[Dashboard] getCurrentMonthDailyProgress failed:", error);
    return workingDays.map((d, i) => ({
      date: d,
      label: dayToLabel(d),
      pipeMetres: 20 * PIPE_LENGTH_M,
      backfillMetres: 70,
      pipeMetresCumulative: (i + 1) * 20 * PIPE_LENGTH_M,
      backfillMetresCumulative: (i + 1) * 70,
    }));
  }
}

// --- HISTORIC MONTHLY PROGRESS (last 6 months by location/crew) ---
export async function getHistoricMonthlyProgress(
  crewId?: string | null
): Promise<MonthlyDayValue[]> {
  const today = getTodayPerth();
  const months: { first: string; last: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today + "T12:00:00");
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const first = `${y}-${m}-01`;
    const lastDay = new Date(y, d.getMonth() + 1, 0);
    const last = `${y}-${m}-${String(lastDay.getDate()).padStart(2, "0")}`;
    months.push({ first, last, label: lastDay.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }) });
  }

  if (!hasSupabaseEnv()) {
    return months.map((mo, i) => ({
      date: mo.first,
      label: mo.label,
      pipeMetres: 400,
      backfillMetres: 1400,
      pipeMetresCumulative: (i + 1) * 400,
      backfillMetresCumulative: (i + 1) * 1400,
    }));
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return months.map((mo, i) => ({
        date: mo.first,
        label: mo.label,
        pipeMetres: 400,
        backfillMetres: 1400,
        pipeMetresCumulative: (i + 1) * 400,
        backfillMetresCumulative: (i + 1) * 1400,
      }));
    }
    let sectionIds: string[] = [];
    if (crewId) sectionIds = await getSectionIdsForCrew(crewId);

    const result: MonthlyDayValue[] = [];
    let pipeCum = 0;
    let backfillCum = 0;

    for (const mo of months) {
      const workingDays = getWorkingDaysInRange(mo.first, mo.last);
      const { start: startTs } = dayStartEndPerth(workingDays[0] ?? mo.first);
      const { end: endTs } = dayStartEndPerth(workingDays[workingDays.length - 1] ?? mo.last);

      let pipeQuery = supabase
        .from("drainer_pipe_records")
        .select("date_installed")
        .gte("date_installed", mo.first)
        .lte("date_installed", mo.last);
      if (sectionIds.length > 0) pipeQuery = pipeQuery.in("section_id", sectionIds);
      const { data: pipeRows } = await pipeQuery;

      let pspQuery = supabase
        .from("psp_records")
        .select("recorded_at, chainage, location_id")
        .gte("recorded_at", startTs)
        .lte("recorded_at", endTs)
        .not("chainage", "is", null);
      if (crewId) {
        const { data: locs } = await supabase
          .from("locations")
          .select("id")
          .eq("location_type", "psp")
          .eq("crew_id", crewId);
        const locIds = locs?.map((l) => l.id) ?? [];
        if (locIds.length > 0) pspQuery = pspQuery.in("location_id", locIds);
      }
      const { data: pspRows } = await pspQuery;

      const pipeByDay: Record<string, number> = {};
      for (const r of pipeRows ?? []) {
        const d = (r as { date_installed?: string }).date_installed;
        if (d && workingDays.includes(d)) pipeByDay[d] = (pipeByDay[d] ?? 0) + 1;
      }
      const pipeM = Object.values(pipeByDay).reduce((s, c) => s + c * PIPE_LENGTH_M, 0);
      const backfillByDay = calculateDailyBackfillFromRecords(pspRows ?? [], workingDays);
      const backfillM = Object.values(backfillByDay).reduce((s, v) => s + v, 0);

      pipeCum += Math.round(pipeM * 10) / 10;
      backfillCum += Math.round(backfillM * 10) / 10;

      result.push({
        date: mo.first,
        label: mo.label,
        pipeMetres: Math.round(pipeM * 10) / 10,
        backfillMetres: Math.round(backfillM * 10) / 10,
        pipeMetresCumulative: Math.round(pipeCum * 10) / 10,
        backfillMetresCumulative: Math.round(backfillCum * 10) / 10,
      });
    }
    return result;
  } catch (err) {
    console.error("[Dashboard] getHistoricMonthlyProgress failed:", err);
    return months.map((mo, i) => ({
      date: mo.first,
      label: mo.label,
      pipeMetres: 400,
      backfillMetres: 1400,
      pipeMetresCumulative: (i + 1) * 400,
      backfillMetresCumulative: (i + 1) * 1400,
    }));
  }
}

// --- CHAINAGE PROGRESS (pipe vs backfill by chainage) ---
export async function getChainageProgressData(
  crewId?: string | null
): Promise<ChainageProgressValue[]> {
  const monthlyProgress = await getCurrentMonthDailyProgress(crewId);
  if (!monthlyProgress.length) return [];
  const baseProgress = monthlyProgress.slice(-5);
  if (!baseProgress.length) return [];

  if (!hasSupabaseEnv()) {
    return baseProgress.map((r, i) => ({
      date: r.date,
      label: r.label,
      pipeChainage: r.pipeMetresCumulative,
      backfillChainage: r.backfillMetresCumulative,
    }));
  }

  try {
    return baseProgress.map((r) => ({
      date: r.date,
      label: r.label,
      pipeChainage: r.pipeMetresCumulative,
      backfillChainage: r.backfillMetresCumulative,
    }));
  } catch (err) {
    console.error("[Dashboard] getChainageProgressData failed:", err);
    return baseProgress.map((r) => ({
      date: r.date,
      label: r.label,
      pipeChainage: 0,
      backfillChainage: 0,
    }));
  }
}

export async function getHistoricChainageProgressData(
  crewId?: string | null
): Promise<ChainageProgressValue[]> {
  const historicMonthly = await getHistoricMonthlyProgress(crewId);
  if (!historicMonthly.length) return [];

  if (!hasSupabaseEnv()) {
    const initial = 2400;
    return historicMonthly.map((r) => ({
      date: r.date,
      label: r.label,
      pipeChainage: Math.round((initial - r.pipeMetresCumulative) * 10) / 10,
      backfillChainage: Math.round((initial - r.backfillMetresCumulative * 0.5) * 10) / 10,
    }));
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      const initial = 2400;
      return historicMonthly.map((r) => ({
        date: r.date,
        label: r.label,
        pipeChainage: Math.round((initial - r.pipeMetresCumulative) * 10) / 10,
        backfillChainage: Math.round((initial - r.backfillMetresCumulative * 0.5) * 10) / 10,
      }));
    }
    const maxPipe = Math.max(...historicMonthly.map((r) => r.pipeMetresCumulative));
    const initialChainage = maxPipe + 200;
    const result: ChainageProgressValue[] = [];
    let runningMinBackfill = initialChainage;

    for (const mo of historicMonthly) {
      const [y, m] = [mo.date.slice(0, 4), mo.date.slice(5, 7)];
      const lastDay = new Date(+y, +m, 0);
      const lastStr = `${y}-${m}-${String(lastDay.getDate()).padStart(2, "0")}`;
      const workingDays = getWorkingDaysInRange(mo.date, lastStr);
      if (!workingDays.length) {
        result.push({ date: mo.date, label: mo.label, pipeChainage: initialChainage - mo.pipeMetresCumulative, backfillChainage: runningMinBackfill });
        continue;
      }
      const { start: startTs } = dayStartEndPerth(workingDays[0]);
      const { end: endTs } = dayStartEndPerth(workingDays[workingDays.length - 1]);

      let pspQuery = supabase
        .from("psp_records")
        .select("recorded_at, chainage, location_id")
        .gte("recorded_at", startTs)
        .lte("recorded_at", endTs)
        .not("chainage", "is", null);
      if (crewId) {
        const { data: locs } = await supabase
          .from("locations")
          .select("id")
          .eq("location_type", "psp")
          .eq("crew_id", crewId);
        const locIds = locs?.map((l) => l.id) ?? [];
        if (locIds.length > 0) pspQuery = pspQuery.in("location_id", locIds);
      }
      const { data: pspRows } = await pspQuery;

      const chainages = (pspRows ?? [])
        .map((r) => Number((r as { chainage?: unknown }).chainage))
        .filter((n) => !isNaN(n) && n > 0);
      if (chainages.length) runningMinBackfill = Math.min(runningMinBackfill, ...chainages);

      result.push({
        date: mo.date,
        label: mo.label,
        pipeChainage: Math.round((initialChainage - mo.pipeMetresCumulative) * 10) / 10,
        backfillChainage: Math.round(runningMinBackfill * 10) / 10,
      });
    }
    return result;
  } catch (err) {
    console.error("[Dashboard] getHistoricChainageProgressData failed:", err);
    const initial = 2400;
    return historicMonthly.map((r) => ({
      date: r.date,
      label: r.label,
      pipeChainage: Math.round((initial - r.pipeMetresCumulative) * 10) / 10,
      backfillChainage: Math.round((initial - r.backfillMetresCumulative * 0.5) * 10) / 10,
    }));
  }
}
