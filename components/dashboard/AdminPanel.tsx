"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tokens } from "@/lib/designTokens";

interface Admin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  crews: { id: string; name: string; zone: string } | null;
}

interface Crew {
  id: string;
  name: string;
  zone: string;
}

interface Props {
  admins: Admin[];
  crews: Crew[];
  currentUserId: string;
}

export function AdminPanel({ admins, crews, currentUserId }: Props) {
  const [adminList, setAdminList] = useState(admins);
  const [email, setEmail] = useState("");
  const [selectedCrew, setSelectedCrew] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "superadmin">("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !selectedCrew) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, crew_id: selectedCrew, role: selectedRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to create admin");
        return;
      }

      window.location.reload();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId: string, userId: string) => {
    if (userId === currentUserId) {
      setError("Cannot remove your own superadmin access");
      return;
    }

    if (!confirm("Remove this admin?")) return;

    try {
      const res = await fetch(`/api/admin/admins?id=${adminId}`, { method: "DELETE" });
      if (res.ok) {
        setAdminList((prev) => prev.filter((a) => a.id !== adminId));
      } else {
        const data = await res.json();
        setError(data?.error ?? "Failed to delete");
      }
    } catch {
      setError("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden rounded-lg border"
        style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "#EEECEF" }}>
          <h2
            className="font-medium uppercase tracking-wide"
            style={{ fontSize: "13px", color: "#52525b" }}
          >
            Current Administrators
          </h2>
        </div>
        <table className="w-full text-sm" style={{ color: "#3f3f46" }}>
          <thead>
            <tr style={{ background: "#F7F7F7", borderBottom: `1px solid ${tokens.theme.border}` }}>
              <th className="px-5 py-3 text-left font-medium" style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>
                User ID
              </th>
              <th className="px-5 py-3 text-left font-medium" style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>
                Crew
              </th>
              <th className="px-5 py-3 text-left font-medium" style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>
                Role
              </th>
              <th className="px-5 py-3 text-left font-medium" style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>
                Added
              </th>
              <th className="px-5 py-3 text-right font-medium" style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {adminList.map((admin) => (
              <tr key={admin.id} className="border-b" style={{ borderColor: "#EEECEF" }}>
                <td className="px-5 py-3 text-xs tabular-nums" style={{ color: "#71717a" }}>
                  {admin.user_id.slice(0, 8)}...
                </td>
                <td className="px-5 py-3">
                  {admin.crews ? (
                    <>
                      <span className="font-medium">Crew {admin.crews.name}</span>
                      <span className="ml-1 text-xs" style={{ color: "#9CA3AF" }}>
                        ({admin.crews.zone})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="rounded px-2 py-0.5 text-xs"
                    style={
                      admin.role === "superadmin"
                        ? { background: "#FBF5EF", color: "#B96A2D" }
                        : { background: "#F3F4F6", color: "#6B7280" }
                    }
                  >
                    {admin.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: "#9CA3AF" }}>
                  {new Date(admin.created_at).toLocaleDateString("en-AU")}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(admin.id, admin.user_id)}
                    className="text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: "#dc2626" }}
                    disabled={admin.user_id === currentUserId}
                  >
                    {admin.user_id === currentUserId ? "—" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {adminList.length === 0 && (
          <div className="px-5 py-8 text-center" style={{ color: "#71717a", fontSize: "13px" }}>
            No admins yet.
          </div>
        )}
      </div>

      <div
        className="rounded-lg border p-5"
        style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
      >
        <h2
          className="mb-4 font-medium uppercase tracking-wide"
          style={{ fontSize: "13px", color: "#52525b" }}
        >
          Add Administrator
        </h2>

        {error && (
          <div
            className="mb-3 rounded px-3 py-2 text-sm"
            style={{ background: "#fef2f2", color: "#b91c1c" }}
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block uppercase tracking-wide" style={{ fontSize: "11px", color: "#71717a" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@apalliance.com.au"
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: "#E2E0E6", color: "#3f3f46", minWidth: 220 }}
            />
          </div>
          <div>
            <label className="mb-1 block uppercase tracking-wide" style={{ fontSize: "11px", color: "#71717a" }}>
              Crew
            </label>
            <Select
              value={selectedCrew === "" ? null : selectedCrew}
              onValueChange={(v) => setSelectedCrew(v ?? "")}
            >
              <SelectTrigger className="min-w-[10rem]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {crews.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Crew {c.name} ({c.zone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block uppercase tracking-wide" style={{ fontSize: "11px", color: "#71717a" }}>
              Role
            </label>
            <Select
              value={selectedRole}
              onValueChange={(v) =>
                setSelectedRole(v as "admin" | "superadmin")
              }
            >
              <SelectTrigger className="min-w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="superadmin">superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !email || !selectedCrew}
            className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "#B96A2D" }}
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
