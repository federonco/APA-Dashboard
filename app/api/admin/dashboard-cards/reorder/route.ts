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

export async function PATCH(req: NextRequest) {
  const u = await requireSuper();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { card_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ids = Array.isArray(body.card_ids) ? body.card_ids.map(String) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "card_ids required" }, { status: 400 });
  }

  const admin = requireAdminClient();
  for (let i = 0; i < ids.length; i += 1) {
    const { error } = await admin.from("dashboard_cards").update({ sort_order: i }).eq("id", ids[i]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
