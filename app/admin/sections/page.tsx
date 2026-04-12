import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { tokens } from "@/lib/designTokens";

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

  const admin = requireAdminClient();
  const { data: sections, error } = await admin
    .from("sections")
    .select("id, name, scope, start_ch, end_ch, direction, crew_id, crews(name)")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return (
      <div className="rounded border px-4 py-3 text-sm" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
        {error.message}
      </div>
    );
  }

  const { data: roleRows } = await admin
    .from("user_app_roles")
    .select("section_id")
    .eq("role", "section_admin")
    .not("section_id", "is", null);

  const counts = new Map<string, number>();
  for (const r of roleRows ?? []) {
    const sid = (r as { section_id?: string }).section_id;
    if (!sid) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  const rows = sections ?? [];

  const chainage = (s: {
    start_ch: number | null;
    end_ch: number | null;
    direction: string | null;
  }) => {
    if (s.start_ch == null && s.end_ch == null) return "—";
    const a = s.start_ch ?? "—";
    const b = s.end_ch ?? "—";
    const d = s.direction ? ` (${s.direction})` : "";
    return `${a} – ${b}${d}`;
  };

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
    >
      <div className="border-b px-5 py-3" style={{ borderColor: "#EEECEF" }}>
        <h2 className="font-medium uppercase tracking-wide" style={{ fontSize: "13px", color: "#52525b" }}>
          Active sections
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm" style={{ color: "#3f3f46" }}>
          <thead>
            <tr style={{ background: "#F7F7F7", borderBottom: `1px solid ${tokens.theme.border}` }}>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                Name
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                Scope
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                Crew
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                Admins
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                Chainage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const crewName = (s as { crews?: { name?: string | null } }).crews?.name ?? "—";
              return (
                <tr key={s.id} className="border-b transition-colors hover:bg-[#fafafa]" style={{ borderColor: "#EEECEF" }}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sections/${s.id}`}
                      className="font-medium hover:underline"
                      style={{ color: "#B96A2D" }}
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{s.scope ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{crewName}</td>
                  <td className="px-4 py-3 text-xs">{counts.get(s.id) ?? 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                    {chainage(s)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "#71717a" }}>
            No sections yet.
          </div>
        )}
      </div>
    </div>
  );
}
