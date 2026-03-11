export type LegendItem = {
  label: string;
  color: string;
  dashed?: boolean;
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
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2" role="listitem">
          <svg width="24" height="4" className="flex-shrink-0">
            <line
              x1="0"
              y1="2"
              x2="24"
              y2="2"
              stroke={item.color}
              strokeWidth="2"
              strokeDasharray={item.dashed ? "4 2" : "none"}
            />
          </svg>
          <span
            className="font-mono uppercase text-[#999]"
            style={{ fontSize: "10px", letterSpacing: "0.04em" }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
