import { tokens } from "@/lib/designTokens";
import { chartLineVisual } from "@/lib/chartVisual";

export type LegendItem = {
  label: string;
  color: string;
  dashed?: boolean;
  active?: boolean;
  onClick?: () => void;
};

type ChartLegendProps = {
  items: LegendItem[];
  className?: string;
};

function LegendLineSwatch({
  color,
  dashed,
  dim,
}: {
  color: string;
  dashed?: boolean;
  dim: number;
}) {
  const cap = "round" as const;

  if (dashed) {
    return (
      <svg
        width={28}
        height={6}
        viewBox="0 0 28 6"
        className="mb-[0.2em] shrink-0"
        aria-hidden
      >
        <line
          x1="1"
          y1="3"
          x2="27"
          y2="3"
          stroke={color}
          strokeWidth={chartLineVisual.targetStrokeWidth}
          strokeDasharray="4 4"
          strokeOpacity={chartLineVisual.targetStrokeOpacity * dim}
          strokeLinecap={cap}
        />
      </svg>
    );
  }

  return (
    <svg
      width={28}
      height={10}
      viewBox="0 0 28 10"
      className="mb-[0.2em] shrink-0"
      aria-hidden
    >
      {/* Soft underlay — matches chart glow layer */}
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={color}
        strokeWidth={chartLineVisual.glowStrokeWidth}
        strokeOpacity={chartLineVisual.glowStrokeOpacity * dim}
        strokeLinecap={cap}
      />
      {/* Crisp foreground — matches main series stroke */}
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={color}
        strokeWidth={chartLineVisual.strokeWidth}
        strokeOpacity={chartLineVisual.strokeOpacity * dim}
        strokeLinecap={cap}
      />
    </svg>
  );
}

export function ChartLegend({ items, className = "" }: ChartLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-end gap-6 pt-2 ${className}`}
      role="list"
      aria-label="Chart legend"
    >
      {items.map((item) => {
        const active = item.active !== false;
        const dim = active ? 1 : chartLineVisual.inactiveDim;
        const isClickable = !!item.onClick;
        return (
          <div
            key={item.label}
            role="listitem"
            className={`flex items-end gap-2 ${isClickable ? "cursor-pointer select-none" : ""}`}
            onClick={item.onClick}
            onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), item.onClick?.())}
            tabIndex={isClickable ? 0 : undefined}
          >
            <LegendLineSwatch color={item.color} dashed={item.dashed} dim={dim} />
            <span
              className={active ? "" : "line-through"}
              style={{
                fontSize: tokens.typography.label,
                letterSpacing: "0.02em",
                color: active ? tokens.text.muted : tokens.text.muted,
                opacity: active ? 1 : 0.5,
                fontFamily: tokens.typography.fontFamily,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
