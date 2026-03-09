type Trend = "up" | "down" | "flat";

type TrendBadgeProps = {
  trend: Trend;
  percentChange: number;
};

const TREND_CONFIG: Record<
  Trend,
  { label: string; color: string; bgColor: string; arrow: string }
> = {
  up: { label: "up", color: "text-emerald-400", bgColor: "bg-emerald-500/20", arrow: "↑" },
  down: { label: "down", color: "text-red-400", bgColor: "bg-red-500/20", arrow: "↓" },
  flat: { label: "flat", color: "text-amber-400", bgColor: "bg-amber-500/20", arrow: "→" },
};

export function TrendBadge({ trend, percentChange }: TrendBadgeProps) {
  const config = TREND_CONFIG[trend];
  const displayPercent =
    percentChange > 0 ? `+${percentChange}%` : percentChange === 0 ? "0%" : `${percentChange}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider ${config.bgColor} ${config.color}`}
    >
      <span>{config.arrow}</span>
      <span>{displayPercent}</span>
    </span>
  );
}

export function computeTrend(first: number, last: number): { trend: Trend; percentChange: number } {
  if (first === 0) {
    return last > 0 ? { trend: "up", percentChange: 100 } : { trend: "flat", percentChange: 0 };
  }
  const change = ((last - first) / first) * 100;
  const rounded = Math.round(change);
  if (rounded > 0) return { trend: "up", percentChange: rounded };
  if (rounded < 0) return { trend: "down", percentChange: rounded };
  return { trend: "flat", percentChange: 0 };
}
