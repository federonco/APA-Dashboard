import { createClient } from "@/lib/supabase/server";

export async function getServerSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUserRole(
  email: string
): Promise<"superadmin" | "admin" | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("psp_admins")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  const role = data?.role;
  if (role === "superadmin" || role === "admin") return role;
  return null;
}

export async function getAdminCrews(email: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("psp_admins")
    .select("crews")
    .eq("email", email)
    .maybeSingle();
  return (data?.crews as string[] | null) ?? [];
}

export async function logAuditAction(
  superadminEmail: string,
  action: string,
  targetEmail: string | null,
  details: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from("psp_audit_logs").insert({
    superadmin_email: superadminEmail,
    action,
    target_email: targetEmail,
    details,
  });
}
