import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { checkSuperAdminServiceRole } from "@/lib/super-admin-check";
import { isDashboardUser } from "@/lib/dashboard-access-check";

function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SECRET_SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

function createMiddlewareServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function isSuperAdminForMiddleware(
  userId: string,
  email: string | null,
): Promise<boolean> {
  const admin = createMiddlewareServiceClient();
  if (!admin) return false;
  return checkSuperAdminServiceRole(admin, userId, email);
}

/** "/" — session + dashboard app roles only (no /admin super_admin gate). */
async function hasMainDashboardAccessForMiddleware(
  userId: string,
  email: string | null,
): Promise<boolean> {
  const admin = createMiddlewareServiceClient();
  if (!admin) return false;
  return isDashboardUser(admin, userId, email);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isMainDashboard = pathname === "/";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApiRoute =
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isMainDashboard || isAdminRoute) {
      return NextResponse.redirect(new URL("/login?error=config", request.url));
    }
    if (isAdminApiRoute) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * Admin API: only run through middleware for Supabase SSR cookie refresh.
   * No redirect, no super_admin check here — route handlers enforce auth.
   */
  if (isAdminApiRoute) {
    return response;
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  if (isMainDashboard) {
    // Not isSuperAdminForMiddleware: "/" uses isDashboardUser (apa-dashboard roles + super_admin fallback).
    const allowed = await hasMainDashboardAccessForMiddleware(user.id, user.email ?? null);
    if (!allowed) {
      const login = new URL("/login", request.url);
      login.searchParams.set("error", "no_dashboard_access");
      return NextResponse.redirect(login);
    }
    return response;
  }

  if (isAdminRoute) {
    const allowed = await isSuperAdminForMiddleware(user.id, user.email ?? null);
    if (!allowed) {
      const login = new URL("/login", request.url);
      login.searchParams.set("error", "forbidden");
      return NextResponse.redirect(login);
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin", "/admin/:path*", "/api/admin/:path*"],
};
