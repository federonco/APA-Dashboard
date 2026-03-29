/**
 * Data View queries — real Supabase data for OnSite-D/B/W tables.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getCrewId, getSectionIdsForCrew } from "@/lib/queries/daily";

function toPerthDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type PipeDataViewRow = {
  date: string;
  time_lodged?: string;
  section: string;
  pipes_laid: number;
  pipe_id: string;
};

export type BackfillDataViewRow = {
  date: string;
  time_lodged?: string;
  section: string;
  backfill_m3: number;
  chainage: number;
};

export type WaterDataViewRow = {
  date: string;
  time_lodged?: string;
  location: string;
  water_litres: number;
  destination: string;
  truck_id?: string;
  task?: string;
};

export async function fetchPipeDataView(
  days: number,
  crewId?: string | null,
  endDate?: string
): Promise<{ data: PipeDataViewRow[]; isMock: boolean }> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return { data: [], isMock: true };
    const end = endDate ? new Date(endDate + "T12:00:00") : new Date();
    const startDate = new Date(end);
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(end);

    let sectionIds: string[] = [];
    if (crewId) sectionIds = await getSectionIdsForCrew(crewId);

    let query = supabase
      .from("drainer_pipe_records")
      .select("id, pipe_fitting_id, date_installed, time_installed, section_id, lodged_at")
      .gte("date_installed", startStr)
      .lte("date_installed", endStr)
      .not("date_installed", "is", null)
      .order("date_installed", { ascending: true });

    if (sectionIds.length > 0) query = query.in("section_id", sectionIds);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return { data: [], isMock: false };

    const uniqueSectionIds = [...new Set(rows.map((r) => r.section_id).filter(Boolean))];
    const { data: sections } = await supabase
      .from("drainer_sections")
      .select("id, name, crew_id")
      .in("id", uniqueSectionIds);
    const sectionMap = new Map((sections ?? []).map((s) => [s.id, { name: s.name ?? "—", crewId: s.crew_id }]));

    const { data: crews } = await supabase.from("crews").select("id, name");
    const crewMap = new Map((crews ?? []).map((c) => [c.id, c.name ?? "—"]));

    const rowsSorted = [...rows].sort((a, b) =>
      String((a as { date_installed?: string }).date_installed ?? "").localeCompare(
        String((b as { date_installed?: string }).date_installed ?? "")
      )
    );

    const result: PipeDataViewRow[] = rowsSorted.map((r) => {
      const date = (r as { date_installed?: string }).date_installed ?? "";
      const ti = (r as { time_installed?: string }).time_installed;
      const la = (r as { lodged_at?: string }).lodged_at;
      let timeLodged = "—";
      if (ti) timeLodged = String(ti).slice(0, 5);
      else if (la) {
        timeLodged = new Date(la).toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Australia/Perth",
        });
      }

      const sid = (r as { section_id?: string }).section_id;
      const secInfo = sid ? sectionMap.get(sid) : null;
      const sectionName = secInfo?.name ?? sid ?? "—";
      const fittingId = (r as { pipe_fitting_id?: string }).pipe_fitting_id;
      const id = fittingId && fittingId.trim().length > 0 ? fittingId : String((r as { id: string }).id);

      return {
        date,
        time_lodged: timeLodged,
        section: sectionName,
        pipes_laid: 1,
        pipe_id: id,
      };
    });

    return { data: result, isMock: false };
  } catch (err) {
    console.error("[DataView] fetchPipeDataView failed:", err);
    return { data: [], isMock: true };
  }
}

export async function fetchBackfillDataView(
  days: number,
  crewId?: string | null,
  endDate?: string
): Promise<{ data: BackfillDataViewRow[]; isMock: boolean }> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return { data: [], isMock: true };
    const end = endDate ? new Date(endDate + "T12:00:00") : new Date();
    const startDate = new Date(end);
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(end);

    let locationFilter: string[] | null = null;
    if (crewId) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id")
        .eq("location_type", "psp")
        .eq("crew_id", crewId);
      locationFilter = locs?.map((l) => l.id) ?? [];
    }

    const startISO = startStr + "T00:00:00+08:00";
    const endISO = endStr + "T23:59:59.999+08:00";

    let query = supabase
      .from("psp_records")
      .select("id, chainage, recorded_at, location_id")
      .gte("recorded_at", startISO)
      .lte("recorded_at", endISO)
      .not("chainage", "is", null)
      .order("recorded_at", { ascending: true });

    if (locationFilter && locationFilter.length > 0) query = query.in("location_id", locationFilter);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return { data: [], isMock: false };

    const uniqueLocIds = [...new Set(rows.map((r) => (r as { location_id?: string }).location_id).filter(Boolean))];
    const { data: locs } = await supabase
      .from("locations")
      .select("id, name, crew_id")
      .in("id", uniqueLocIds);
    const locMap = new Map((locs ?? []).map((l) => [l.id, { name: l.name ?? "—", crewId: l.crew_id }]));

    const { data: crews } = await supabase.from("crews").select("id, name");
    const crewMap = new Map((crews ?? []).map((c) => [c.id, c.name ?? "—"]));

    const rowsSorted = [...rows].sort((a, b) =>
      String((a as { recorded_at?: string }).recorded_at ?? "").localeCompare(
        String((b as { recorded_at?: string }).recorded_at ?? "")
      )
    );

    const result: BackfillDataViewRow[] = rowsSorted.map((r) => {
      const rawTs = (r as { recorded_at?: string }).recorded_at;
      const day = rawTs ? toPerthDate(String(rawTs)) : "";
      const timeLodged = rawTs
        ? new Date(String(rawTs)).toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Australia/Perth",
          })
        : "—";
      const locId = (r as { location_id?: string }).location_id;
      const locInfo = locId ? locMap.get(locId) : undefined;
      const ch = Number((r as { chainage?: unknown }).chainage) || 0;

      return {
        date: day,
        time_lodged: timeLodged,
        section: locInfo?.name ?? locId ?? "—",
        backfill_m3: ch,
        chainage: ch,
      };
    });

    return { data: result, isMock: false };
  } catch (err) {
    console.error("[DataView] fetchBackfillDataView failed:", err);
    return { data: [], isMock: true };
  }
}

export async function fetchWaterDataView(
  days: number,
  crewCode?: string | null,
  endDate?: string
): Promise<{ data: WaterDataViewRow[]; isMock: boolean }> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return { data: [], isMock: true };
    const end = endDate ? new Date(endDate + "T12:00:00") : new Date();
    const startDate = new Date(end);
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(end);
    const startISO = startStr + "T00:00:00+08:00";
    const endISO = endStr + "T23:59:59.999+08:00";

    let query = supabase
      .from("wc_water_logs")
      .select("id, created_at, volume_liters, vehicle_id, origin_site, destination_id, crew_id, task_id, wc_tasks(name)")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: true });

    if (crewCode) {
      const crewId = await getCrewId(crewCode);
      if (!crewId) {
        return { data: [], isMock: false };
      }
      query = query.eq("crew_id", crewId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return { data: [], isMock: false };

    const truckIds = [...new Set(rows.map((r) => (r as { vehicle_id?: string }).vehicle_id).filter(Boolean))];
    const destIds = [...new Set(rows.map((r) => (r as { destination_id?: string }).destination_id).filter(Boolean))];

    let dests: { id: string; name?: string }[] = [];
    if (destIds.length > 0) {
      const r = await supabase.from("wc_destination_sites").select("id, name").in("id", destIds);
      dests = r.data ?? [];
    }

    const truckMap = new Map<string, string>();
    if (truckIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("wc_vehicles")
        .select("id, name")
        .in("id", truckIds);
      for (const v of vehicles ?? []) {
        const id = (v as { id?: string }).id;
        const name = (v as { name?: string }).name;
        if (id) truckMap.set(id, name || id);
      }
    }
    const destMap = new Map(dests.map((d) => [d.id, d.name ?? "Site"]));

    const result: WaterDataViewRow[] = (rows ?? []).map((r) => {
      const createdAt = (r as { created_at?: string }).created_at
        ? new Date((r as { created_at: string }).created_at)
        : null;
      const dateStr = createdAt
        ? toPerthDate(createdAt.toISOString())
        : "—";
      const timeStr = createdAt
        ? createdAt.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Australia/Perth",
          })
        : "—";
      const destId = (r as { destination_id?: string }).destination_id;
      const destName = destId ? destMap.get(destId) ?? "Site" : "Site";
      const taskRel = (r as { wc_tasks?: { name?: string } | null }).wc_tasks;
      const taskName = taskRel?.name ?? "Other";

      return {
        date: dateStr,
        time_lodged: timeStr,
        location: (r as { origin_site?: string | null }).origin_site ?? "—",
        water_litres: Number((r as { volume_liters?: number }).volume_liters) || 0,
        destination: destName,
        truck_id:
          truckMap.get((r as { vehicle_id?: string }).vehicle_id ?? "") ??
          (r as { vehicle_id?: string }).vehicle_id ??
          "—",
        task: taskName,
      };
    });

    return { data: result, isMock: false };
  } catch (err) {
    console.error("[DataView] fetchWaterDataView failed:", err);
    return { data: [], isMock: true };
  }
}
