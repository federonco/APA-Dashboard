import packageJson from "../../package.json";

export function Footer() {
  const year = new Date().getFullYear();
  const version = packageJson.version;

  return (
    <footer className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold text-zinc-400">
            Alkimos Pipeline Alliance
          </span>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-xs text-zinc-500">
            © {year} APA
          </span>
        </div>
        <div className="font-mono text-xs text-zinc-500">
          v{version} · {new Date().toISOString().split("T")[0]}
        </div>
      </div>
    </footer>
  );
}
