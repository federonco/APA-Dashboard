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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminJson();
  if (!auth.ok) {
    return auth.response;
  }

  const { id: userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: {
    section_ids?: string[];
    app_assignments?: { app_id?: string }[];
    password?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (process.env.DEBUG_USER_APP_ROLES === "1") {
    console.log("[api/admin/users PATCH] REQUEST BODY:", {
      section_ids: body.section_ids,
      app_assignments: body.app_assignments,
      has_password: body.password !== undefined,
      role_from_client: body.role ?? "(omitted — not used)",
      role_used_for_section_insert: getSectionAssignmentInsertRole(),
    });
  }

  const admin = requireAdminClient();

  if (body.password !== undefined) {
    const pwd = String(body.password);
    if (pwd.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, { password: pwd });
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr.message }, { status: 500 });
    }
  }

  if (body.section_ids !== undefined) {
    const sectionIds = Array.isArray(body.section_ids) ? body.section_ids : [];
    const { error: delErr } = await admin
      .from("user_app_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", [...getSectionAssignmentRolesForQuery()])
      .not("section_id", "is", null);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (sectionIds.length > 0) {
      const { data: profile } = await admin
        .from("user_app_roles")
        .select("user_email")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      let email =
        (profile as { user_email?: string } | null)?.user_email?.trim() ?? "";
      if (!email) {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        email = (u.user?.email ?? "").trim();
      }

      const resolved = await resolveSectionAppPairsForInsert(admin, sectionIds);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 400 });
      }

      const insertRole = getSectionAssignmentInsertRole();
      const rows = resolved.pairs.map((p) => ({
        user_id: userId,
        user_email: email || null,
        role: insertRole,
        section_id: p.section_id,
        app_id: p.app_id,
      }));
      const rowsToInsert = rows.filter(isValidUserAppRoleInsertRow);
      if (rowsToInsert.length === 0) {
        return NextResponse.json({ error: "No valid section rows to insert" }, { status: 400 });
      }
      console.log("USER_APP_ROLE_ROWS_TO_INSERT:", rowsToInsert);
      const { error: insErr } = await admin.from("user_app_roles").insert(rowsToInsert);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }
  }

  if (body.app_assignments !== undefined) {
    const raw = Array.isArray(body.app_assignments) ? body.app_assignments : [];
    const appAssignments: { app_id: string; role: string }[] = [];
    for (const a of raw) {
      const aid = String(a?.app_id ?? "").trim();
      if (!aid) continue;
      appAssignments.push({ app_id: aid, role: APP_ASSIGNMENT_INSERT_ROLE });
    }
    const ids = new Set(appAssignments.map((x) => x.app_id));
    if (ids.size !== appAssignments.length) {
      return NextResponse.json({ error: "Duplicate app_id in app_assignments" }, { status: 400 });
    }

    const { error: delAppErr } = await admin
      .from("user_app_roles")
      .delete()
      .eq("user_id", userId)
      .is("section_id", null)
      .not("app_id", "is", null);
    if (delAppErr) {
      return NextResponse.json({ error: delAppErr.message }, { status: 500 });
    }

    if (appAssignments.length > 0) {
      let email = "";
      const { data: profile } = await admin
        .from("user_app_roles")
        .select("user_email")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      email = (profile as { user_email?: string } | null)?.user_email?.trim() ?? "";
      if (!email) {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        email = (u.user?.email ?? "").trim();
      }

      const rows = appAssignments.map((a) => ({
        user_id: userId,
        user_email: email || null,
        role: a.role,
        section_id: null,
        app_id: a.app_id,
      }));
      const rowsToInsert = rows.filter(isValidUserAppRoleInsertRow);
      if (rowsToInsert.length === 0) {
        return NextResponse.json({ error: "No valid app assignments to insert" }, { status: 400 });
      }
      console.log("USER_APP_ROLE_ROWS_TO_INSERT:", rowsToInsert);
      const { error: insAppErr } = await admin.from("user_app_roles").insert(rowsToInsert);
      if (insAppErr) {
        return NextResponse.json({ error: insAppErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminJson();
  if (!auth.ok) {
    return auth.response;
  }

  const { id: userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ error: "You cannot remove your own access" }, { status: 403 });
  }

  const admin = requireAdminClient();

  const { error } = await admin
    .from("user_app_roles")
    .delete()
    .eq("user_id", userId)
    .neq("role", "super_admin");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
