import { NextRequest, NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminJson } from "@/lib/admin-api-auth";
import {
  getSectionAssignmentInsertRole,
  getSectionAssignmentRolesForQuery,
} from "@/lib/user-app-roles";

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

  let body: { section_ids?: string[]; password?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (process.env.DEBUG_USER_APP_ROLES === "1") {
    console.log("[api/admin/users PATCH] REQUEST BODY:", {
      section_ids: body.section_ids,
      has_password: body.password !== undefined,
      role_from_client: body.role ?? "(omitted — not used)",
      role_used_for_insert: getSectionAssignmentInsertRole(),
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

      const insertRole = getSectionAssignmentInsertRole();
      const inserts = sectionIds.map((section_id) => ({
        user_id: userId,
        user_email: email || null,
        role: insertRole,
        section_id,
      }));

      const { error: insErr } = await admin.from("user_app_roles").insert(inserts);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
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
    .in("role", ["section_admin", "admin"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
