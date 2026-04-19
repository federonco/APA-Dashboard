import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { SectionsManager } from "@/components/admin/SectionsManager";

export default async function AdminSectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin/sections");
  }
  if (!(await isSuperAdmin(user.id, user.email ?? null))) {
    redirect("/login?error=forbidden");
  }

  return <SectionsManager />;
}
