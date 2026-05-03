import { NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminJson } from "@/lib/admin-api-auth";

/** All rows from public.apps for admin user app assignments (id → user_app_roles.app_id). */
export async function GET() {
  const auth = await requireSuperAdminJson();
  if (!auth.ok) {
    return auth.response;
  }

  const admin = requireAdminClient();
  const { data, error } = await admin.from("apps").select("id, name").order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { id: string; name: string | null }[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name ?? r.id,
    }))
  );
}
