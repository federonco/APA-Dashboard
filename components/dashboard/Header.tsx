"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { tokens } from "@/lib/designTokens";

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
    <header
      style={{
        background: tokens.theme.card,
        padding: tokens.spacing.cardPadding,
      }}
    >
      <div
        className="flex items-start justify-between gap-6"
        style={{ padding: `0 ${tokens.spacing.gap}` }}
      >
        <div className="min-w-0">
          <h1
            style={{
              fontSize: tokens.typography.title,
              fontWeight: 700,
              color: tokens.text.primary,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Alkimos Pipeline Alliance
          </h1>
          <p
            style={{
              marginTop: 4,
              fontSize: tokens.typography.subtitle,
              color: tokens.text.secondary,
              lineHeight: 1.3,
            }}
          >
            DN1600 Trunk Main
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-6">
          <Badge variant="live" className="gap-1.5">
            <span
              className="size-1.5 shrink-0 rounded-full bg-[#2F7D55]"
              aria-hidden
            />
            Live
          </Badge>
          <span
            style={{
              fontSize: tokens.typography.subtitle,
              color: tokens.text.secondary,
              lineHeight: 1.3,
            }}
          >
            {today}
          </span>
          <Link
            href="/admin"
            className="inline-block rounded-lg px-4 py-2 no-underline transition-[color,background-color] duration-150 text-[0.875rem] font-medium bg-[#D1D5DB] text-[#111827] hover:bg-[#E5E7EB]"
          >
            Admin
          </Link>
          <Link
            href={toggleUrl}
            prefetch={true}
            className="inline-block rounded-lg px-4 py-2 no-underline transition-[color,background-color] duration-150 text-[0.875rem] font-medium bg-[#D1D5DB] text-[#111827] hover:bg-[#E5E7EB]"
          >
            {isSpreadsheet ? "Dashboard" : "Data View"}
          </Link>
        </div>
      </div>
    </header>
  );
}
