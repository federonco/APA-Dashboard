type KPICardProps = {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
};

function KPICard({ label, value, trend, trendPositive }: KPICardProps) {
  return (
    <div className="rounded-lg border border-[#EEECEF] bg-[#FCFBFB] p-5">
      <p
        className="mb-1 font-medium text-zinc-600"
        style={{ fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {label}
      </p>
      <p
        className="font-semibold text-zinc-800"
        style={{ fontSize: "28px", lineHeight: "1.2" }}
      >
        {value}
      </p>
      {trend !== undefined && (
        <p
          className="mt-1 font-normal"
          style={{
            fontSize: "11px",
            color: trendPositive === true ? "#2F7D55" : trendPositive === false ? "#b91c1c" : "#71717a",
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
