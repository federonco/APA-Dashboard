import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";

async function requireSuperAdminUser() {
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
  const user = await requireSuperAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeInactive = req.nextUrl.searchParams.get("include_inactive") === "1";

  const admin = requireAdminClient();
  let secQuery = admin
    .from("sections")
    .select("id, name, scope, app_id, start_ch, end_ch, direction, crew_id, project_id, is_active, crews(name)")
    .order("name");
  if (!includeInactive) {
    secQuery = secQuery.eq("is_active", true);
  }
  const { data: sections, error } = await secQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let subQuery = admin
    .from("subsections")
    .select("id, name, section_id, app_id, start_ch, end_ch, direction, is_active")
    .order("name");
  if (!includeInactive) {
    subQuery = subQuery.eq("is_active", true);
  }
  const { data: subsectionRows } = await subQuery;

  const subsectionsBySection = new Map<
    string,
    {
      id: string;
      name: string;
      section_id: string;
      app_id: string;
      start_ch: number | null;
      end_ch: number | null;
      direction: string | null;
    }[]
  >();
  for (const raw of subsectionRows ?? []) {
    const r = raw as {
      id: string;
      name: string;
      section_id: string;
      app_id: string;
      start_ch: number | null;
      end_ch: number | null;
      direction: string | null;
    };
    const list = subsectionsBySection.get(r.section_id) ?? [];
    list.push(r);
    subsectionsBySection.set(r.section_id, list);
  }

  const { data: roleRows } = await admin
    .from("user_app_roles")
    .select("section_id")
    .eq("role", "section_admin")
    .not("section_id", "is", null);

  const counts = new Map<string, number>();
  for (const r of roleRows ?? []) {
    const sid = (r as { section_id?: string }).section_id;
    if (!sid) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  const rows = (sections ?? []).map((s) => ({
    ...s,
    admin_count: counts.get(s.id) ?? 0,
    crew_name: (s as { crews?: { name?: string | null } }).crews?.name ?? null,
    subsections: subsectionsBySection.get(s.id) ?? [],
  }));

  return NextResponse.json(rows);
}

type PostSectionBody = {
  name?: unknown;
  scope?: unknown;
  app_id?: unknown;
  start_ch?: unknown;
  end_ch?: unknown;
  direction?: unknown;
  crew_id?: unknown;
  project_id?: unknown;
};

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostSectionBody;
  try {
    body = (await req.json()) as PostSectionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const scope = body.scope === "app" ? "app" : "shared";
  const appIdRaw = typeof body.app_id === "string" ? body.app_id.trim() : "";
  if (scope === "app" && !appIdRaw) {
    return NextResponse.json({ error: "app_id is required when scope is app" }, { status: 400 });
  }

  const crewId =
    typeof body.crew_id === "string" && body.crew_id.trim() !== "" ? body.crew_id.trim() : null;
  const projectId =
    typeof body.project_id === "string" && body.project_id.trim() !== "" ? body.project_id.trim() : null;

  const directionRaw = typeof body.direction === "string" ? body.direction.trim() : "";
  const direction =
    directionRaw === "onwards" || directionRaw === "backwards" ? directionRaw : null;

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("sections")
    .insert({
      name,
      scope,
      app_id: scope === "app" ? appIdRaw : null,
      start_ch: parseNum(body.start_ch),
      end_ch: parseNum(body.end_ch),
      direction,
      crew_id: crewId,
      project_id: projectId,
      app_config: {},
      is_active: true,
    })
    .select("id, name, scope, app_id, start_ch, end_ch, direction, crew_id, project_id, is_active, crews(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
