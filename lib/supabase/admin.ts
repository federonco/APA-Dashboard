import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using service role key.
 * Bypasses RLS — use only for server-side operational queries.
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SECRET_SUPABASE_SERVICE_ROLE_KEY ??
    "";
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
