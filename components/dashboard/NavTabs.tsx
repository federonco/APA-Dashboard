const TABS = ["Daily", "Progress", "Resources", "Reports"] as const;

export function NavTabs() {
  return (
    <nav className="border-b border-[#E2E0E6] bg-[#F7F7F7] px-10">
      <ul className="flex gap-8">
        {TABS.map((tab, i) => (
          <li key={tab}>
            <button
              type="button"
              className={`font-medium transition-colors ${
                i === 0
                  ? "border-b-2 border-[#f97316] text-zinc-800"
                  : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
              style={{ fontSize: "13px", paddingBottom: "0.75rem", marginBottom: -1 }}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
