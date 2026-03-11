import packageJson from "../../package.json";

export function Footer() {
  const year = new Date().getFullYear();
  const version = packageJson.version;

  return (
    <footer className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-6 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-barlow text-sm font-bold uppercase text-[#999]">
            Alkimos Pipeline Alliance
          </span>
          <span className="text-[#666]">|</span>
          <span className="font-mono text-xs text-[#666]">© {year} APA</span>
        </div>
        <div className="font-mono text-xs text-[#666]">
          v{version} · {new Date().toISOString().split("T")[0]}
        </div>
      </div>
    </footer>
  );
}
