import { NextRequest, NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminJson } from "@/lib/admin-api-auth";
import {
  APP_ASSIGNMENT_INSERT_ROLE,
  getSectionAssignmentInsertRole,
  getSectionAssignmentRolesForQuery,
} from "@/lib/user-app-roles";
import {
  isValidUserAppRoleInsertRow,
  resolveSectionAppPairsForInsert,
} from "@/lib/resolve-section-app-ids";
import { ensureAuthUserForAdminRow } from "@/lib/ensure-auth-user-for-admin";

type RoleRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  role: string | null;
  section_id: string | null;
  app_id: string | null;
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
  /** App-only rows: app_id set, section_id null */
  apps: { app_id: string; role: string | null }[];
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
      "id, user_id, user_email, role, section_id, app_id, crew_id, created_at, sections(name), crews(name)"
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
        apps: [],
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
    if (r.app_id && !r.section_id) {
      const idx = g.apps.findIndex((x) => x.app_id === r.app_id);
      const row = { app_id: r.app_id, role: r.role };
      if (idx >= 0) g.apps[idx] = row;
      else g.apps.push(row);
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

  let body: {
    email?: string;
    password?: string;
    section_ids?: string[];
    app_assignments?: { app_id?: string }[];
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const appAssignmentsIn = Array.isArray(body.app_assignments) ? body.app_assignments : [];
  const appAssignments: { app_id: string; role: string }[] = [];
  for (const a of appAssignmentsIn) {
    const aid = String(a?.app_id ?? "").trim();
    if (!aid) continue;
    appAssignments.push({ app_id: aid, role: APP_ASSIGNMENT_INSERT_ROLE });
  }
  const appIds = new Set(appAssignments.map((a) => a.app_id));
  if (appIds.size !== appAssignments.length) {
    return NextResponse.json({ error: "Duplicate app_id in app_assignments" }, { status: 400 });
  }

  if (process.env.DEBUG_USER_APP_ROLES === "1") {
    console.log("[api/admin/users POST] REQUEST BODY:", {
      email: body.email,
      section_ids: body.section_ids,
      app_assignments: appAssignments,
      role_from_client: body.role ?? "(omitted — not used)",
      role_used_for_section_insert: getSectionAssignmentInsertRole(),
    });
  }

  const emailRaw = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const sectionIds = Array.isArray(body.section_ids) ? body.section_ids : [];

  if (!emailRaw) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (sectionIds.length === 0 && appAssignments.length === 0) {
    return NextResponse.json(
      { error: "Select at least one section and/or one application" },
      { status: 400 }
    );
  }

  const admin = requireAdminClient();

  let authResult;
  try {
    authResult = await ensureAuthUserForAdminRow(admin, emailRaw, password);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Auth lookup failed" },
      { status: 500 }
    );
  }
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: 400 });
  }

  const uid = authResult.user.id;

  if (process.env.DEBUG_USER_APP_ROLES === "1") {
    console.log("[api/admin/users POST] auth outcome:", authResult.outcome);
  }

  let existingSectionSet = new Set<string>();
  if (sectionIds.length > 0) {
    const { data: existingSectionRoles } = await admin
      .from("user_app_roles")
      .select("section_id")
      .eq("user_id", uid)
      .in("role", [...getSectionAssignmentRolesForQuery()])
      .in("section_id", sectionIds);
    existingSectionSet = new Set(
      (existingSectionRoles ?? []).map((r) => r.section_id).filter(Boolean) as string[]
    );
  }

  const toInsertSections = sectionIds.filter((sid) => sid && !existingSectionSet.has(sid));

  let existingAppSet = new Set<string>();
  if (appAssignments.length > 0) {
    const { data: existingAppRoles } = await admin
      .from("user_app_roles")
      .select("app_id")
      .eq("user_id", uid)
      .is("section_id", null)
      .not("app_id", "is", null);
    existingAppSet = new Set(
      (existingAppRoles ?? []).map((r) => r.app_id).filter(Boolean) as string[]
    );
  }

  const toInsertApps = appAssignments.filter((a) => !existingAppSet.has(a.app_id));

  if (toInsertSections.length === 0 && toInsertApps.length === 0) {
    return NextResponse.json(
      { error: "This user already has those sections and application assignments" },
      { status: 409 }
    );
  }

  const insertRole = getSectionAssignmentInsertRole();
  const rows: {
    user_id: string;
    user_email: string;
    role: string;
    section_id: string | null;
    app_id: string | null;
  }[] = [];

  if (toInsertSections.length > 0) {
    const resolved = await resolveSectionAppPairsForInsert(admin, toInsertSections);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.message }, { status: 400 });
    }
    for (const p of resolved.pairs) {
      rows.push({
        user_id: uid,
        user_email: emailRaw,
        role: insertRole,
        section_id: p.section_id,
        app_id: p.app_id,
      });
    }
  }
  for (const a of toInsertApps) {
    rows.push({
      user_id: uid,
      user_email: emailRaw,
      role: a.role,
      section_id: null,
      app_id: a.app_id,
    });
  }

  const rowsToInsert = rows.filter(isValidUserAppRoleInsertRow);
  if (rowsToInsert.length === 0) {
    return NextResponse.json({ error: "Nothing to insert" }, { status: 409 });
  }

  console.log("USER_APP_ROLE_ROWS_TO_INSERT:", rowsToInsert);

  const { error: insErr } = await admin.from("user_app_roles").insert(rowsToInsert);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user_id: uid,
    added_sections: toInsertSections.length,
    added_apps: toInsertApps.length,
    auth_outcome: authResult.outcome,
  });
}
