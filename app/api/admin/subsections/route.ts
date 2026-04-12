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
