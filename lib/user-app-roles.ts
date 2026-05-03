/**
 * user_app_roles is constrained by CHECK (valid_role) in Postgres.
 * Run in Supabase SQL editor to see allowed values:
 *   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'valid_role';
 *
 * Section-scoped dashboard rows use a role from this list **plus** section_id.
 * Override via USER_APP_ROLES_SECTION_ROLE if your DB uses a different slug
 * (e.g. app_admin) — must match valid_role exactly (lowercase recommended).
 */
export const LEGACY_SECTION_ADMIN_ROLE = "section_admin" as const;

const DEFAULT_SECTION_INSERT_ROLE = "admin";

/** Role string used on INSERT for section assignments (server-side only; UI does not send role). */
export function getSectionAssignmentInsertRole(): string {
  const raw = process.env.USER_APP_ROLES_SECTION_ROLE?.trim().toLowerCase();
  if (raw && /^[a-z][a-z0-9_]*$/.test(raw)) {
    return raw;
  }
  return DEFAULT_SECTION_INSERT_ROLE;
}

/** Roles to match when listing/counting section assignments (current + legacy). */
export function getSectionAssignmentRolesForQuery(): readonly string[] {
  const current = getSectionAssignmentInsertRole();
  const set = new Set<string>([current, LEGACY_SECTION_ADMIN_ROLE, DEFAULT_SECTION_INSERT_ROLE]);
  return [...set];
}

/** Fixed role for app-scoped rows (`app_id` set, `section_id` null). Only value exposed in admin UI. */
export const APP_ASSIGNMENT_INSERT_ROLE = "admin" as const;
