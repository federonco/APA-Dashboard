import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function adminUrlAndKey(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SECRET_SUPABASE_SERVICE_ROLE_KEY ??
    "";
  return { url, key };
}

/**
 * Admin Supabase client using service role key.
 * Bypasses RLS — use only for server-side operational queries.
 * Never expose this client to the browser.
 * Returns null if URL or service role key is missing (local dev without .env).
 */
export function createAdminClient(): SupabaseClient | null {
  const { url, key } = adminUrlAndKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Use where admin access is required (e.g. /admin, admin API routes).
 */
export function requireAdminClient(): SupabaseClient {
  const client = createAdminClient();
  if (!client) {
    throw new Error(
      "Missing Supabase service role: add SUPABASE_SERVICE_ROLE_KEY (or SECRET_SUPABASE_SERVICE_ROLE_KEY) to .env.local"
    );
  }
  return client;
}
