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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = requireAdminClient();
  const { data: section, error } = await admin
    .from("sections")
    .select("id, name, scope, start_ch, end_ch, direction, crew_id, show_in_portfolio, crews(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!section) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: admins } = await admin
    .from("user_app_roles")
    .select("user_id, user_email, role")
    .eq("section_id", id)
    .eq("role", "section_admin");

  return NextResponse.json({
    section: {
      ...section,
      crew_name: (section as { crews?: { name?: string | null } }).crews?.name ?? null,
    },
    admins: admins ?? [],
  });
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type PatchSectionBody = {
  name?: unknown;
  scope?: unknown;
  app_id?: unknown;
  start_ch?: unknown;
  end_ch?: unknown;
  direction?: unknown;
  crew_id?: unknown;
  is_active?: unknown;
  show_in_portfolio?: unknown;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: PatchSectionBody;
  try {
    body = (await req.json()) as PatchSectionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.scope !== undefined) {
    const scope = body.scope === "app" ? "app" : "shared";
    updates.scope = scope;
    if (scope === "shared") {
      updates.app_id = null;
    } else {
      const aid = typeof body.app_id === "string" ? body.app_id.trim() : "";
      if (!aid) {
        return NextResponse.json({ error: "app_id is required when scope is app" }, { status: 400 });
      }
      updates.app_id = aid;
    }
  } else if (body.app_id !== undefined) {
    const aid = typeof body.app_id === "string" ? body.app_id.trim() : "";
    updates.app_id = aid === "" ? null : aid;
  }

  if (body.start_ch !== undefined) updates.start_ch = parseNum(body.start_ch);
  if (body.end_ch !== undefined) updates.end_ch = parseNum(body.end_ch);

  if (body.direction !== undefined) {
    const d = typeof body.direction === "string" ? body.direction.trim() : "";
    updates.direction = d === "onwards" || d === "backwards" ? d : null;
  }

  if (body.crew_id !== undefined) {
    updates.crew_id =
      typeof body.crew_id === "string" && body.crew_id.trim() !== "" ? body.crew_id.trim() : null;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (body.show_in_portfolio !== undefined) {
    updates.show_in_portfolio = Boolean(body.show_in_portfolio);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("sections")
    .update(updates)
    .eq("id", id)
    .select("id, name, scope, app_id, start_ch, end_ch, direction, crew_id, project_id, is_active, show_in_portfolio, crews(name)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    crew_name: (data as { crews?: { name?: string | null } }).crews?.name ?? null,
  });
}
