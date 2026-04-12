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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = requireAdminClient();
  const { data: current } = await admin.from("dashboard_cards").select("*").eq("id", id).maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cur = current as {
    metric_key: string;
    section_id: string | null;
    subsection_id: string | null;
    crew_id: string | null;
  };

  const mk = body.metric_key !== undefined ? String(body.metric_key).trim() : cur.metric_key;
  const cat = catalogueEntry(mk);
  if (!cat) {
    return NextResponse.json({ error: "Invalid metric_key" }, { status: 400 });
  }

  let sectionId = body.section_id !== undefined ? (body.section_id as string | null) : cur.section_id;
  let subsectionId = body.subsection_id !== undefined ? (body.subsection_id as string | null) : cur.subsection_id;
  let crewId = body.crew_id !== undefined ? (body.crew_id as string | null) : cur.crew_id;

  if (subsectionId && String(subsectionId).trim() === "") {
    subsectionId = null;
  }

  if (!cat.requiresSection) {
    sectionId = null;
  }
  if (!cat.requiresCrew) {
    crewId = null;
  }
  if (!cat.allowsSubsection) {
    subsectionId = null;
  }

  if (cat.requiresSection && !sectionId) {
    return NextResponse.json({ error: "section_id required" }, { status: 400 });
  }
  if (cat.requiresCrew && !crewId) {
    return NextResponse.json({ error: "crew_id required" }, { status: 400 });
  }
  if (subsectionId && sectionId) {
    const ok = await assertSubsectionBelongsToSection(admin, sectionId, subsectionId as string);
    if (!ok) {
      return NextResponse.json({ error: "subsection_id does not belong to section" }, { status: 400 });
    }
  } else if (subsectionId && !sectionId) {
    return NextResponse.json({ error: "section_id required when subsection_id is set" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    metric_key: mk,
    section_id: sectionId,
    subsection_id: subsectionId,
    crew_id: crewId,
  };
  if (body.label !== undefined) patch.label = String(body.label);
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);
  if (body.is_visible !== undefined) patch.is_visible = Boolean(body.is_visible);

  const { data: updated, error } = await admin.from("dashboard_cards").update(patch).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const admin = requireAdminClient();
  const { error } = await admin.from("dashboard_cards").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
