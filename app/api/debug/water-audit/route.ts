/**
 * Auditoría OnSite-W: qué devuelven wc_water_logs y locations para Location/Destination.
 * GET /api/debug/water-audit
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const out: Record<string, unknown> = {};
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "No admin client" }, { status: 500 });
    }

    // 1. wc_water_logs: últimas 5 filas con origin_site, destination_id
    const { data: logs, error: logsErr } = await supabase
      .from("wc_water_logs")
      .select("id, created_at, origin_site, destination_id, volume_liters, vehicle_id")
      .order("created_at", { ascending: false })
      .limit(5);

    out.wc_water_logs = {
      error: logsErr?.message ?? null,
      count: logs?.length ?? 0,
      sample: logs ?? [],
      columns_received: logs?.[0] ? Object.keys(logs[0]) : [],
    };

    if (!logs?.length) {
      return NextResponse.json(out);
    }

    // 2. destination_ids únicos que hay en los logs
    const destIds = [...new Set(logs.map((r) => (r as { destination_id?: string }).destination_id).filter(Boolean))];
    out.destination_ids_in_logs = destIds;

    // 3. Lookup en locations (sin filtro)
    const { data: locsAll, error: locsErr } = await supabase
      .from("locations")
      .select("id, name, location_type")
      .in("id", destIds.length ? destIds : ["_none_"]);

    out.locations_by_destination_id = {
      error: locsErr?.message ?? null,
      ids_queried: destIds,
      matched: locsAll ?? [],
      matched_count: locsAll?.length ?? 0,
    };

    // 4. locations con location_type = 'water' (por si destination apunta a esas)
    const { data: waterLocs } = await supabase
      .from("locations")
      .select("id, name, location_type")
      .eq("location_type", "water")
      .limit(10);
    out.locations_type_water = waterLocs ?? [];

    // 5. origin_site: valores distintos en los logs
    const originSites = [...new Set(logs.map((r) => (r as { origin_site?: string }).origin_site).filter(Boolean))];
    out.origin_site_values = originSites;

    return NextResponse.json(out);
  } catch (e: unknown) {
    out.fatal_error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(out);
  }
}
