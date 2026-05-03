import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";

const debugAuth = () => process.env.DEBUG_ADMIN_AUTH === "1";

/**
 * Single entry for /api/admin/* routes: session + super-admin check.
 * When DEBUG_ADMIN_AUTH=1, logs to server console and adds a `debug` object to 401 JSON.
 */
export async function requireSuperAdminJson(): Promise<
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (debugAuth()) {
    console.log("[admin-api-auth] getUser:", {
      id: user?.id ?? null,
      email: user?.email ?? null,
    });
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Unauthorized",
          ...(debugAuth() ? { debug: { reason: "no_session" as const } } : {}),
        },
        { status: 401 },
      ),
    };
  }

  const svc = createAdminClient();
  if (!svc) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Unauthorized",
          ...(debugAuth()
            ? { debug: { reason: "no_service_role_env" as const, hint: "SUPABASE_SERVICE_ROLE_KEY" } }
            : {}),
        },
        { status: 401 },
      ),
    };
  }

  const allowed = await isSuperAdmin(user.id, user.email ?? null);
  if (debugAuth()) {
    console.log("[admin-api-auth] isSuperAdmin:", allowed, { userId: user.id });
  }

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Unauthorized",
          ...(debugAuth()
            ? { debug: { reason: "not_super_admin" as const, userId: user.id } }
            : {}),
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true, user };
}
