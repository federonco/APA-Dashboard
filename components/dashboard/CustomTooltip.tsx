"use client";

import type { TooltipContentProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { PIPE_LENGTH_M } from "@/lib/constants";

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
      className="rounded-lg border px-3 py-2 shadow-md"
      style={{
        fontFamily: "DM Mono, monospace",
        backgroundColor: "#ffffff",
        borderColor: "#1e293b",
        borderWidth: 1,
      }}
    >
      {label != null && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1e293b" }}>
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {filtered.map((entry, i) => {
          const key = String(entry.dataKey ?? (typeof entry.name === "function" ? i : entry.name) ?? i);
          const isPipeMetres =
            key === "pipeMetres" || key === "pipeMetresCumulative" || entry.name === "PIPE LAID";
          let suffix = "";
          if (isPipeMetres && typeof entry.value === "number") {
            const pipes = entry.value / PIPE_LENGTH_M;
            suffix = ` (${pipes.toFixed(1)} pipes/day)`;
          }
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-6"
            >
              <span className="text-xs" style={{ color: "#475569" }}>{entry.name}</span>
              <span
                className="text-sm font-medium tabular-nums"
                style={{ color: entry.color ?? (entry.payload as { color?: string })?.color ?? "#1e293b" }}
              >
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : String(entry.value ?? "")}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
