"use client";

import Link from "next/link";
import { CREW_TABS } from "@/lib/constants/crew-tabs";
import { tokens } from "@/lib/designTokens";

interface Props {
  crew: string;
  view: string;
}

/** Segmented crew switcher — soft grey rail; tabs carry visual weight (card-adjacent neutrals). */
export function NavTabs({ crew, view }: Props) {
  return (
    <nav
      style={{
        overflowX: "auto",
        background: tokens.theme.background,
        padding: `12px ${tokens.spacing.section}`,
      }}
    >
      {/* Explicit tokens (same as :root --token-card / --token-border) so colors never fall back to Tailwind defaults */}
      <div
        className="inline-flex max-w-full flex-wrap items-center gap-1 p-1"
        style={{
          background: "var(--token-card)",
          border: "1px solid var(--token-border)",
          borderRadius: "var(--token-radius-card)",
        }}
      >
        {CREW_TABS.map((tab) => {
          const active = crew === tab.name;
          const enabled = tab.enabled;

          const linkClass = [
            "inline-block rounded-lg px-4 py-2 no-underline transition-[color,background-color] duration-150",
            "text-[0.875rem] font-medium",
            active
              ? "bg-[#D1D5DB] text-[#111827]"
              : enabled
                ? "bg-transparent text-[#6B7280] hover:bg-[#E5E7EB]"
                : "bg-transparent text-[#9CA3AF] hover:bg-[#E5E7EB]/70",
          ].join(" ");

          return (
            <Link
              key={tab.name}
              href={`/?crew=${tab.name}&view=${view}`}
              className={linkClass}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
