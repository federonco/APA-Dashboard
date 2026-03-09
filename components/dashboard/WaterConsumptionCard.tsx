"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { WaterByActivity } from "@/lib/queries/daily";

const COLOR_MAP: Record<string, string> = {
  "Pipe jointing": "#f97316",
  "Dust suppression": "#38bdf8",
  Testing: "#22c55e",
  Other: "#a78bfa",
  default: "#71717a",
};

const FALLBACK_COLORS = ["#f97316", "#38bdf8", "#22c55e", "#a78bfa", "#e879f9", "#facc15"];

function getColor(activity: string, index: number): string {
  return COLOR_MAP[activity] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

type WaterConsumptionCardProps = {
  data: WaterByActivity[];
};

export function WaterConsumptionCard({ data }: WaterConsumptionCardProps) {
  const totalLitres = data.reduce((sum, d) => sum + d.litres, 0);
  const totalKL = (totalLitres / 1000).toFixed(1);

  const chartData = data.map((d, i) => ({
    name: d.activity,
    value: d.litres,
    color: getColor(d.activity, i),
  }));

  return (
    <div className="rounded border border-[#1e1e1e] bg-[#0e0e0e]">
      <div
        className="h-0.5 w-full rounded-t"
        style={{ backgroundColor: "#38bdf8" }}
      />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
            Water Consumption — Today
          </span>
          <span className="rounded bg-zinc-800/80 px-2 py-1 font-mono text-xs text-zinc-300">
            {totalKL} kL
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-40 min-h-[10rem] w-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col gap-1.5">
            {chartData.map((entry) => {
              const pct = totalLitres > 0 ? ((entry.value / totalLitres) * 100).toFixed(1) : "0";
              const kL = (entry.value / 1000).toFixed(1);
              return (
                <li key={entry.name} className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-zinc-400">{entry.name}</span>
                  <span className="text-zinc-300">{kL} kL</span>
                  <span className="text-zinc-500">({pct}%)</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
