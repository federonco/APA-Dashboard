import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CrewInfo = {
  id: string;
  name: string;
  zone: string;
};

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getAdminCrew(): Promise<CrewInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows, error: roleErr } = await supabase
    .from("user_app_roles")
    .select("crew_id")
    .eq("user_id", user.id)
    .not("crew_id", "is", null)
    .order("crew_id", { ascending: true })
    .limit(1);

  if (roleErr) return null;
  const crewId = roleRows?.[0]?.crew_id;
  if (!crewId) return null;

  const { data: crew } = await supabase
    .from("crews")
    .select("id, name, zone")
    .eq("id", crewId)
    .single();

  return crew ? { id: crew.id, name: crew.name, zone: crew.zone } : null;
}

/** Check if user is super admin (access to /admin). Uses user_app_roles with role super_admin. */
export async function isSuperAdmin(userId: string, email: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("user_app_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();
  return !!data;
}
