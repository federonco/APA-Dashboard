"use client";

import type { SectionAccess } from "@/lib/queries/qrAccess";

export function UserPanel({
  access,
  token,
}: {
  access: NonNullable<SectionAccess>;
  token: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded border border-[#1e1e1e] p-6">
        <h2 className="font-heading text-sm uppercase tracking-wider text-zinc-400 mb-4">
          Section: {access.section.name}
        </h2>
        <p className="text-zinc-500 text-sm">
          Data entry for this location. Admin mode is not available from QR
          access.
        </p>
        <p className="font-mono text-xs text-zinc-600 mt-4">
          Token: {token.slice(0, 8)}…
        </p>
      </div>
      <p className="text-zinc-600 text-sm">
        Connect to psp_records or drainer_pipe_records for data entry UI (to be
        implemented in respective apps).
      </p>
    </div>
  );
}
