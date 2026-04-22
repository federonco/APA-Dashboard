"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MetricCardItem, type MetricCardData } from "@/components/dashboard/MetricCardItem";
import { tokens } from "@/lib/designTokens";

const POLL_MS = 60_000;

type CardFilter = "visible" | "hidden" | "all";

export function MetricCardsDisplay({ date, adminMode = false }: { date: string; adminMode?: boolean }) {
  const [cards, setCards] = useState<MetricCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CardFilter>("visible");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ date });
        if (adminMode) params.set("admin_mode", "1");
        const res = await fetch(`/api/dashboard/metrics?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to load metrics");
        setCards(data.cards ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [adminMode, date]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const filteredCards = cards.filter((card) => {
    if (!adminMode || filter === "all") return true;
    if (filter === "hidden") return card.is_visible === false;
    return card.is_visible !== false;
  });

  return (
    <div className="relative mb-4">
      <div className="mb-2 flex items-center justify-end gap-2">
        {adminMode && (
          <select
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700"
            value={filter}
            onChange={(e) => setFilter(e.target.value as CardFilter)}
            aria-label="Card visibility filter"
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="all">All</option>
          </select>
        )}
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          title="Refresh metrics"
          onClick={() => void load(false)}
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 min-w-[140px] flex-1 animate-pulse rounded-lg bg-zinc-200/80"
            />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm"
          style={{ color: tokens.text.muted }}
        >
          {adminMode
            ? "No cards for the selected filter."
            : "No cards configured. Admins can add cards from the admin panel (Dashboard cards)."}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {filteredCards.map((c) => (
            <MetricCardItem key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
