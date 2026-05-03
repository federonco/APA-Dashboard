import type { SupabaseClient, User } from "@supabase/supabase-js";

const LIST_PER_PAGE = 200;

/**
 * Find an auth user by email, paginating listUsers (avoids missing users when > perPage).
 */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PER_PAGE });
    if (error) {
      throw new Error(error.message);
    }
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === target) ?? null;
    if (u) return u;
    if (data.users.length < LIST_PER_PAGE) return null;
    page += 1;
  }
}

export type AdminAuthOutcome =
  | "existing"
  | "existing_password_updated"
  | "created_with_password"
  | "invited";

/**
 * Ensures a Supabase Auth user exists for Dashboard-managed admins so sibling apps
 * (e.g. OnSite-D) can sign in with the same project Auth.
 *
 * - New + password (min 6): createUser.
 * - New + no password: inviteUserByEmail (Supabase sends set-password / magic link) if available.
 * - Existing + password: updateUser to set/reset password (optional, helps password-only apps).
 * - Existing + no password: use existing id (roles only).
 */
export async function ensureAuthUserForAdminRow(
  admin: SupabaseClient,
  emailRaw: string,
  password: string
): Promise<
  { ok: true; user: User; outcome: AdminAuthOutcome } | { ok: false; message: string }
> {
  const existing = await findAuthUserByEmail(admin, emailRaw);

  if (existing) {
    if (password.length >= 6) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      return { ok: true, user: existing, outcome: "existing_password_updated" };
    }
    return { ok: true, user: existing, outcome: "existing" };
  }

  if (password.length >= 6) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailRaw,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return { ok: false, message: error?.message ?? "Could not create user" };
    }
    return { ok: true, user: data.user, outcome: "created_with_password" };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emailRaw, {
    data: { source: "apa_dashboard_admin" },
  });
  if (error) {
    return {
      ok: false,
      message: `${error.message} Alternatively set a password (min 6 characters) to create the user without email.`,
    };
  }
  if (!data.user) {
    return {
      ok: false,
      message:
        "Invite returned no user. Set a password (min 6 characters) or check Supabase Auth email settings.",
    };
  }
  return { ok: true, user: data.user, outcome: "invited" };
}
