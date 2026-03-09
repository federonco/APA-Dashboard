export function Header() {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="border-b border-[#1e1e1e] px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
            Acueducto DN1600
          </h1>
          <p className="font-mono text-sm uppercase tracking-widest text-zinc-400">
            CH 0+000 → 27+000 · Water Corp
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              title="Live"
            />
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Live
            </span>
          </div>
          <span className="font-mono text-sm text-zinc-400">{today}</span>
        </div>
      </div>
    </header>
  );
}
