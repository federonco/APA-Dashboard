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

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type PatchSubsectionBody = {
  name?: unknown;
  app_id?: unknown;
  start_ch?: unknown;
  end_ch?: unknown;
  direction?: unknown;
  is_active?: unknown;
};

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

  let body: PatchSubsectionBody;
  try {
    body = (await req.json()) as PatchSubsectionBody;
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

  if (body.app_id !== undefined) {
    const aid = typeof body.app_id === "string" ? body.app_id.trim() : "";
    if (!aid) {
      return NextResponse.json({ error: "app_id cannot be empty" }, { status: 400 });
    }
    updates.app_id = aid;
  }

  if (body.start_ch !== undefined) updates.start_ch = parseNum(body.start_ch);
  if (body.end_ch !== undefined) updates.end_ch = parseNum(body.end_ch);

  if (body.direction !== undefined) {
    const d = typeof body.direction === "string" ? body.direction.trim() : "";
    updates.direction = d === "onwards" || d === "backwards" ? d : null;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("subsections")
    .update(updates)
    .eq("id", id)
    .select("id, name, section_id, app_id, start_ch, end_ch, direction, is_active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
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
  const { error } = await admin.from("subsections").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
