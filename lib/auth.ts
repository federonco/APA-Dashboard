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

  let { data: admin } = await supabase
    .from("psp_admins")
    .select("crew_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin && user.email) {
    const r = await supabase
      .from("psp_admins")
      .select("crew_id")
      .eq("email", user.email)
      .maybeSingle();
    admin = r.data;
  }

  if (!admin?.crew_id) return null;

  const { data: crew } = await supabase
    .from("crews")
    .select("id, name, zone")
    .eq("id", admin.crew_id)
    .single();

  return crew ? { id: crew.id, name: crew.name, zone: crew.zone } : null;
}

/** Check if user is super admin (access to /admin). Uses super_admins table. */
export async function isSuperAdmin(userId: string, email: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data: byUserId } = await admin
    .from("super_admins")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (byUserId) return true;
  if (email) {
    const { data: byEmail } = await admin
      .from("super_admins")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (byEmail) return true;
  }
  return false;
}
