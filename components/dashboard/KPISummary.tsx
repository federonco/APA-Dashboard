type KPICardProps = {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
};

function KPICard({ label, value, trend, trendPositive }: KPICardProps) {
  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e] p-5">
      <p
        className="mb-1 font-barlow font-medium text-[#999]"
        style={{ fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {label}
      </p>
      <p
        className="font-dm-mono font-semibold text-white"
        style={{ fontSize: "28px", lineHeight: "1.2" }}
      >
        {value}
      </p>
      {trend !== undefined && (
        <p
          className="mt-1 font-normal"
          style={{
            fontSize: "11px",
            color: trendPositive === true ? "#4ade80" : trendPositive === false ? "#f87171" : "#999",
          }}
        >
          {trend}
        </p>
      )}
    </div>
  );
}

export function KPISummary() {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <KPICard label="Pipes Installed Today" value="22" />
      <KPICard label="Backfill Today" value="80 m" />
      <KPICard label="Water Used Today" value="28.0 kL" />
      <KPICard label="Productivity" value="+33%" />
    </section>
  );
}
