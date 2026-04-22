"use client";

import { tokens } from "@/lib/designTokens";
import { catalogueEntry } from "@/lib/metric-catalogue";

export type MetricCardData = {
  id: string;
  metric_key: string;
  label: string;
  value: number;
  section_name: string | null;
  subsection_name?: string | null;
  crew_name: string | null;
  is_visible?: boolean;
};

function colorStyle(metricKey: string): { border: string; accent: string } {
  const c = catalogueEntry(metricKey)?.color;
  if (c === "green") return { border: "#bbf7d0", accent: "#15803d" };
  if (c === "orange") return { border: "#fed7aa", accent: "#c2410c" };
  if (c === "cyan") return { border: "#a5f3fc", accent: "#0e7490" };
  return { border: "#bfdbfe", accent: "#1d4ed8" };
}

export function MetricCardItem({ card }: { card: MetricCardData }) {
  const cat = catalogueEntry(card.metric_key);
  const icon = cat?.icon ?? "•";
  const { border, accent } = colorStyle(card.metric_key);
  const sub = [card.section_name, card.subsection_name, card.crew_name].filter(Boolean).join(" · ");

  const formatted =
    card.metric_key.includes("liters") && card.value >= 1000
      ? `${(card.value / 1000).toFixed(1)}k`
      : Number.isInteger(card.value)
        ? String(card.value)
        : card.value.toLocaleString("en-AU", { maximumFractionDigits: 1 });

  return (
    <div
      className="flex min-h-[96px] min-w-[140px] flex-1 flex-col justify-between rounded-lg border p-3 shadow-sm"
      style={{
        background: tokens.theme.card,
        borderColor: border,
        opacity: card.is_visible === false ? 0.65 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: tokens.text.muted }}>
          {card.label}
        </span>
        <span className="text-sm" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>
        {formatted}
      </p>
      {sub ? (
        <p className="line-clamp-2 text-[10px] leading-tight" style={{ color: tokens.text.secondary }}>
          {sub}
        </p>
      ) : (
        <span className="text-[10px] opacity-0">.</span>
      )}
    </div>
  );
}
