import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sectionId = req.nextUrl.searchParams.get("section_id")?.trim();
  const admin = requireAdminClient();

  let query = admin
    .from("subsections")
    .select("id, name, section_id, start_ch, end_ch, sections(name)")
    .order("name");

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      section_id: r.section_id,
      start_ch: r.start_ch,
      end_ch: r.end_ch,
      section_name: (r as { sections?: { name?: string | null } }).sections?.name ?? null,
    }));

  return NextResponse.json(rows);
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type PostSubsectionBody = {
  section_id?: unknown;
  name?: unknown;
  app_id?: unknown;
  start_ch?: unknown;
  end_ch?: unknown;
  direction?: unknown;
};

export async function POST(req: NextRequest) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostSubsectionBody;
  try {
    body = (await req.json()) as PostSubsectionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sectionId = typeof body.section_id === "string" ? body.section_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const appId = typeof body.app_id === "string" ? body.app_id.trim() : "";

  if (!sectionId || !name || !appId) {
    return NextResponse.json(
      { error: "section_id, name, and app_id are required" },
      { status: 400 }
    );
  }

  const directionRaw = typeof body.direction === "string" ? body.direction.trim() : "";
  const direction =
    directionRaw === "onwards" || directionRaw === "backwards" ? directionRaw : null;

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("subsections")
    .insert({
      section_id: sectionId,
      name,
      app_id: appId,
      start_ch: parseNum(body.start_ch),
      end_ch: parseNum(body.end_ch),
      direction,
      app_config: {},
      is_active: true,
    })
    .select("id, name, section_id, app_id, start_ch, end_ch, direction, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
