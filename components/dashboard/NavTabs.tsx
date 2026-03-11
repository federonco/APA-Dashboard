"use client";

import Link from "next/link";

interface Props {
  crew: string;
  view: string;
}

interface CrewTab {
  name: string;
  label: string;
  enabled: boolean;
}

const CREW_TABS: CrewTab[] = [
  { name: "A", label: "Crew A", enabled: true },
  { name: "B", label: "Crew B", enabled: false },
  { name: "C", label: "Crew C", enabled: false },
  { name: "D", label: "Crew D", enabled: false },
  { name: "Global", label: "Global", enabled: false },
];

export function NavTabs({ crew, view }: Props) {
  return (
    <div className="overflow-x-auto border-b border-[#1e1e1e] px-6 py-4">
      <div className="flex gap-2">
        {CREW_TABS.map((tab) => (
          <div key={tab.name} className="relative">
            {tab.enabled ? (
              <Link
                href={`/?crew=${tab.name}&view=${view}`}
                className={`inline-block border-b-2 px-4 py-2 font-barlow text-sm font-bold uppercase transition ${
                  crew === tab.name
                    ? "border-b-[#f97316] text-[#f97316]"
                    : "border-b-transparent text-[#999] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed border-b-2 border-b-transparent px-4 py-2 font-barlow text-sm font-bold uppercase text-[#666]"
              >
                {tab.label}
              </button>
            )}

            {!tab.enabled && (
              <span className="absolute -right-1 -top-3 rounded bg-[#f97316] px-2 py-0.5 font-barlow text-xs font-bold text-white">
                Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
