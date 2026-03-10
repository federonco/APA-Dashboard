import { createClient } from "@/lib/supabase/server";

export type OnSiteDRow = {
  date: string;
  section: string; // drainer_sections.name
  pipes_laid: number;
  crew: string;
};

export type OnSiteBRow = {
  date: string;
  location: string; // psp_locations.name
  backfill_m: number; // CH current - CH initial
  crew: string;
};

export type OnSiteWRow = {
  date: string;
  location: string;
  water_m3: number;
  destination: string;
  crew: string;
};

export type SpreadsheetData = {
  onsiteD: OnSiteDRow[];
  onsiteB: OnSiteBRow[];
  onsiteW: OnSiteWRow[];
};

export async function getSpreadsheetData(
  crewFilter: string | null
): Promise<SpreadsheetData> {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 31);
  const start = startDate.toISOString().split("T")[0];

  try {
    const supabase = await createClient();

    const onsiteD: OnSiteDRow[] = [];
    const onsiteB: OnSiteBRow[] = [];
    let onsiteW: OnSiteWRow[] = [];

    let pipeQuery = supabase
      .from("drainer_pipe_records")
      .select("date_installed, section_id")
      .gte("date_installed", start)
      .lte("date_installed", end);

    if (crewFilter) {
      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("name", crewFilter)
        .single();
      if (crew) {
        const { data: sections } = await supabase
          .from("drainer_sections")
          .select("id, name")
          .eq("crew_id", crew.id);
        const sectionIds = (sections ?? []).map((s) => s.id);
        const sectionMap = new Map((sections ?? []).map((s) => [s.id, s.name]));
        if (sectionIds.length > 0) {
          pipeQuery = pipeQuery.in("section_id", sectionIds);
        }
        const { data: pipes } = await pipeQuery;
        const byDateSection = new Map<string, { count: number; crew: string }>();
        for (const p of pipes ?? []) {
          const d = p.date_installed ?? "";
          const sec = sectionMap.get(p.section_id) ?? "Unknown";
          const key = `${d}|${sec}`;
          const cur = byDateSection.get(key) ?? { count: 0, crew: crewFilter };
          cur.count++;
          byDateSection.set(key, cur);
        }
        for (const [key, v] of byDateSection) {
          const [date, section] = key.split("|");
          onsiteD.push({
            date,
            section,
            pipes_laid: v.count,
            crew: v.crew,
          });
        }
      }
    } else {
      const { data: sections } = await supabase
        .from("drainer_sections")
        .select("id, name, crew_id");
      const sectionMap = new Map((sections ?? []).map((s) => [s.id, s.name]));
      const crewMap = new Map<string, string>();
      const { data: crews } = await supabase.from("crews").select("id, name");
      for (const c of crews ?? []) {
        crewMap.set(c.id, c.name);
      }
      const sectionToCrew = new Map(
        (sections ?? [])
          .filter((s) => s.crew_id)
          .map((s) => [s.id, crewMap.get(s.crew_id!) ?? "—"])
      );
      const { data: pipes } = await pipeQuery;
      const byDateSection = new Map<string, { count: number; crew: string }>();
      for (const p of pipes ?? []) {
        const d = p.date_installed ?? "";
        const sec = sectionMap.get(p.section_id) ?? "Unknown";
        const crew = sectionToCrew.get(p.section_id) ?? "—";
        const key = `${d}|${sec}`;
        const cur = byDateSection.get(key) ?? { count: 0, crew };
        cur.count++;
        byDateSection.set(key, cur);
      }
      for (const [key, v] of byDateSection) {
        const [date, section] = key.split("|");
        onsiteD.push({
          date,
          section,
          pipes_laid: v.count,
          crew: v.crew,
        });
      }
    }

    onsiteD.sort((a, b) => a.date.localeCompare(b.date));

    let pspLocQuery = supabase
      .from("psp_locations")
      .select("id, name, crew_id");
    if (crewFilter) {
      const { data: crewRow } = await supabase
        .from("crews")
        .select("id")
        .eq("name", crewFilter)
        .single();
      if (crewRow) {
        pspLocQuery = pspLocQuery.eq("crew_id", crewRow.id);
      }
    }
    const { data: pspLocations } = await pspLocQuery;
    const locationMap = new Map(
      (pspLocations ?? []).map((l) => [l.id, { name: l.name, crewId: l.crew_id }])
    );
    const locationIds = (pspLocations ?? []).map((l) => l.id);
    const crewMap = new Map<string, string>();
    const { data: crews } = await supabase.from("crews").select("id, name");
    for (const c of crews ?? []) crewMap.set(c.id, c.name);

    let pspRecords: { location_id: string; chainage: number; recorded_at: string }[] = [];
    if (locationIds.length > 0 || !crewFilter) {
      let pspRecQuery = supabase
        .from("psp_records")
        .select("location_id, chainage, recorded_at")
        .not("chainage", "is", null)
        .gte("recorded_at", `${start}T00:00:00Z`)
        .lte("recorded_at", `${end}T23:59:59Z`);
      if (locationIds.length > 0) {
        pspRecQuery = pspRecQuery.in("location_id", locationIds);
      }
      const { data } = await pspRecQuery;
      pspRecords = data ?? [];
    }

    const byDateLocation = new Map<
      string,
      { chainages: number[]; lodgedAt: string[]; crew: string }
    >();
    for (const r of pspRecords) {
      const loc = locationMap.get(r.location_id ?? "");
      if (!loc) continue;
      const crew =
        crewFilter ??
        (loc.crewId ? crewMap.get(loc.crewId) ?? "—" : "—");
      const date = (r.recorded_at ?? "").split("T")[0];
      const ch = Number(r.chainage);
      if (isNaN(ch)) continue;
      const key = `${date}|${loc.name}`;
      const cur = byDateLocation.get(key) ?? {
        chainages: [],
        lodgedAt: [],
        crew: crewFilter ?? crew,
      };
      cur.chainages.push(ch);
      cur.lodgedAt.push(r.recorded_at ?? date);
      byDateLocation.set(key, cur);
    }
    for (const [key, v] of byDateLocation) {
      const [date, location] = key.split("|");
      let backfillM = 0;
      if (v.chainages.length >= 2) {
        const sorted = v.chainages
          .map((ch, i) => ({ ch, t: v.lodgedAt[i] }))
          .sort((a, b) => (a.t ?? "").localeCompare(b.t ?? ""));
        backfillM = Math.round(
          Math.abs(sorted[sorted.length - 1].ch - sorted[0].ch) * 10
        ) / 10;
      } else if (v.chainages.length === 1) {
        backfillM = 0;
      }
      onsiteB.push({
        date,
        location,
        backfill_m: backfillM,
        crew: v.crew,
      });
    }
    onsiteB.sort((a, b) => a.date.localeCompare(b.date));

    if (crewFilter) {
      const { data: logs } = await supabase
        .from("wc_water_logs")
        .select("created_at, volume_liters, destination_id, task_id, crew")
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`)
        .eq("crew", crewFilter);
      const { data: dests } = await supabase
        .from("wc_destination_sites")
        .select("id, name");
      const destMap = new Map((dests ?? []).map((d) => [d.id, d.name]));
      onsiteW = (logs ?? []).map((r) => ({
        date: (r.created_at ?? "").split("T")[0],
        location: destMap.get(r.destination_id ?? "") ?? "—",
        water_m3: Math.round((Number(r.volume_liters) ?? 0) / 1000 * 10) / 10,
        destination: destMap.get(r.destination_id ?? "") ?? "—",
        crew: r.crew ?? crewFilter,
      }));
    } else {
      const { data: logs } = await supabase
        .from("wc_water_logs")
        .select("created_at, volume_liters, destination_id, crew")
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`);
      const { data: dests } = await supabase
        .from("wc_destination_sites")
        .select("id, name");
      const destMap = new Map((dests ?? []).map((d) => [d.id, d.name]));
      onsiteW = (logs ?? []).map((r) => ({
        date: (r.created_at ?? "").split("T")[0],
        location: destMap.get(r.destination_id ?? "") ?? "—",
        water_m3: Math.round((Number(r.volume_liters) ?? 0) / 1000 * 10) / 10,
        destination: destMap.get(r.destination_id ?? "") ?? "—",
        crew: r.crew ?? "—",
      }));
    }
    onsiteW.sort((a, b) => a.date.localeCompare(b.date));

    return { onsiteD, onsiteB, onsiteW };
  } catch (err) {
    console.error("getSpreadsheetData:", err);
    return {
      onsiteD: [],
      onsiteB: [],
      onsiteW: [],
    };
  }
}
