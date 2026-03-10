export function Header() {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="border-b border-[#E2E0E6] bg-[#F7F7F7] py-5 px-10">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1
            className="font-semibold tracking-tight text-zinc-800"
            style={{ fontSize: "22px", lineHeight: "28px" }}
          >
            Acueducto DN1600
          </h1>
          <p
            className="mt-1 font-normal text-zinc-600"
            style={{ fontSize: "13px", lineHeight: "18px" }}
          >
            Water Corp • CH 0+000 → 27+000
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: "#E7F4EC",
              borderColor: "#CFE8DA",
              color: "#2F7D55",
            }}
          >
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: "#2F7D55" }}
            />
            Live
          </span>
          <span
            className="font-normal text-zinc-600"
            style={{ fontSize: "13px", lineHeight: "18px" }}
          >
            {today}
          </span>
        </div>
      </div>
    </header>
  );
}
