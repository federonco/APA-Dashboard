import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPanel } from "@/components/dashboard/AdminPanel";

export type AdminWithCrew = {
  id: string;
  user_id: string;
  role: string;
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

// Uses psp_admins (schema table). Match by user_id or email when user_id is null.
async function isAdmin(userId: string, userEmail: string | null): Promise<boolean> {
  const admin = createAdminClient();
  const { data: byUserId } = await admin
    .from("psp_admins")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (byUserId) return true;
  if (userEmail) {
    const { data: byEmail } = await admin
      .from("psp_admins")
      .select("id")
      .eq("email", userEmail)
      .limit(1)
      .maybeSingle();
    if (byEmail) return true;
  }
  return false;
}

async function fetchAdminList(crews: CrewWithZone[]): Promise<AdminWithCrew[]> {
  const admin = createAdminClient();
  const { data: admins, error } = await admin
    .from("psp_admins")
    .select("id, user_id, email, crew_id");
  if (error) return [];
  if (!admins?.length) return [];
  const crewMap = new Map(crews.map((c) => [c.id, c]));
  return (admins as Array<{ id: string; user_id: string | null; email?: string | null; crew_id?: string | null }>).map((a) => {
    const crew = a.crew_id ? crewMap.get(a.crew_id) : null;
    return {
      id: a.id,
      user_id: a.user_id ?? "",
      role: "admin",
      created_at: "",
      crews: crew ?? null,
    };
  });
}

async function fetchCrews(): Promise<CrewWithZone[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("crews").select("id, name, zone").order("name");
  if (error || !data) return [];
  return data.map((c) => ({ id: c.id, name: c.name ?? "", zone: c.zone ?? "" }));
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/admin");
  if (!(await isAdmin(user.id, user.email))) redirect("/");

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
          style={{ color: "#f97316", marginTop: 4, display: "inline-block" }}
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
