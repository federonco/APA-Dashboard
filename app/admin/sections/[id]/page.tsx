import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { getSectionAssignmentRolesForQuery } from "@/lib/user-app-roles";
import { tokens } from "@/lib/designTokens";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSectionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/admin/sections/${id}`);
  }
  if (!(await isSuperAdmin(user.id, user.email ?? null))) {
    redirect("/login?error=forbidden");
  }

  const admin = requireAdminClient();
  const { data: section, error } = await admin
    .from("sections")
    .select("id, name, scope, start_ch, end_ch, direction, crew_id, crews(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded border px-4 py-3 text-sm" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
        {error.message}
      </div>
    );
  }
  if (!section) {
    notFound();
  }

  const { data: admins } = await admin
    .from("user_app_roles")
    .select("user_id, user_email, role")
    .eq("section_id", id)
    .in("role", [...getSectionAssignmentRolesForQuery()]);

  const crewName = (section as { crews?: { name?: string | null } }).crews?.name ?? "—";

  return (
    <div className="space-y-6">
      <Link href="/admin/sections" className="text-sm font-medium hover:underline" style={{ color: "#B96A2D" }}>
        ← Sections
      </Link>

      <div
        className="rounded-lg border p-5"
        style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
      >
        <h2 className="text-lg font-semibold" style={{ color: "#3f3f46" }}>
          {section.name}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm" style={{ color: "#52525b" }}>
          <div>
            <dt className="inline text-xs uppercase" style={{ color: "#9ca3af" }}>
              Scope
            </dt>
            : {section.scope ?? "—"}
          </div>
          <div>
            <dt className="inline text-xs uppercase" style={{ color: "#9ca3af" }}>
              Crew
            </dt>
            : {crewName}
          </div>
          <div>
            <dt className="inline text-xs uppercase" style={{ color: "#9ca3af" }}>
              Chainage
            </dt>
            :{" "}
            {section.start_ch != null || section.end_ch != null
              ? `${section.start_ch ?? "—"} – ${section.end_ch ?? "—"}${section.direction ? ` (${section.direction})` : ""}`
              : "—"}
          </div>
        </dl>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "#EEECEF" }}>
          <h3 className="font-medium uppercase tracking-wide" style={{ fontSize: "13px", color: "#52525b" }}>
            Assigned administrators
          </h3>
        </div>
        <ul className="divide-y" style={{ borderColor: "#EEECEF" }}>
          {(admins ?? []).length === 0 ? (
            <li className="px-5 py-6 text-sm" style={{ color: "#71717a" }}>
              No section administrators assigned.
            </li>
          ) : (
            (admins ?? []).map((a) => (
              <li key={`${a.user_id}-${a.user_email}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span style={{ color: "#3f3f46" }}>{a.user_email ?? a.user_id}</span>
                <span className="text-xs" style={{ color: "#9ca3af" }}>
                  {a.role}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
