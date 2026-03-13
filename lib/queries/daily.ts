import { createClient } from "@/lib/supabase/server";
import { getLastNWorkingDays } from "@/lib/utils/workingDays";
import { PIPE_LENGTH_M } from "@/lib/constants";

export type HourlyPipeProgress = { hour: string; pipes: number };
export type HourlyBackfillProgress = { hour: string; metres: number };
export type WaterByActivity = { activity: string; litres: number };
export type DayValue = { day: string; value: number };

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTargetDate(date?: string): string {
  return date ?? getToday();
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

function dayToLabel(d: string): string {
  const dt = new Date(d + "T12:00:00");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${names[dt.getDay()]} ${dt.getDate()}`;
}

export async function getCrewId(crewName: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crews")
    .select("id")
    .eq("name", crewName)
    .maybeSingle();
  return data?.id ?? null;
}

async function getSectionIdsForCrew(crewId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drainer_sections")
    .select("id")
    .eq("crew_id", crewId);
  return data?.map((s) => s.id) ?? [];
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
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
    const supabase = await createClient();
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

// --- 2. BACKFILL TODAY (psp_records, recorded_at, chainage diff per location/day) ---
export async function fetchBackfillToday(
  crewId?: string | null,
  date?: string
): Promise<{ data: { meters: number }; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: { meters: 80 }, isMock: true };
  }
  try {
    const supabase = await createClient();
    const { start, end } = dayStartEndUtc(date);

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

    const byDayLoc: Record<string, Record<string, number[]>> = {};
    for (const r of rows ?? []) {
      const day = String((r as { recorded_at?: string }).recorded_at).split("T")[0];
      const locId = (r as { location_id?: string }).location_id;
      const chainage = Number((r as { chainage?: unknown }).chainage);
      if (!day || !locId || isNaN(chainage)) continue;
      if (!byDayLoc[day]) byDayLoc[day] = {};
      if (!byDayLoc[day][locId]) byDayLoc[day][locId] = [];
      byDayLoc[day][locId].push(chainage);
    }

    let totalM = 0;
    for (const locs of Object.values(byDayLoc)) {
      for (const chainages of Object.values(locs)) {
        if (chainages.length > 0) totalM += Math.max(...chainages) - Math.min(...chainages);
      }
    }
    return { data: { meters: Math.round(totalM * 10) / 10 }, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchBackfillToday failed:", error);
    return { data: { meters: 80 }, isMock: true };
  }
}

// --- 3. WATER TODAY (wc_water_logs + wc_tasks, created_at, volume_liters) ---
export async function fetchWaterToday(
  crewId?: string | null,
  date?: string
): Promise<{ data: { totalKL: number }; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: { totalKL: 28 }, isMock: true };
  }
  try {
    const supabase = await createClient();
    const { start, end } = dayStartEndPerth(date);

    let query = supabase
      .from("wc_water_logs")
      .select("volume_liters")
      .gte("created_at", start)
      .lte("created_at", end);
    if (crewId) query = query.eq("crew_id", crewId);

    const { data: rows, error } = await query;
    if (error) throw error;

    const totalL = (rows ?? []).reduce(
      (sum, r) => sum + (Number((r as { volume_liters?: number }).volume_liters) || 0),
      0
    );
    return { data: { totalKL: Math.round((totalL / 1000) * 10) / 10 }, isMock: false };
  } catch (error) {
    console.error("[Dashboard] fetchWaterToday failed:", error);
    return { data: { totalKL: 28 }, isMock: true };
  }
}

// --- 4. WATER BY TASK (wc_water_logs JOIN wc_tasks) ---
export async function fetchWaterByTask(
  crewId?: string | null,
  date?: string
): Promise<{ data: WaterByActivity[]; isMock: boolean }> {
  if (!hasSupabaseEnv()) {
    return { data: MOCK_WATER_BY_TASK, isMock: true };
  }
  try {
    const supabase = await createClient();
    const { start, end } = dayStartEndPerth(date);

    let query = supabase
      .from("wc_water_logs")
      .select("volume_liters, task_id, wc_tasks(name)")
      .gte("created_at", start)
      .lte("created_at", end);
    if (crewId) query = query.eq("crew_id", crewId);

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
    return { data: result.length ? result : MOCK_WATER_BY_TASK, isMock: false };
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
    const supabase = await createClient();
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
    const supabase = await createClient();
    const days = getLastNWorkingDays(5);
    const start = days[0];
    const end = days[days.length - 1];
    const startTs = `${start}T00:00:00.000Z`;
    const endTs = `${end}T23:59:59.999Z`;

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

    const byDayLoc: Record<string, Record<string, number[]>> = {};
    for (const r of rows ?? []) {
      const day = String((r as { recorded_at?: string }).recorded_at).split("T")[0];
      const locId = (r as { location_id?: string }).location_id;
      const chainage = Number((r as { chainage?: unknown }).chainage);
      if (!day || !locId || isNaN(chainage) || !days.includes(day)) continue;
      if (!byDayLoc[day]) byDayLoc[day] = {};
      if (!byDayLoc[day][locId]) byDayLoc[day][locId] = [];
      byDayLoc[day][locId].push(chainage);
    }

    const byDay: Record<string, number> = {};
    for (const [day, locs] of Object.entries(byDayLoc)) {
      let total = 0;
      for (const chainages of Object.values(locs)) {
        if (chainages.length > 0) total += Math.max(...chainages) - Math.min(...chainages);
      }
      byDay[day] = Math.round(total * 10) / 10;
    }
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
  crewId?: string | null,
  date?: string
): Promise<WaterByActivity[]> {
  const res = await fetchWaterByTask(crewId, date);
  return res.data;
}
