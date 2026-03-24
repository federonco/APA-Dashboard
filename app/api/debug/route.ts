import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: any = {};

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    out.env = {
      url: url ? "OK" : "MISSING",
      anon: key ? "OK" : "MISSING",
      service: serviceKey ? "OK" : "MISSING",
    };

    const sb = createClient(url!, serviceKey || key!);

    const r1 = await sb.from("psp_records").select("*").limit(1);
    out.psp_records = {
      error: r1.error?.message || null,
      count: r1.data?.length ?? 0,
      columns: r1.data?.[0] ? Object.keys(r1.data[0]) : [],
      sample: r1.data?.[0] ?? null,
    };

    const r2 = await sb.from("wc_water_logs").select("*").limit(1);
    out.wc_water_logs = {
      error: r2.error?.message || null,
      count: r2.data?.length ?? 0,
      columns: r2.data?.[0] ? Object.keys(r2.data[0]) : [],
      sample: r2.data?.[0] ?? null,
    };

    const r3 = await sb.from("wc_vehicles").select("*").limit(1);
    out.wc_vehicles = {
      error: r3.error?.message || null,
      columns: r3.data?.[0] ? Object.keys(r3.data[0]) : [],
      sample: r3.data?.[0] ?? null,
    };

    const r4 = await sb.from("wc_tasks").select("*");
    out.wc_tasks = {
      error: r4.error?.message || null,
      data: r4.data ?? [],
    };

    const r5 = await sb.from("drainer_pipe_records").select("*").limit(1);
    out.drainer_pipe_records = {
      error: r5.error?.message || null,
      columns: r5.data?.[0] ? Object.keys(r5.data[0]) : [],
    };

    const r6 = await sb.from("locations").select("*").eq("location_type", "psp");
    out.psp_locations = {
      error: r6.error?.message || null,
      count: r6.data?.length ?? 0,
      data: r6.data ?? [],
    };

    const c1 = await sb.from("psp_records").select("id", { count: "exact", head: true });
    const c2 = await sb.from("wc_water_logs").select("id", { count: "exact", head: true });
    out.total_counts = {
      psp_records: c1.count,
      wc_water_logs: c2.count,
    };
  } catch (e: any) {
    out.fatal_error = e.message;
  }

  return NextResponse.json(out);
}

