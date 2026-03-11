"use client";

import { useSearchParams } from "next/navigation";

interface Props {
  crew: string;
}

export function Header({ crew }: Props) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "dashboard";
  const isSpreadsheet = view === "spreadsheet";

  const toggleUrl = `/?crew=${crew}&view=${isSpreadsheet ? "dashboard" : "spreadsheet"}`;

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 border-b border-[#1e1e1e] bg-[#0a0a0a]">
      <div className="flex items-start justify-between gap-6 px-6 py-5">
        <div className="min-w-0">
          <h1
            className="font-barlow text-xl font-bold uppercase tracking-tight text-white sm:text-2xl"
            style={{ lineHeight: "28px" }}
          >
            Alkimos Pipeline Alliance
          </h1>
          <p
            className="mt-1 font-mono text-[#999]"
            style={{ fontSize: "13px", lineHeight: "18px" }}
          >
            DN1600 Trunk Main
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1e1e1e] bg-[#0e0e0e] px-2 py-1 font-mono text-xs text-[#4ade80]"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4ade80]" />
            Live
          </span>
          <span className="font-mono text-[#999]" style={{ fontSize: "13px", lineHeight: "18px" }}>
            {today}
          </span>
          <a
            href={toggleUrl}
            className="rounded-lg border border-[#1e1e1e] bg-[#1a1a1a] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition hover:border-[#f97316]"
          >
            📊 {isSpreadsheet ? "Dashboard" : "Data View"}
          </a>
        </div>
      </div>
    </header>
  );
}
