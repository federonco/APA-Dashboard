import type { SectionInfo, SectionProgressData } from "@/lib/queries/daily";
import { tokens } from "@/lib/designTokens";

export interface SectionPortfolioViewProps {
  sections: SectionInfo[];
  progress: Record<string, SectionProgressData>;
  crewCode: string;
}

function formatCh(value: number): string {
  return `CH ${Math.round(value)}`;
}

export function SectionPortfolioView({ sections, progress, crewCode }: SectionPortfolioViewProps) {
  const withProgress = sections.filter((s) => progress[s.id] != null);
  if (sections.length === 0 || withProgress.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      style={{ gap: tokens.spacing.gap }}
      aria-label={`Section portfolio — crew ${crewCode}`}
    >
      {withProgress.map((section) => {
        const p = progress[section.id];
        if (!p) return null;

        const pct = Math.min(100, Math.max(0, p.percent));
        let badge: { label: string; emoji: string };
        if (p.pipeCount === 0) {
          badge = { label: "Not started", emoji: "⚪" };
        } else if (p.avgPipesPerDay > 0) {
          badge = { label: "Active", emoji: "🟢" };
        } else {
          badge = { label: "Idle", emoji: "🟡" };
        }

        return (
          <article
            key={section.id}
            className="flex flex-col"
            style={{
              background: tokens.theme.card,
              border: `1px solid ${tokens.theme.border}`,
              borderRadius: tokens.radius.card,
              padding: tokens.spacing.cardPadding,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3
                className="font-semibold leading-tight"
                style={{
                  fontSize: tokens.typography.subtitle,
                  color: tokens.text.primary,
                }}
              >
                {section.name}
              </h3>
              <span
                className="shrink-0 whitespace-nowrap text-[11px]"
                style={{ color: tokens.text.muted }}
                title={`Crew ${crewCode}`}
              >
                {badge.emoji} {badge.label}
              </span>
            </div>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span style={{ fontSize: tokens.typography.label, color: tokens.text.muted }}>
                  Progress
                </span>
                <span
                  className="font-medium tabular-nums"
                  style={{ fontSize: tokens.typography.label, color: tokens.text.secondary }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: tokens.theme.border }}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${pct}%`,
                    background: tokens.status.progressBar,
                  }}
                />
              </div>
            </div>

            <dl className="grid flex-1 gap-2 text-sm" style={{ color: tokens.text.secondary }}>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Pipe front</dt>
                <dd className="font-medium tabular-nums" style={{ color: tokens.charts.pipeLaid }}>
                  {formatCh(p.installedChainage)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Backfill front</dt>
                <dd className="font-medium tabular-nums" style={{ color: tokens.charts.backfill }}>
                  {p.pspLodgedUpToChainage != null ? formatCh(p.pspLodgedUpToChainage) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Pipes</dt>
                <dd className="tabular-nums">{p.pipeCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Avg rate</dt>
                <dd className="tabular-nums">
                  {p.avgPipesPerDay} pipes/day
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </section>
  );
}
