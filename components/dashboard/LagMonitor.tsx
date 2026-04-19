import type { SectionInfo, SectionProgressData } from "@/lib/queries/daily";
import { tokens } from "@/lib/designTokens";

export interface LagMonitorProps {
  sections: SectionInfo[];
  progress: Record<string, SectionProgressData>;
}

function lagBarColor(lagM: number): string {
  if (lagM < 50) return "#22C55E";
  if (lagM < 150) return "#F59E0B";
  return "#EF4444";
}

export function LagMonitor({ sections, progress }: LagMonitorProps) {
  const rows: { section: SectionInfo; lag: number; denom: number }[] = [];

  for (const section of sections) {
    const p = progress[section.id];
    if (!p) continue;
    if (p.pspLodgedUpToChainage == null) continue;
    const lag = Math.abs(p.installedChainage - p.pspLodgedUpToChainage);
    const denom = Math.abs(section.startCh - section.endCh);
    rows.push({ section, lag, denom: denom > 0 ? denom : 1 });
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-6"
      style={{ marginTop: 0 }}
      aria-label="Backfill lag monitor"
    >
      <div
        style={{
          background: tokens.theme.card,
          border: `1px solid ${tokens.theme.border}`,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.cardPadding,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3
          className="mb-4 font-semibold"
          style={{
            fontSize: tokens.typography.subtitle,
            color: tokens.text.primary,
          }}
        >
          Backfill Lag
        </h3>
        <ul className="flex flex-col gap-4">
          {rows.map(({ section, lag, denom }) => {
            const barPct = Math.min(100, (lag / denom) * 100);
            const color = lagBarColor(lag);
            return (
              <li key={section.id}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span
                    className="truncate text-sm font-medium"
                    style={{ color: tokens.text.secondary }}
                  >
                    {section.name}
                  </span>
                  <span
                    className="shrink-0 text-sm font-bold tabular-nums"
                    style={{ color: tokens.text.primary }}
                  >
                    {Math.round(lag)} m
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: tokens.theme.border }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barPct}%`,
                      background: color,
                      maxWidth: "100%",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
