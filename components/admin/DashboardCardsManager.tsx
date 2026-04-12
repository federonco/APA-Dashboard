"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogueEntry } from "@/lib/metric-catalogue";
import { tokens } from "@/lib/designTokens";
import { AddCardWizard, type DashboardCardRow } from "@/components/admin/AddCardWizard";

export function DashboardCardsManager() {
  const [rows, setRows] = useState<DashboardCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editCard, setEditCard] = useState<DashboardCardRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard-cards");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleVisibility(id: string, is_visible: boolean) {
    const res = await fetch(`/api/admin/dashboard-cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_visible: !is_visible }),
    });
    if (res.ok) void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this dashboard card?")) return;
    const res = await fetch(`/api/admin/dashboard-cards/${id}`, { method: "DELETE" });
    if (res.ok) void load();
  }

  async function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...rows];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const ids = next.map((r) => r.id);
    const res = await fetch("/api/admin/dashboard-cards/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_ids: ids }),
    });
    if (res.ok) void load();
  }

  async function moveDown(index: number) {
    if (index >= rows.length - 1) return;
    const next = [...rows];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    const ids = next.map((r) => r.id);
    const res = await fetch("/api/admin/dashboard-cards/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_ids: ids }),
    });
    if (res.ok) void load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-800">Dashboard cards</h2>
          <p className="text-xs text-zinc-500">
            Configure KPI cards at the top of the home dashboard. Changes apply for all viewers.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#B96A2D] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          onClick={() => {
            setEditCard(null);
            setWizardOpen(true);
          }}
        >
          Add card
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-6 py-12 text-center text-sm"
          style={{ borderColor: tokens.theme.border, color: tokens.text.muted }}
        >
          No cards yet. Click &quot;Add card&quot; to create your first metric card.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const friendly = catalogueEntry(r.metric_key)?.label ?? r.metric_key;
            const scope = [r.section_name, r.subsection_name].filter(Boolean).join(" · ") || "—";
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-3 text-sm shadow-sm"
                style={{ borderColor: tokens.theme.border }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{r.label}</p>
                  <p className="text-xs text-zinc-500">
                    {friendly}
                    <span className="mx-1 text-zinc-300">|</span>
                    {r.metric_key.startsWith("water") ? (r.crew_name ? `Crew ${r.crew_name}` : "—") : `Section: ${scope}`}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={r.is_visible}
                    onChange={() => void toggleVisibility(r.id, r.is_visible)}
                  />
                  Visible
                </label>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
                  onClick={() => void moveUp(i)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
                  onClick={() => void moveDown(i)}
                  disabled={i === rows.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-[#B96A2D] hover:underline"
                  onClick={() => {
                    setEditCard(r);
                    setWizardOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => void remove(r.id)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddCardWizard
        open={wizardOpen}
        editCard={editCard}
        onClose={() => {
          setWizardOpen(false);
          setEditCard(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
