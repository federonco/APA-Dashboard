import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function daysInclusive(startDate: string, endDate: string): number {
  const s = new Date(startDate + "T12:00:00Z");
  const e = new Date(endDate + "T12:00:00Z");
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const params = req.nextUrl.searchParams;
  const crewId = params.get("crew_id");
  const startDate = params.get("start_date");
  const endDate = params.get("end_date");
  const statusFilter = params.get("status");

  let query = admin
    .from("planner_activities")
    .select("*")
    .order("start_date", { ascending: true })
    .order("sort_order", { ascending: true });

  if (crewId) query = query.eq("crew_id", crewId);

  // Overlap filter: activity overlaps [startDate, endDate]
  if (startDate && endDate) {
    query = query.lte("start_date", endDate).gte("end_date", startDate);
  } else if (startDate) {
    query = query.gte("end_date", startDate);
  } else if (endDate) {
    query = query.lte("start_date", endDate);
  }

  if (statusFilter) {
    const statuses = statusFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length > 0) query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activities = (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : null;
      const crew_id = typeof r.crew_id === "string" ? r.crew_id : null;
      const name = typeof r.name === "string" ? r.name : "";
      const start_date = typeof r.start_date === "string" ? r.start_date : null;
      const end_date = typeof r.end_date === "string" ? r.end_date : null;
      if (!id || !crew_id || !start_date || !end_date) return null;
      return {
        id,
        crew_id,
        name,
        start_date,
        end_date,
        duration_days: daysInclusive(start_date, end_date),
        status: typeof r.status === "string" ? r.status : "planned",
        drainer_section_id: typeof r.drainer_section_id === "string" ? r.drainer_section_id : "",
        drainer_segment_id: typeof r.drainer_segment_id === "string" ? r.drainer_segment_id : null,
        progress_percent: Number(r.progress_percent) || 0,
        notes: typeof r.notes === "string" ? r.notes : null,
        wbs_code: typeof r.wbs_code === "string" ? r.wbs_code : null,
        is_baseline: Boolean(r.is_baseline),
        parent_activity_id: typeof r.parent_activity_id === "string" ? r.parent_activity_id : null,
        sort_order: Number(r.sort_order) || 0,
        created_at: typeof r.created_at === "string" ? r.created_at : "",
        updated_at: typeof r.updated_at === "string" ? r.updated_at : "",
      };
    })
    .filter((a): a is NonNullable<typeof a> => a != null);

  return NextResponse.json(activities);
}

