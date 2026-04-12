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
    .select("id, name, scope, start_ch, end_ch, direction, crew_id, crews(name)")
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
