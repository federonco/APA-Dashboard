type ScheduleStatus = "ahead" | "behind" | "on-schedule";

function ScheduleIndicator({ status, delta }: { status: ScheduleStatus; delta?: number }) {
  if (status === "on-schedule") {
    return (
      <span
        className="inline-flex items-baseline gap-1 font-normal"
        style={{ fontSize: "12px", color: "#7C7A86", fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
      >
        On schedule
      </span>
    );
  }
  const isAhead = status === "ahead";
  const color = isAhead ? "#5FAE7A" : "#C46A6A";
  const arrow = isAhead ? "↑" : "↓";
  const sign = isAhead ? "+" : "−";
  return (
    <span
      className="inline-flex items-baseline gap-1 font-normal"
      style={{ fontSize: "12px", color, fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
    >
      <span style={{ fontSize: "10px", lineHeight: 1 }}>{arrow}</span>
      {sign}{Math.abs(delta ?? 0)}% {isAhead ? "ahead" : "behind"} of plan
    </span>
  );
}

export function ProjectProgress() {
  const percent = 65;
  const installed = 80;
  const planned = 120;
  const scheduleStatus: ScheduleStatus = "ahead";
  const scheduleDelta = 4;

  return (
    <div className="rounded-lg border border-[#EEECEF] bg-[#FCFBFB] p-5">
      <p
        className="mb-3 font-medium text-zinc-600"
        style={{ fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        Project Progress
      </p>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#ECEAF1" }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ backgroundColor: "#5F5B66", width: `${percent}%` }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <p
            className="font-semibold text-zinc-800"
            style={{ fontSize: "15px", lineHeight: "1.2", fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
          >
            {percent}% complete
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <ScheduleIndicator status={scheduleStatus} delta={scheduleDelta} />
          <p
            className="font-normal text-zinc-500"
            style={{ fontSize: "11px", fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
          >
            {installed} pipes installed / {planned} planned
          </p>
        </div>
      </div>
    </div>
  );
}
