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
  const u = await requireSuperAdminUser();
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = requireAdminClient();
  const { data, error } = await admin.from("crews").select("id, name").order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
