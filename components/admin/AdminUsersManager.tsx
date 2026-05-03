"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GroupedAdmin } from "@/app/api/admin/users/route";
import { APP_ASSIGNMENT_INSERT_ROLE } from "@/lib/user-app-roles";
import { tokens } from "@/lib/designTokens";

type SectionOption = {
  id: string;
  name: string;
  scope: string | null;
  crew_name: string | null;
};

type AppOption = { id: string; name: string };

export function AdminUsersManager({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<GroupedAdmin[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<GroupedAdmin | null>(null);
  const [deleteUser, setDeleteUser] = useState<GroupedAdmin | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, sRes, aRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/sections", { credentials: "include" }),
        fetch("/api/admin/apps", { credentials: "include" }),
      ]);
      if (!uRes.ok) {
        const d = await uRes.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to load administrators");
      }
      if (!sRes.ok) {
        const d = await sRes.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to load sections");
      }
      if (!aRes.ok) {
        const d = await aRes.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to load applications");
      }
      const uData = (await uRes.json()) as GroupedAdmin[];
      const sData = (await sRes.json()) as SectionOption[];
      const aData = (await aRes.json()) as AppOption[];
      setRows(uData);
      setSections(sData);
      setApps(aData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleApp = (id: string) => {
    setSelectedApps((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const openCreate = () => {
    setEmail("");
    setPassword("");
    setSelectedSections(new Set());
    setSelectedApps(new Set());
    setCreateOpen(true);
  };

  const openEdit = (g: GroupedAdmin) => {
    setEditUser(g);
    setPassword("");
    setSelectedSections(new Set(g.sections.map((s) => s.id).filter(Boolean) as string[]));
    setSelectedApps(new Set((g.apps ?? []).map((a) => a.app_id)));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const app_assignments = [...selectedApps].map((app_id) => ({
        app_id,
        role: APP_ASSIGNMENT_INSERT_ROLE,
      }));
      const payload = {
        email,
        password,
        section_ids: [...selectedSections],
        app_assignments,
      };
      console.log("USER ASSIGNMENT PAYLOAD:", payload);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        auth_outcome?: string;
      };
      if (!res.ok) {
        setError(data?.error ?? "Could not create administrator");
        return;
      }
      if (data.auth_outcome === "invited") {
        showToast("Invite sent — user must open the email link to set a password, then can sign in to OnSite-D.");
      } else {
        showToast("Administrator created or updated");
      }
      setCreateOpen(false);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    setError(null);
    try {
      const app_assignments = [...selectedApps].map((app_id) => ({
        app_id,
        role: APP_ASSIGNMENT_INSERT_ROLE,
      }));
      const payload: {
        section_ids: string[];
        app_assignments: { app_id: string; role: string }[];
        password?: string;
      } = {
        section_ids: [...selectedSections],
        app_assignments,
      };
      if (password.trim().length >= 6) {
        payload.password = password.trim();
      }
      console.log("USER ASSIGNMENT PAYLOAD:", payload);
      const res = await fetch(`/api/admin/users/${editUser.user_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not save changes");
        return;
      }
      showToast("Changes saved");
      setEditUser(null);
      setPassword("");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.user_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not remove");
        return;
      }
      showToast("Roles removed");
      setDeleteUser(null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const formatRole = (g: GroupedAdmin) => {
    const hasSections = g.sections.length > 0;
    if (g.roles.includes("section_admin") && g.roles.includes("admin")) {
      return "section_admin + admin";
    }
    if (g.roles.includes("section_admin")) return "section_admin";
    if (hasSections && g.roles.includes("admin")) return "section admin";
    return g.roles[0] ?? "—";
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-AU", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Australia/Perth",
      });
    } catch {
      return iso;
    }
  };

  const sectionsById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const appLabelById = useMemo(() => new Map(apps.map((a) => [a.id, a.name])), [apps]);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className="rounded-md border px-4 py-2 text-sm"
          style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}
        >
          {toast}
        </div>
      )}
      {error && (
        <div
          className="rounded-md border px-4 py-2 text-sm"
          style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}
        >
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ background: "#B96A2D" }}
        >
          New administrator
        </button>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "#EEECEF" }}>
          <h2
            className="font-medium uppercase tracking-wide"
            style={{ fontSize: "13px", color: "#52525b" }}
          >
            Administrators (grouped by email)
          </h2>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "#71717a" }}>
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm" style={{ color: "#3f3f46" }}>
              <thead>
                <tr style={{ background: "#F7F7F7", borderBottom: `1px solid ${tokens.theme.border}` }}>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Sections
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Applications
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.user_id} className="border-b" style={{ borderColor: "#EEECEF" }}>
                    <td className="px-4 py-3 text-xs font-medium">{g.user_email}</td>
                    <td className="px-4 py-3 text-xs">{formatRole(g)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                      {g.sections.length > 0
                        ? g.sections.map((s) => s.name ?? s.id).join(", ")
                        : g.crew_label ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                      {(g.apps ?? []).length > 0
                        ? (g.apps ?? [])
                            .map((a) => appLabelById.get(a.app_id) ?? a.app_id)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                      {formatDate(g.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-3 text-xs font-medium hover:underline"
                        style={{ color: "#B96A2D" }}
                        onClick={() => openEdit(g)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs hover:underline disabled:opacity-40"
                        style={{ color: "#dc2626" }}
                        disabled={g.user_id === currentUserId}
                        onClick={() => setDeleteUser(g)}
                      >
                        {g.user_id === currentUserId ? "—" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: "#71717a" }}>
                No administrators to show.
              </div>
            )}
          </div>
        )}
      </div>

      {createOpen && (
        <Modal title="New administrator" onClose={() => !saving && setCreateOpen(false)}>
          <p className="mb-3 text-xs" style={{ color: "#71717a" }}>
            If the email already exists, only sections/apps will be assigned (no new auth user).
          </p>
          <label className="mb-1 block text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Email
          </label>
          <input
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: "#E2E0E6" }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="mb-1 block text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Password (min 6) — for new users: set to create login for OnSite-D, or leave empty to email an invite
          </label>
          <input
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: "#E2E0E6" }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mb-2 text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Sections
          </p>
          <div className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded border p-2" style={{ borderColor: "#E2E0E6" }}>
            {sections.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedSections.has(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                <span>
                  {s.name}
                  <span className="ml-1" style={{ color: "#9ca3af" }}>
                    ({s.scope ?? "—"}
                    {s.crew_name ? ` · ${s.crew_name}` : ""})
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mb-2 text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Applications (role: admin)
          </p>
          <p className="mb-3 text-xs" style={{ color: "#71717a" }}>
            App access uses <code className="rounded bg-zinc-100 px-1">app_id</code> and{" "}
            <code className="rounded bg-zinc-100 px-1">section_id</code> null.
          </p>
          <div className="mb-4 max-h-36 space-y-2 overflow-y-auto rounded border p-2" style={{ borderColor: "#E2E0E6" }}>
            {apps.length === 0 ? (
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                No applications in public.apps.
              </p>
            ) : (
              apps.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedApps.has(a.id)}
                    onChange={() => toggleApp(a.id)}
                  />
                  <span>
                    {a.name}
                    <span className="ml-1" style={{ color: "#9ca3af" }}>
                      ({a.id})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#E2E0E6" }}
              disabled={saving}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "#B96A2D" }}
              disabled={
                saving ||
                !email.trim() ||
                (selectedSections.size === 0 && selectedApps.size === 0)
              }
              onClick={() => void handleCreate()}
            >
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title={`Edit — ${editUser.user_email}`} onClose={() => !saving && setEditUser(null)}>
          <p className="mb-3 text-xs" style={{ color: "#71717a" }}>
            Email cannot be changed. Leave password blank to keep the current one.
          </p>
          <label className="mb-1 block text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            New password (optional, min. 6)
          </label>
          <input
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: "#E2E0E6" }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="mb-2 text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Assigned sections
          </p>
          <div className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded border p-2" style={{ borderColor: "#E2E0E6" }}>
            {sections.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedSections.has(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                <span>
                  {s.name}
                  <span className="ml-1" style={{ color: "#9ca3af" }}>
                    ({sectionsById.get(s.id)?.scope ?? s.scope ?? "—"})
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mb-3 text-[11px] font-medium uppercase" style={{ color: "#71717a" }}>
            Applications (role: admin)
          </p>
          <div className="mb-4 max-h-36 space-y-2 overflow-y-auto rounded border p-2" style={{ borderColor: "#E2E0E6" }}>
            {apps.length === 0 ? (
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                No applications in public.apps.
              </p>
            ) : (
              apps.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedApps.has(a.id)}
                    onChange={() => toggleApp(a.id)}
                  />
                  <span>
                    {a.name}
                    <span className="ml-1" style={{ color: "#9ca3af" }}>
                      ({a.id})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#E2E0E6" }}
              disabled={saving}
              onClick={() => setEditUser(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "#B96A2D" }}
              disabled={
                saving || (selectedSections.size === 0 && selectedApps.size === 0)
              }
              onClick={() => void handleSaveEdit()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {deleteUser && (
        <Modal title="Confirm removal" onClose={() => !saving && setDeleteUser(null)}>
          <p className="mb-4 text-sm" style={{ color: "#3f3f46" }}>
            All administrator roles will be removed for{" "}
            <strong>{deleteUser.user_email}</strong>. The auth user account is not deleted.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#E2E0E6" }}
              disabled={saving}
              onClick={() => setDeleteUser(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "#dc2626" }}
              disabled={saving}
              onClick={() => void handleDelete()}
            >
              {saving ? "Removing…" : "Remove roles"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 shadow-lg"
        style={{ background: "#fff", borderColor: tokens.theme.border }}
        role="dialog"
        aria-modal
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold" style={{ color: "#3f3f46" }}>
            {title}
          </h3>
          <button type="button" className="text-sm text-zinc-500 hover:text-zinc-800" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
