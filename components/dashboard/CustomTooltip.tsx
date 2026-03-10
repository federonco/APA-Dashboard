"use client";

import type { TooltipProps } from "recharts";

export function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const filtered = payload.filter(
    (e) =>
      !["aheadValue", "behindValue"].includes(String(e.dataKey ?? "")) &&
      !String(e.dataKey ?? "").startsWith("seg")
  );
  if (!filtered.length) return null;

  return (
    <div
      className="rounded-lg border px-[10px] py-2 shadow-sm"
      style={{
        backgroundColor: "#FCFBFB",
        borderColor: "#EEECEF",
        fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {label != null && (
        <p
          className="mb-1.5 font-medium"
          style={{ fontSize: "11px", color: "#7C7A86" }}
        >
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {filtered.map((entry, i) => (
          <div key={entry.dataKey ?? entry.name ?? i} className="flex items-center justify-between gap-4">
            <span
              className="font-normal"
              style={{ fontSize: "11px", color: "#7C7A86" }}
            >
              {entry.name}
            </span>
            <span
              className="font-medium tabular-nums"
              style={{ fontSize: "12px", color: entry.color ?? (entry.payload as { color?: string })?.color ?? "#3f3f46" }}
            >
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
