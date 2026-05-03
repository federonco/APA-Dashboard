import { NextRequest, NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminJson } from "@/lib/admin-api-auth";
import {
  getSectionAssignmentInsertRole,
  getSectionAssignmentRolesForQuery,
} from "@/lib/user-app-roles";

type RoleRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  role: string | null;
  section_id: string | null;
  crew_id: string | null;
  created_at: string | null;
  sections: { name: string | null } | { name: string | null }[] | null;
  crews: { name: string | null } | { name: string | null }[] | null;
};

export type GroupedAdmin = {
  user_id: string;
  user_email: string;
  roles: string[];
  sections: { id: string | null; name: string | null }[];
  crew_label: string | null;
  created_at: string | null;
  row_ids: string[];
};

export async function GET() {
  const auth = await requireSuperAdminJson();
  if (!auth.ok) {
    return auth.response;
  }

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from("user_app_roles")
    .select(
      "id, user_id, user_email, role, section_id, crew_id, created_at, sections(name), crews(name)"
    )
    .neq("role", "super_admin")
    .order("user_email", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as RoleRow[];
  const byUser = new Map<string, GroupedAdmin>();

  function embedName(
    v: { name: string | null } | { name: string | null }[] | null | undefined
  ): string | null {
    if (!v) return null;
    if (Array.isArray(v)) return v[0]?.name ?? null;
    return v.name ?? null;
  }

  for (const r of rows) {
    const uid = r.user_id ?? "";
    if (!uid) continue;
    const email = (r.user_email ?? "").trim() || "(no email)";
    const key = uid;
    let g = byUser.get(key);
    if (!g) {
      g = {
        user_id: uid,
        user_email: email,
        roles: [],
        sections: [],
        crew_label: null,
        created_at: r.created_at,
        row_ids: [],
      };
      byUser.set(key, g);
    }
    g.row_ids.push(r.id);
    if (r.role && !g.roles.includes(r.role)) {
      g.roles.push(r.role);
    }
    if (r.section_id) {
      g.sections.push({
        id: r.section_id,
        name: embedName(r.sections),
      });
    }
    const crewNm = embedName(r.crews);
    if (r.crew_id && crewNm) {
      g.crew_label = `Crew ${crewNm}`;
    }
    if (r.created_at) {
      if (!g.created_at || r.created_at < g.created_at) {
        g.created_at = r.created_at;
      }
    }
  }

  return NextResponse.json([...byUser.values()]);
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminJson();
  if (!auth.ok) {
    return auth.response;
  }

  let body: { email?: string; password?: string; section_ids?: string[]; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (process.env.DEBUG_USER_APP_ROLES === "1") {
    console.log("[api/admin/users POST] REQUEST BODY:", {
      email: body.email,
      section_ids: body.section_ids,
      role_from_client: body.role ?? "(omitted — not used)",
      role_used_for_insert: getSectionAssignmentInsertRole(),
    });
  }

  const emailRaw = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const sectionIds = Array.isArray(body.section_ids) ? body.section_ids : [];

  if (!emailRaw) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (sectionIds.length === 0) {
    return NextResponse.json({ error: "Select at least one section" }, { status: 400 });
  }

  const admin = requireAdminClient();

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let authUserRow = list?.users?.find((u) => (u.email ?? "").toLowerCase() === emailRaw) ?? null;

  if (!authUserRow) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailRaw,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Could not create user" },
        { status: 500 }
      );
    }
    authUserRow = created.user;
  }

  const uid = authUserRow.id;

  const { data: existingSectionRoles } = await admin
    .from("user_app_roles")
    .select("section_id")
    .eq("user_id", uid)
    .in("role", [...getSectionAssignmentRolesForQuery()])
    .in("section_id", sectionIds);

  const existingSet = new Set(
    (existingSectionRoles ?? []).map((r) => r.section_id).filter(Boolean) as string[]
  );

  const toInsert = sectionIds.filter((sid) => sid && !existingSet.has(sid));
  if (toInsert.length === 0) {
    return NextResponse.json({ error: "This user already has those sections" }, { status: 409 });
  }

  const insertRole = getSectionAssignmentInsertRole();
  const inserts = toInsert.map((section_id) => ({
    user_id: uid,
    user_email: emailRaw,
    role: insertRole,
    section_id,
  }));

  const { error: insErr } = await admin.from("user_app_roles").insert(inserts);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: uid, added: toInsert.length });
}
