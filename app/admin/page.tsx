import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }
  if (!(await isSuperAdmin(user.id, user.email ?? null))) {
    redirect("/login?error=forbidden");
  }

  return <AdminUsersManager currentUserId={user.id} />;
}
