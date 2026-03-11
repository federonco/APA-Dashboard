"use client";

import { useState } from "react";

interface Props {
  admins: Record<string, unknown>[];
  selectedAdmin: Record<string, unknown> | null;
  onSelect: (admin: Record<string, unknown>) => void;
}

export default function AdminList({
  admins,
  selectedAdmin,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = admins.filter((a) => {
    const email = String(a.email ?? "").toLowerCase();
    const name = String(a.full_name ?? "").toLowerCase();
    const q = search.toLowerCase();
    return email.includes(q) || name.includes(q);
  });

  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e] p-4">
      <input
        type="text"
        placeholder="Search admins..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="placeholder-[#666]focus:border-[#f97316] mb-4 w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none"
      />

      <div className="max-h-[600px] space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#666]">No admins found</p>
        ) : (
          filtered.map((admin) => (
            <button
              key={String(admin.id)}
              onClick={() => onSelect(admin)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                selectedAdmin?.id === admin.id
                  ? "bg-[#f97316] text-white"
                  : "bg-[#1a1a1a] text-[#ccc] hover:bg-[#242424]"
              }`}
            >
              <div className="font-mono text-xs">{String(admin.email)}</div>
              <div className="font-barlow text-xs text-[#999]">
                {String(admin.full_name || "No name")}
              </div>
              <div className="mt-1 text-xs text-[#666]">
                {admin.role === "superadmin" ? "🔒 Superadmin" : "👤 Admin"}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
