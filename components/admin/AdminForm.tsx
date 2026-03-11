"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  admin: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
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

export default function AdminForm({
  admin,
  onSave,
  onCancel,
  superadminEmail,
}: Props) {
  const [email, setEmail] = useState(String(admin?.email ?? ""));
  const [fullName, setFullName] = useState(String(admin?.full_name ?? ""));
  const [crews, setCrews] = useState<string[]>(
    (admin?.crews as string[] | undefined) ?? []
  );
  const [region, setRegion] = useState(String(admin?.region ?? ""));
  const [isActive, setIsActive] = useState(
    (admin?.is_active as boolean | undefined) !== false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (admin) {
        const { error: updateError } = await supabase
          .from("psp_admins")
          .update({
            full_name: fullName || null,
            crews,
            region: region || null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", admin.id);

        if (updateError) throw updateError;

        await logAudit("update_admin", String(admin.email), {
          crews,
          region,
          is_active: isActive,
        });
      } else {
        const tempPassword = Math.random().toString(36).slice(-12);
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: tempPassword,
            fullName: fullName || null,
            crews,
            region: region || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Create failed");

        await logAudit("create_admin", email, {
          full_name: fullName,
          crews,
          region,
        });
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving admin");
      console.error("Admin form error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#f97316] bg-[#0e0e0e] p-6"
    >
      <h3 className="font-barlow font-bold uppercase text-white">
        {admin ? "Edit Admin" : "Create New Admin"}
      </h3>

      <div>
        <label className="mb-2 block text-xs uppercase text-[#999]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!!admin}
          placeholder="admin@example.com"
          className="w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-[#666] disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#f97316]"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase text-[#999]">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          className="w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs uppercase text-[#999]">
          Assigned Crews
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["A", "B", "C", "D"].map((crew) => (
            <label
              key={crew}
              className="flex cursor-pointer items-center rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 transition hover:border-[#f97316]"
            >
              <input
                type="checkbox"
                checked={crews.includes(crew)}
                onChange={(e) => {
                  if (e.target.checked) setCrews([...crews, crew]);
                  else setCrews(crews.filter((c) => c !== crew));
                }}
                className="mr-2 cursor-pointer"
              />
              <span className="font-barlow text-sm font-bold uppercase text-white">
                Crew {crew}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase text-[#999]">Region</label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g., Alkimos"
          className="w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
        />
      </div>

      <label className="flex cursor-pointer items-center rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="mr-2 cursor-pointer"
        />
        <span className="font-barlow text-sm font-bold uppercase text-white">
          Active
        </span>
      </label>

      {error && (
        <div className="rounded border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="hover:bg-[#e67e1f] flex-1 rounded-lg bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[#1e1e1e] bg-[#1a1a1a] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition hover:border-[#999]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
