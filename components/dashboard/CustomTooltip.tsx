"use client";

import type { TooltipContentProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

export function CustomTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload?.length) return null;

  const filtered = payload.filter(
    (e) =>
      !["aheadValue", "behindValue"].includes(String(e.dataKey ?? "")) &&
      !String(e.dataKey ?? "").startsWith("seg")
  );
  if (!filtered.length) return null;

  return (
    <div
      className="rounded-lg border border-[#1e1e1e] bg-[#080808] px-3 py-2 shadow-lg"
      style={{ fontFamily: "var(--font-barlow), ui-sans-serif, system-ui, sans-serif" }}
    >
      {label != null && (
        <p className="mb-1.5 font-barlow text-xs font-medium uppercase tracking-wide text-[#999]">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {filtered.map((entry, i) => (
          <div
            key={String(entry.dataKey ?? (typeof entry.name === "function" ? i : entry.name) ?? i)}
            className="flex items-center justify-between gap-6"
          >
            <span className="font-barlow text-xs text-[#999]">{entry.name}</span>
            <span
              className="font-mono text-sm font-medium tabular-nums"
              style={{ color: entry.color ?? (entry.payload as { color?: string })?.color ?? "#fff" }}
            >
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
