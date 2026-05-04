import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSuperAdminServiceRole } from "@/lib/super-admin-check";

/** Matches `public.apps.id` for this dashboard (`user_app_roles.app_id`). */
export const DASHBOARD_APP_ID = "apa-dashboard";

/**
 * Roles on `user_app_roles` for `DASHBOARD_APP_ID` that grant access to "/".
 * Includes viewer/operator/inspector for dashboard viewing; minimum business rule remains admin/super_admin assignments in practice.
 */
export const DASHBOARD_APP_ACCESS_ROLES = [
  "admin",
  "super_admin",
  "viewer",
  "operator",
  "inspector",
] as const;

/**
 * True if the user may access the main dashboard ("/"): either legacy/global
 * super_admin resolution, or at least one `user_app_roles` row for this app
 * with an allowed role.
 */
export async function isDashboardUser(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<boolean> {
  if (await checkSuperAdminServiceRole(admin, userId, email)) {
    return true;
  }
  const { data: rows, error } = await admin
    .from("user_app_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("app_id", DASHBOARD_APP_ID)
    .in("role", [...DASHBOARD_APP_ACCESS_ROLES])
    .limit(1);
  if (error) {
    console.error("[dashboard-access-check] user_app_roles query error:", error.message);
    return false;
  }
  return (rows?.length ?? 0) > 0;
}

/** @deprecated Prefer {@link isDashboardUser}; kept for stable import paths. */
export async function checkMainDashboardAccessServiceRole(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<boolean> {
  return isDashboardUser(admin, userId, email);
}
