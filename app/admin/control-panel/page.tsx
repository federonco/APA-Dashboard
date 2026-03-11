import { getServerSession, getUserRole } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import AdminControlPanel from "@/components/admin/AdminControlPanel";

export const metadata = {
  title: "Admin Control Panel - APA Dashboard",
};

export default async function ControlPanelPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const role = await getUserRole(session.user.email!);
  if (role !== "superadmin") redirect("/");

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="border-b border-[#1e1e1e] bg-[#0a0a0a] p-6">
        <h1 className="font-barlow mb-2 text-2xl font-bold uppercase text-white">
          Admin Control Panel
        </h1>
        <p className="text-sm text-[#999]">
          Manage admins, crews, and access
        </p>
      </div>

      <div className="p-6">
        <AdminControlPanel superadminEmail={session.user.email!} />
      </div>
    </div>
  );
}
