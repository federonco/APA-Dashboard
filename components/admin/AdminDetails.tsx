"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  admin: Record<string, unknown>;
  onEdit: () => void;
  onDeleted: () => void;
  superadminEmail: string;
}

async function logAudit(
  action: string,
  targetEmail: string | null,
  details: Record<string, unknown>
) {
  await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, targetEmail, details }),
  });
}

export default function AdminDetails({
  admin,
  onEdit,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  async function handleDelete() {
    if (
      !confirm(`Delete admin ${admin.email}? This action cannot be undone.`)
    ) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("psp_admins")
        .delete()
        .eq("id", admin.id);

      if (error) throw error;

      await logAudit("delete_admin", String(admin.email), {
        full_name: admin.full_name,
        crews: admin.crews,
      });

      onDeleted();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting admin");
    } finally {
      setDeleting(false);
    }
  }

  const crews = (admin.crews as string[] | undefined) ?? [];

  return (
    <div className="space-y-6 rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#f97316] bg-[#0e0e0e] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-barlow text-lg font-bold uppercase text-white">
            {String(admin.full_name || "Unnamed Admin")}
          </h3>
          <p className="mt-1 font-mono text-sm text-[#999]">
            {String(admin.email)}
          </p>
        </div>
        <span
          className={`rounded px-3 py-1 text-xs font-barlow font-bold uppercase ${
            admin.is_active
              ? "bg-[#4ade80]/20 text-[#4ade80]"
              : "bg-red-900/20 text-red-400"
          }`}
        >
          {admin.is_active ? "✓ Active" : "✗ Inactive"}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <span className="text-xs uppercase text-[#999]">Role</span>
          <p className="mt-1 font-mono text-white">
            {admin.role === "superadmin" ? "🔒 Superadmin" : "👤 Admin"}
          </p>
        </div>

        <div>
          <span className="text-xs uppercase text-[#999]">Region</span>
          <p className="mt-1 text-white">
            {String(admin.region || "Not assigned")}
          </p>
        </div>

        <div>
          <span className="text-xs uppercase text-[#999]">Assigned Crews</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {crews.length > 0 ? (
              crews.map((crew: string) => (
                <span
                  key={crew}
                  className="rounded bg-[#f97316] px-3 py-1 text-xs font-barlow font-bold text-white"
                >
                  {crew}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#666]">None assigned</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-xs uppercase text-[#999]">Created</span>
          <p className="mt-1 font-mono text-xs text-white">
            {admin.created_at
              ? new Date(String(admin.created_at)).toLocaleString()
              : "—"}
          </p>
        </div>

        {admin.last_login ? (
          <div>
            <span className="text-xs uppercase text-[#999]">Last Login</span>
            <p className="mt-1 font-mono text-xs text-white">
              {new Date(String(admin.last_login)).toLocaleString()}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-[#1e1e1e] pt-4">
        <button
          onClick={onEdit}
          className="hover:bg-[#e67e1f] flex-1 rounded-lg bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 rounded-lg border border-red-900 bg-red-900/20 px-4 py-2 font-barlow text-sm font-bold uppercase text-red-400 transition disabled:opacity-50 hover:bg-red-900/40"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
