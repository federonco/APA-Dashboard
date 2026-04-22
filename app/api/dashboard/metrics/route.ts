import { NextRequest, NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { computeMetricValue } from "@/lib/dashboard-metric-queries";
import type { MetricKey } from "@/lib/metric-catalogue";
import { catalogueEntry } from "@/lib/metric-catalogue";

function perthToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")?.trim() || perthToday();
  const adminMode = req.nextUrl.searchParams.get("admin_mode") === "1";
  const admin = requireAdminClient();

  let query = admin
    .from("dashboard_cards")
    .select("id, metric_key, section_id, subsection_id, crew_id, label, sort_order, is_visible")
    .order("sort_order", { ascending: true });

  if (!adminMode) {
    query = query.eq("is_visible", true);
  }

  const { data: cards, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: {
    id: string;
    metric_key: string;
    label: string;
    value: number;
    section_name: string | null;
    subsection_name: string | null;
    crew_name: string | null;
    is_visible: boolean;
  }[] = [];

  for (const c of cards ?? []) {
    const row = c as {
      id: string;
      metric_key: string;
      section_id: string | null;
      subsection_id: string | null;
      crew_id: string | null;
      label: string;
      is_visible: boolean;
    };
    const cat = catalogueEntry(row.metric_key);
    if (!cat) continue;

    let sectionName: string | null = null;
    let subsectionName: string | null = null;
    let crewName: string | null = null;

    if (row.section_id) {
      const { data: s } = await admin.from("sections").select("name").eq("id", row.section_id).maybeSingle();
      sectionName = s?.name ?? null;
    }
    if (row.subsection_id) {
      const { data: sub } = await admin.from("subsections").select("name").eq("id", row.subsection_id).maybeSingle();
      subsectionName = sub?.name ?? null;
    }
    if (row.crew_id) {
      const { data: cr } = await admin.from("crews").select("name").eq("id", row.crew_id).maybeSingle();
      crewName = cr?.name ? `Crew ${cr.name}` : null;
    }

    try {
      const value = await computeMetricValue(row.metric_key as MetricKey, {
        sectionId: row.section_id,
        subsectionId: row.subsection_id,
        crewId: row.crew_id,
        dateStr: date,
      });
      rows.push({
        id: row.id,
        metric_key: row.metric_key,
        label: row.label,
        value,
        section_name: sectionName,
        subsection_name: subsectionName,
        crew_name: crewName,
        is_visible: row.is_visible,
      });
    } catch {
      rows.push({
        id: row.id,
        metric_key: row.metric_key,
        label: row.label,
        value: 0,
        section_name: sectionName,
        subsection_name: subsectionName,
        crew_name: crewName,
        is_visible: row.is_visible,
      });
    }
  }

  return NextResponse.json({ date, cards: rows });
}
