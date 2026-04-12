"use client";

import { MetricCardItem } from "@/components/dashboard/MetricCardItem";

export function CardPreview({
  label,
  metricKey,
  sectionName,
  subsectionName,
  crewName,
  value,
}: {
  label: string;
  metricKey: string;
  sectionName: string | null;
  subsectionName: string | null;
  crewName: string | null;
  value?: number | null;
}) {
  const v = value ?? 0;
  return (
    <div className="max-w-[220px]">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Preview</p>
      <MetricCardItem
        card={{
          id: "preview",
          metric_key: metricKey,
          label: label || "—",
          value: v,
          section_name: sectionName,
          subsection_name: subsectionName,
          crew_name: crewName,
        }}
      />
    </div>
  );
}
