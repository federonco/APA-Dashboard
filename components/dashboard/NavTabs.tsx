"use client";

import Link from "next/link";
import { CREW_TABS } from "@/lib/constants/crew-tabs";
import { tokens } from "@/lib/designTokens";

interface Props {
  crew: string;
  view: string;
}

export function NavTabs({ crew, view }: Props) {
  return (
    <nav
      style={{
        overflowX: "auto",
        borderBottom: `1px solid ${tokens.theme.border}`,
        background: tokens.theme.background,
        padding: `0 ${tokens.spacing.section}`,
      }}
    >
      <div
        className="flex gap-6 sm:gap-8"
        style={{ paddingBottom: "0.75rem", marginBottom: -1 }}
      >
        {CREW_TABS.map((tab) => (
          <div key={tab.name} className="relative">
            {tab.enabled ? (
              <Link
                href={`/?crew=${tab.name}&view=${view}`}
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  fontSize: tokens.typography.body,
                  fontWeight: 700,
                  color: crew === tab.name ? tokens.status.progressBar : tokens.text.secondary,
                  borderBottom: `2px solid ${
                    crew === tab.name ? tokens.status.progressBar : "transparent"
                  }`,
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                {tab.label}
              </Link>
            ) : (
              <Link
                href={`/?crew=${tab.name}&view=${view}`}
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  fontSize: tokens.typography.body,
                  fontWeight: 700,
                  color: crew === tab.name ? tokens.status.progressBar : tokens.text.muted,
                  borderBottom: `2px solid ${
                    crew === tab.name ? tokens.status.progressBar : "transparent"
                  }`,
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                {tab.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
