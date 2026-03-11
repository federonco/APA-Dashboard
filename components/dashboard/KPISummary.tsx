const KPI_ACCENTS = ["#f97316", "#38bdf8", "#0ea5e9", "#4ade80"] as const;

export function KPISummary() {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Pipes Installed Today", value: "22" },
        { label: "Backfill Today", value: "80 m" },
        { label: "Water Used Today", value: "28.0 kL" },
        { label: "Productivity", value: "+33%" },
      ].map((item, i) => (
        <div
          key={item.label}
          className="rounded-lg border border-[#1e1e1e] border-t-4 bg-[#0e0e0e] p-5"
          style={{ borderTopColor: KPI_ACCENTS[i] }}
        >
          <p
            className="mb-1 font-barlow font-medium text-[#999]"
            style={{ fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            {item.label}
          </p>
          <p
            className="font-mono font-semibold text-white"
            style={{ fontSize: "28px", lineHeight: "1.2" }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
