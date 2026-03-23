"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { WaterByActivity } from "@/lib/queries/daily";
import { tokens } from "@/lib/designTokens";
import { CustomTooltip } from "./CustomTooltip";

/* Violet family only — same hierarchy as main water chart (no line-chart orange). */
const COLOR_MAP: Record<string, string> = {
  "Pipe jointing": tokens.waterChart.pipeJointing,
  "Dust suppression": tokens.waterChart.dustSuppression,
  Testing: tokens.waterChart.testing,
  Other: tokens.waterChart.other,
  default: tokens.waterChart.dustSuppression,
};

const FALLBACK_COLORS = [
  tokens.waterChart.pipeJointing,
  tokens.waterChart.dustSuppression,
  tokens.waterChart.testing,
  tokens.waterChart.other,
  tokens.waterChart.dustSuppression,
];

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
    <div className="min-h-[26rem] rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#5E7487] bg-[#0e0e0e]">
      <div className="flex h-full min-h-[26rem] flex-col p-5 py-6">
        <div className="mb-3 flex items-start justify-between">
          <span
            className="font-medium text-[#999]"
            style={{ fontSize: tokens.typography.subtitle, letterSpacing: "0.02em" }}
          >
            Water consumption — today
          </span>
          <span
            className="rounded bg-[#1e1e1e] px-2 py-1 font-semibold tabular-nums text-white"
            style={{ fontSize: "16px", lineHeight: "1.2" }}
          >
            {totalKL} kL
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-48 min-h-[12rem] w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={<CustomTooltip />}
                  offset={100}
                  wrapperStyle={{ outline: "none" }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={77}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full pt-4">
            <table className="w-full border-collapse" style={{ fontSize: "11px" }}>
              <tbody>
                {chartData.map((entry) => {
                  const pct = totalLitres > 0 ? ((entry.value / totalLitres) * 100).toFixed(1) : "0";
                  const kL = (entry.value / 1000).toFixed(1);
                  return (
                    <tr key={entry.name} className="font-normal">
                      <td className="py-0.5 pr-2 align-middle" style={{ width: "1px" }}>
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                      </td>
                      <td className="py-0.5 pr-4 text-left text-[#999]">{entry.name}</td>
                      <td className="py-0.5 pr-2 text-right text-white tabular-nums">{kL} kL</td>
                      <td className="py-0.5 text-right text-[#666] tabular-nums">({pct}%)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
