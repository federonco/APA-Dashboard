import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { catalogueEntry } from "@/lib/metric-catalogue";

async function requireSuper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isSuperAdmin(user.id, user.email ?? null))) {
    return null;
  }
  return user;
}

async function assertSubsectionBelongsToSection(
  admin: SupabaseClient,
  sectionId: string,
  subsectionId: string
): Promise<boolean> {
  const { data } = await admin
    .from("subsections")
    .select("id")
    .eq("id", subsectionId)
    .eq("section_id", sectionId)
    .maybeSingle();
  return !!data;
}

export async function GET() {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("dashboard_cards")
    .select(
      "id, metric_key, section_id, subsection_id, crew_id, label, sort_order, is_visible, created_at, updated_at, sections(name), subsections(name), crews(name)"
    )
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []).map((r) => ({
    ...(r as object),
    section_name: (r as { sections?: { name?: string | null } }).sections?.name ?? null,
    subsection_name: (r as { subsections?: { name?: string | null } }).subsections?.name ?? null,
    crew_name: (r as { crews?: { name?: string | null } }).crews?.name ?? null,
  }));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    metric_key?: string;
    section_id?: string | null;
    subsection_id?: string | null;
    crew_id?: string | null;
    label?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const metric_key = String(body.metric_key ?? "").trim();
  const cat = catalogueEntry(metric_key);
  if (!cat) {
    return NextResponse.json({ error: "Invalid metric_key" }, { status: 400 });
  }
  if (cat.requiresSection && !body.section_id) {
    return NextResponse.json({ error: "section_id required" }, { status: 400 });
  }
  if (cat.requiresCrew && !body.crew_id) {
    return NextResponse.json({ error: "crew_id required" }, { status: 400 });
  }
  if (!cat.requiresSection) {
    body.section_id = null;
  }
  if (!cat.requiresCrew) {
    body.crew_id = null;
  }

  let subsection_id: string | null =
    body.subsection_id != null && String(body.subsection_id).trim() !== ""
      ? String(body.subsection_id).trim()
      : null;
  if (!cat.allowsSubsection) {
    subsection_id = null;
  }
  if (subsection_id && body.section_id) {
    const admin = requireAdminClient();
    const ok = await assertSubsectionBelongsToSection(admin, body.section_id, subsection_id);
    if (!ok) {
      return NextResponse.json({ error: "subsection_id does not belong to section" }, { status: 400 });
    }
  } else if (subsection_id && !body.section_id) {
    return NextResponse.json({ error: "section_id required when subsection_id is set" }, { status: 400 });
  }

  const admin = requireAdminClient();
  const { data: maxRow } = await admin
    .from("dashboard_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (Number((maxRow as { sort_order?: number })?.sort_order) || 0) + 1;

  let label = String(body.label ?? "").trim();
  if (!label) {
    const sn = body.section_id
      ? (await admin.from("sections").select("name").eq("id", body.section_id).maybeSingle()).data?.name
      : null;
    const subn = subsection_id
      ? (await admin.from("subsections").select("name").eq("id", subsection_id).maybeSingle()).data?.name
      : null;
    const cn = body.crew_id
      ? (await admin.from("crews").select("name").eq("id", body.crew_id).maybeSingle()).data?.name
      : null;
    label = [cat.label, sn && `— ${sn}`, subn && `(${subn})`, cn && `Crew ${cn}`].filter(Boolean).join(" ");
  }

  const { data: created, error } = await admin
    .from("dashboard_cards")
    .insert({
      metric_key,
      section_id: body.section_id ?? null,
      subsection_id,
      crew_id: body.crew_id ?? null,
      label,
      sort_order: nextOrder,
      is_visible: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(created);
}
