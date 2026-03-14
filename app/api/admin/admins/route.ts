import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminRow = {
  id: string;
  email: string;
  crew: string;
  role: string;
  created_at: string;
};

// Uses psp_admins (schema table). Match by user_id or email when user_id is null.
async function isAdmin(userId: string, userEmail: string | null): Promise<boolean> {
  const admin = createAdminClient();
  const { data: byUserId } = await admin
    .from("psp_admins")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (byUserId) return true;
  if (userEmail) {
    const { data: byEmail } = await admin
      .from("psp_admins")
      .select("id")
      .eq("email", userEmail)
      .limit(1)
      .maybeSingle();
    if (byEmail) return true;
  }
  return false;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: admins, error } = await admin
    .from("psp_admins")
    .select("id, user_id, email, crew_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!admins?.length) return NextResponse.json([]);

  const crewIds = [...new Set((admins as Array<{ crew_id?: string | null }>).map((a) => a.crew_id).filter(Boolean))];
  const crewMap: Record<string, string> = {};
  if (crewIds.length > 0) {
    const { data: crewRows } = await admin.from("crews").select("id, name").in("id", crewIds);
    for (const c of crewRows ?? []) crewMap[c.id] = c.name ?? "—";
  }

  const rows: AdminRow[] = (admins as Array<{ id: string; user_id: string | null; email?: string | null; crew_id?: string | null }>).map((a) => ({
    id: a.id,
    email: a.email ?? "(unknown)",
    crew: a.crew_id ? crewMap[a.crew_id] ?? "—" : "—",
    role: "admin",
    created_at: "",
  }));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; crew_id?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, crew_id } = body;
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  if (!crew_id) return NextResponse.json({ error: "Crew is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = users?.users?.find((u) => u.email?.toLowerCase() === String(email).trim().toLowerCase());
  if (!found) {
    return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 });
  }

  if (!(await isAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await admin.from("psp_admins").select("id").eq("user_id", found.id).limit(1).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "User is already an admin" }, { status: 409 });
  }

  const { error: insertErr } = await admin
    .from("psp_admins")
    .insert({ user_id: found.id, email: String(email).trim(), crew_id });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("psp_admins")
    .select("user_id, email")
    .eq("id", id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = (row.user_id && row.user_id === user.id) || (row.email && row.email.toLowerCase() === (user.email ?? "").toLowerCase());
  if (isSelf) {
    return NextResponse.json({ error: "Cannot remove your own admin access" }, { status: 403 });
  }

  const { error } = await admin.from("psp_admins").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
