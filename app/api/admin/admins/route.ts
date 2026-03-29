import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";

type AdminRow = {
  id: string;
  user_id: string;
  email: string;
  crews: { id: string; name: string; zone: string } | null;
};

type RoleRowRaw = {
  id: string;
  user_id: string | null;
  crew_id?: string | null;
};

async function emailByUserIds(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("auth_user_id, email")
    .in("auth_user_id", unique);
  for (const p of profiles ?? []) {
    const uid = (p as { auth_user_id?: string }).auth_user_id;
    const em = (p as { email?: string | null }).email;
    if (uid) map.set(uid, em?.trim() || "");
  }
  return map;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isSuperAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }
  const { data: roleRows, error } = await admin
    .from("user_app_roles")
    .select("id, user_id, crew_id")
    .eq("role", "admin");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!roleRows?.length) return NextResponse.json([]);

  const typed = roleRows as RoleRowRaw[];
  const emailMap = await emailByUserIds(
    admin,
    typed.map((r) => r.user_id ?? "").filter(Boolean)
  );

  const crewIds = [...new Set(typed.map((a) => a.crew_id).filter(Boolean))];
  const crewMap: Record<string, { id: string; name: string; zone: string }> = {};
  if (crewIds.length > 0) {
    const { data: crewData } = await admin.from("crews").select("id, name, zone").in("id", crewIds);
    for (const c of crewData ?? []) {
      if (c?.id) crewMap[c.id] = { id: c.id, name: c.name ?? "—", zone: c.zone ?? "—" };
    }
  }

  const rows: AdminRow[] = typed.map((a) => {
    const uid = a.user_id ?? "";
    const em = uid ? emailMap.get(uid) : undefined;
    return {
      id: a.id,
      user_id: uid,
      email: em && em.length > 0 ? em : "(unknown)",
      crews: a.crew_id ? crewMap[a.crew_id] ?? null : null,
    };
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; password?: string; crew_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, crew_id } = body;
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Missing password" }, { status: 400 });
  if (!crew_id) return NextResponse.json({ error: "Crew is required" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }
  const emailNorm = String(email).trim().toLowerCase();
  const passwordStr = String(password);

  // Find or create auth user
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let authUser = users?.users?.find((u) => (u.email ?? "").toLowerCase() === emailNorm) ?? null;

  if (!authUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: passwordStr,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create auth user" }, { status: 500 });
    }
    authUser = created.user;
  } else {
    // Ensure password gets set/rotated to provided one
    await admin.auth.admin.updateUserById(authUser.id, { password: passwordStr });
  }

  const { data: existing } = await admin
    .from("user_app_roles")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "User is already an admin" }, { status: 409 });
  }

  const { error: insertErr } = await admin
    .from("user_app_roles")
    .insert({ user_id: authUser.id, crew_id, role: "admin" });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, email: emailNorm });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperAdmin(user.id, user.email ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }
  const { data: row } = await admin
    .from("user_app_roles")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = row.user_id === user.id;
  if (isSelf) {
    return NextResponse.json({ error: "Cannot remove your own admin access" }, { status: 403 });
  }

  const { error } = await admin.from("user_app_roles").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
