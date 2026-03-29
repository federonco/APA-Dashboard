import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPanel } from "@/components/dashboard/AdminPanel";

export type AdminWithCrew = {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  crews: { id: string; name: string; zone: string } | null;
};

export type CrewWithZone = { id: string; name: string; zone: string };

async function getSessionUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

// Uses user_app_roles table. Only super_admins can access /admin.
async function canAccessAdmin(userId: string, userEmail: string | null): Promise<boolean> {
  const { isSuperAdmin } = await import("@/lib/auth");
  return isSuperAdmin(userId, userEmail);
}

async function fetchAdminList(crews: CrewWithZone[]): Promise<AdminWithCrew[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: roleRows, error } = await admin
    .from("user_app_roles")
    .select("id, user_id, crew_id")
    .eq("role", "admin");
  if (error) return [];
  if (!roleRows?.length) return [];
  type RoleRow = { id: string; user_id: string | null; crew_id?: string | null };
  const typed = roleRows as RoleRow[];
  const userIds = typed.map((r) => r.user_id).filter((id): id is string => !!id);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("auth_user_id, email")
      .in("auth_user_id", [...new Set(userIds)]);
    for (const p of profiles ?? []) {
      const uid = (p as { auth_user_id?: string }).auth_user_id;
      const em = (p as { email?: string | null }).email;
      if (uid) emailMap.set(uid, em?.trim() ?? "");
    }
  }
  const crewMap = new Map(crews.map((c) => [c.id, c]));
  return typed.map((a) => {
    const crew = a.crew_id ? crewMap.get(a.crew_id) : null;
    const uid = a.user_id ?? "";
    return {
      id: a.id,
      user_id: uid,
      email: uid ? emailMap.get(uid) ?? "" : "",
      created_at: "",
      crews: crew ?? null,
    };
  });
}

async function fetchCrews(): Promise<CrewWithZone[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("crews").select("id, name, zone").order("name");
  if (error || !data) return [];
  return data.map((c) => ({ id: c.id, name: c.name ?? "", zone: c.zone ?? "" }));
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/admin");
  if (!(await canAccessAdmin(user.id, user.email))) redirect("/");

  const crews = await fetchCrews();
  const admins = await fetchAdminList(crews);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#F7F7F7",
        fontFamily: "var(--font-manrope), sans-serif",
      }}
    >
      <header
        className="border-b"
        style={{
          padding: "20px 40px",
          background: "#FCFBFB",
          borderColor: "#E8E6EB",
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: "#3f3f46" }}
        >
          Crew Admin Management
        </h1>
        <Link
          href="/"
          className="text-sm"
          style={{ color: "#B96A2D", marginTop: 4, display: "inline-block" }}
        >
          ← Back to Dashboard
        </Link>
      </header>
      <main style={{ padding: "32px 40px" }}>
        <AdminPanel admins={admins} crews={crews} currentUserId={user.id} />
      </main>
    </div>
  );
}
