import { tokens } from "@/lib/designTokens";

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

export function ChartLegend({ items, className = "" }: ChartLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-6 pt-2 ${className}`}
      role="list"
      aria-label="Chart legend"
    >
      {items.map((item) => {
        const active = item.active !== false;
        const isClickable = !!item.onClick;
        return (
          <div
            key={item.label}
            role="listitem"
            className={`flex items-center gap-2 ${isClickable ? "cursor-pointer select-none" : ""}`}
            onClick={item.onClick}
            onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), item.onClick?.())}
            tabIndex={isClickable ? 0 : undefined}
          >
            <svg width="24" height="4" className="flex-shrink-0">
              <line
                x1="0"
                y1="2"
                x2="24"
                y2="2"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray={item.dashed ? "4 2" : "none"}
                opacity={active ? 1 : 0.4}
              />
            </svg>
            <span
              className={`uppercase ${active ? "" : "line-through"}`}
              style={{
                fontSize: tokens.typography.label,
                letterSpacing: "0.04em",
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
