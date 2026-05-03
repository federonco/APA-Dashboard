import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err?.message) return false;
  const m = err.message.toLowerCase();
  return (
    err.code === "42P01" ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

const debugAuth = () => process.env.DEBUG_ADMIN_AUTH === "1";

/**
 * Shared super-admin resolution for middleware (Edge) and API routes (Node).
 * Uses service-role Supabase client only — no Next.js server imports.
 *
 * Checks (in order):
 * 1) user_app_roles: user_id + role = super_admin (first row if duplicates exist).
 *    Uses .limit(1) instead of .maybeSingle() so duplicate rows do not fail the check.
 * 2) super_admins: user_id match (legacy migration `20260314000000_create_super_admins_table.sql`)
 * 3) super_admins: email match (when user_id not linked yet)
 */
export async function checkSuperAdminServiceRole(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<boolean> {
  const { data: uarRows, error: uarErr } = await admin
    .from("user_app_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .limit(1);

  if (uarErr) {
    console.error("[super-admin-check] user_app_roles query error:", uarErr.message);
    return false;
  }
  if (debugAuth()) {
    console.log("[super-admin-check] user_app_roles super_admin rows:", uarRows?.length ?? 0, {
      userId,
    });
  }
  if ((uarRows?.length ?? 0) > 0) return true;

  const { data: saUidRows, error: saUidErr } = await admin
    .from("super_admins")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (saUidErr && !isMissingTableError(saUidErr)) {
    console.error("[super-admin-check] super_admins (user_id) error:", saUidErr.message);
  }
  if ((saUidRows?.length ?? 0) > 0) return true;

  const em = email?.trim().toLowerCase();
  if (em) {
    const { data: saEmailRows, error: saEmailErr } = await admin
      .from("super_admins")
      .select("id")
      .eq("email", em)
      .limit(1);
    if (saEmailErr && !isMissingTableError(saEmailErr)) {
      console.error("[super-admin-check] super_admins (email) error:", saEmailErr.message);
    }
    if ((saEmailRows?.length ?? 0) > 0) return true;
  }

  if (debugAuth()) {
    console.log("[super-admin-check] denied", { userId, email: em ?? email });
  }
  return false;
}
