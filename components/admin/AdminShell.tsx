"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tokens } from "@/lib/designTokens";

const links = [
  { href: "/admin", label: "Admins" },
  { href: "/admin/sections", label: "Sections" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      className="min-h-screen"
      style={{
        background: tokens.theme.background,
        fontFamily: "var(--font-manrope), sans-serif",
      }}
    >
      <header
        className="border-b"
        style={{
          padding: "16px 32px",
          background: "#FCFBFB",
          borderColor: tokens.theme.border,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#3f3f46" }}>
              Admin panel
            </h1>
            <p className="text-xs" style={{ color: "#71717a" }}>
              Super admin only
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium"
            style={{ color: "#B96A2D" }}
          >
            ← Back to dashboard
          </Link>
        </div>
        <nav className="mt-4 flex gap-1 border-t pt-3" style={{ borderColor: "#EEECEF" }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: active ? "#F3F4F6" : "transparent",
                  color: active ? "#111827" : "#71717a",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ padding: "28px 32px 48px" }}>{children}</main>
    </div>
  );
}
