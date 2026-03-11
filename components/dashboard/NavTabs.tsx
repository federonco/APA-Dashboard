"use client";

import Link from "next/link";
import { CREW_TABS } from "@/lib/constants/crew-tabs";

interface Props {
  crew: string;
  view: string;
}

export function NavTabs({ crew, view }: Props) {
  return (
    <nav className="overflow-x-auto border-b border-[#1e1e1e] bg-[#080808] px-6 sm:px-10">
      <div className="flex gap-6 sm:gap-8" style={{ paddingBottom: "0.75rem", marginBottom: -1 }}>
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
                style={{ fontSize: "13px" }}
              >
                {tab.label}
              </Link>
            ) : (
              <Link
                href={`/?crew=${tab.name}&view=${view}`}
                className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2 font-barlow text-sm font-bold uppercase transition ${
                  crew === tab.name
                    ? "border-b-[#f97316] text-[#f97316]"
                    : "border-b-transparent text-[#666] hover:text-[#999]"
                }`}
                style={{ fontSize: "13px" }}
              >
                {tab.label}
                <span className="rounded bg-[#f97316] px-2 py-0.5 text-[10px] text-white">
                  Coming soon
                </span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
