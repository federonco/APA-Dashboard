import { NextResponse } from "next/server";
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

export async function GET() {
  const user = await requireSuperAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = requireAdminClient();
  const { data: sections, error } = await admin
    .from("sections")
    .select("id, name, scope, start_ch, end_ch, direction, crew_id, crews(name)")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  }));

  return NextResponse.json(rows);
}
