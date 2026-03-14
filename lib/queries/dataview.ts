/**
 * Data View queries — real Supabase data for OnSite-D/B/W tables.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getSectionIdsForCrew } from "@/lib/queries/daily";

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
  crew: string;
};

export type BackfillDataViewRow = {
  date: string;
  time_lodged?: string;
  section: string;
  backfill_m3: number;
  crew: string;
};

export type WaterDataViewRow = {
  date: string;
  time_lodged?: string;
  location: string;
  water_litres: number;
  destination: string;
  truck_id?: string;
};

export async function fetchPipeDataView(
  days: number,
  crewId?: string | null,
  endDate?: string
): Promise<{ data: PipeDataViewRow[]; isMock: boolean }> {
  try {
    const supabase = createAdminClient();
    const end = endDate ? new Date(endDate + "T12:00:00") : new Date();
    const startDate = new Date(end);
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(end);

    let sectionIds: string[] = [];
    if (crewId) sectionIds = await getSectionIdsForCrew(crewId);

    let query = supabase
      .from("drainer_pipe_records")
      .select("id, date_installed, time_installed, section_id, lodged_at")
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

    const byDate: Record<string, typeof rows> = {};
    for (const r of rows) {
      const d = (r as { date_installed?: string }).date_installed;
      if (d) {
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r);
      }
    }

    const result: PipeDataViewRow[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, records]) => {
        const withTime = records
          .filter((r) => (r as { lodged_at?: string }).lodged_at || (r as { time_installed?: string }).time_installed)
          .sort((a, b) =>
            String((b as { lodged_at?: string }).lodged_at ?? "").localeCompare(
              String((a as { lodged_at?: string }).lodged_at ?? "")
            )
          );
        const last = withTime[0] ?? records[records.length - 1];
        let timeLodged = "—";
        if (last) {
          const ti = (last as { time_installed?: string }).time_installed;
          const la = (last as { lodged_at?: string }).lodged_at;
          if (ti) timeLodged = String(ti).slice(0, 5);
          else if (la)
            timeLodged = new Date(la).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Australia/Perth",
            });
        }

        const sectionCounts: Record<string, number> = {};
        for (const r of records) {
          const sid = (r as { section_id?: string }).section_id;
          if (sid) {
            const name = sectionMap.get(sid)?.name ?? sid;
            sectionCounts[name] = (sectionCounts[name] ?? 0) + 1;
          }
        }
        const topSection = Object.entries(sectionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

        const firstWithSection = records.find((r) => (r as { section_id?: string }).section_id);
        const secInfo = firstWithSection
          ? sectionMap.get((firstWithSection as { section_id?: string }).section_id)
          : null;
        const crewName = secInfo?.crewId ? crewMap.get(secInfo.crewId) ?? "—" : "—";

        return {
          date,
          time_lodged: timeLodged,
          section: topSection,
          pipes_laid: records.length,
          crew: crewName,
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
      .select("id, chainage, recorded_at, created_at, location_id")
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

    const byDayLoc: Record<string, Record<string, number[]>> = {};
    for (const r of rows) {
      const rawTs = (r as { recorded_at?: string; created_at?: string }).recorded_at ?? (r as { created_at?: string }).created_at;
      const day = rawTs ? toPerthDate(String(rawTs)) : "";
      const locId = (r as { location_id?: string }).location_id;
      if (!day || !locId) continue;
      if (!byDayLoc[day]) byDayLoc[day] = {};
      if (!byDayLoc[day][locId]) byDayLoc[day][locId] = [];
      byDayLoc[day][locId].push(Number((r as { chainage?: unknown }).chainage));
    }

    const result: BackfillDataViewRow[] = Object.entries(byDayLoc)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, locations]) => {
        let totalMeters = 0;
        let mainLocId = "";
        let maxRecords = 0;

        for (const [locId, chainages] of Object.entries(locations)) {
          if (chainages.length >= 1) {
            totalMeters += Math.max(...chainages) - Math.min(...chainages);
          }
          if (chainages.length > maxRecords) {
            maxRecords = chainages.length;
            mainLocId = locId;
          }
        }

        const dayRecords = rows.filter(
          (r) =>
            toPerthDate(
              String(
                (r as { recorded_at?: string }).recorded_at ?? (r as { created_at?: string }).created_at ?? ""
              )
            ) === date
        );
        const lastRecord = [...dayRecords].sort((a, b) =>
          String((b as { created_at?: string }).created_at ?? "").localeCompare(
            String((a as { created_at?: string }).created_at ?? "")
          )
        )[0];

        const timeLodged = lastRecord?.created_at
          ? new Date((lastRecord as { created_at: string }).created_at).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Australia/Perth",
            })
          : "—";

        const locInfo = locMap.get(mainLocId);
        const crewName = locInfo?.crewId ? crewMap.get(locInfo.crewId) ?? "—" : "—";

        return {
          date,
          time_lodged: timeLodged,
          section: locInfo?.name ?? mainLocId ?? "—",
          backfill_m3: Math.round(totalMeters * 10) / 10,
          crew: crewName,
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
  crewId?: string | null,
  endDate?: string
): Promise<{ data: WaterDataViewRow[]; isMock: boolean }> {
  try {
    const supabase = createAdminClient();
    const end = endDate ? new Date(endDate + "T12:00:00") : new Date();
    const startDate = new Date(end);
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(end);
    const startISO = startStr + "T00:00:00+08:00";
    const endISO = endStr + "T23:59:59.999+08:00";

    let query = supabase
      .from("wc_water_logs")
      .select("id, created_at, volume_liters, truck_id, destination_id, crew_id")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: true });

    if (crewId) query = query.eq("crew_id", crewId);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return { data: [], isMock: false };

    const truckIds = [...new Set(rows.map((r) => (r as { truck_id?: string }).truck_id).filter(Boolean))];
    const destIds = [...new Set(rows.map((r) => (r as { destination_id?: string }).destination_id).filter(Boolean))];

    let trucks: { id: string; name?: string }[] = [];
    let dests: { id: string; name?: string }[] = [];
    if (truckIds.length > 0) {
      const r = await supabase.from("wc_vehicles").select("id, name").in("id", truckIds);
      trucks = r.data ?? [];
    }
    if (destIds.length > 0) {
      const r = await supabase.from("locations").select("id, name").in("id", destIds);
      dests = r.data ?? [];
    }

    const truckMap = new Map(trucks.map((t) => [t.id, t.name ?? "—"]));
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

      return {
        date: dateStr,
        time_lodged: timeStr,
        location: destName,
        water_litres: Number((r as { volume_liters?: number }).volume_liters) || 0,
        destination: destName,
        truck_id: truckMap.get((r as { truck_id?: string }).truck_id ?? "") ?? (r as { truck_id?: string }).truck_id ?? "—",
      };
    });

    return { data: result, isMock: false };
  } catch (err) {
    console.error("[DataView] fetchWaterDataView failed:", err);
    return { data: [], isMock: true };
  }
}
