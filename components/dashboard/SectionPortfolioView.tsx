import type { SectionInfo, SectionProgressData, SectionProgressSummary } from "@/lib/queries/daily";
import { tokens } from "@/lib/designTokens";
import { PIPE_LENGTH_M, SCHEDULE_PIPES_PER_DAY } from "@/lib/constants";

export interface SectionPortfolioViewProps {
  sections: SectionInfo[];
  progress: Record<string, SectionProgressData>;
  sectionProgress?: Record<string, SectionProgressSummary>;
  crewCode: string;
}

function formatCh(value: number): string {
  return `CH ${Math.round(value)}`;
}

const WA_PUBLIC_HOLIDAYS: Record<number, string[]> = {
  2025: ["2025-01-01", "2025-01-27", "2025-03-03", "2025-04-18", "2025-04-21", "2025-04-25", "2025-06-02", "2025-09-29", "2025-12-25", "2025-12-26"],
  2026: ["2026-01-01", "2026-01-26", "2026-03-02", "2026-04-03", "2026-04-06", "2026-04-27", "2026-06-01", "2026-09-28", "2026-12-25", "2026-12-28"],
  2027: ["2027-01-01", "2027-01-26", "2027-03-01", "2027-03-26", "2027-03-29", "2027-04-26", "2027-06-07", "2027-09-27", "2027-12-27", "2027-12-28"],
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWaNonWorkingDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  const list = WA_PUBLIC_HOLIDAYS[d.getFullYear()] ?? [];
  return list.includes(toDateKey(d));
}

function addWaWorkingDays(from: Date, days: number): Date {
  if (days <= 0) return new Date(from);
  const out = new Date(from);
  let added = 0;
  while (added < days) {
    out.setDate(out.getDate() + 1);
    if (!isWaNonWorkingDay(out)) added += 1;
  }
  return out;
}

export function SectionPortfolioView({
  sections,
  progress,
  sectionProgress = {},
  crewCode,
}: SectionPortfolioViewProps) {
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

        const sectionSummary = sectionProgress[section.id];
        const defaultPct = Math.min(100, Math.max(0, p.percent));
        const plannedPipes =
          Math.abs(section.endCh - section.startCh) > 0
            ? Math.ceil(Math.abs(section.endCh - section.startCh) / PIPE_LENGTH_M)
            : 0;
        const pct = sectionSummary ? sectionSummary.progressPct : defaultPct;
        const estimatedPipesPerDay = p.avgPipesPerDay > 0 ? p.avgPipesPerDay : SCHEDULE_PIPES_PER_DAY;
        const remainingPipes = Math.max(0, plannedPipes - p.pipeCount);
        const expectedFinishData =
          remainingPipes === 0
            ? { label: "Expected finish: Completed", hint: "" }
            : estimatedPipesPerDay > 0
              ? (() => {
                  const daysRemaining = Math.ceil(remainingPipes / estimatedPipesPerDay);
                  const finish = addWaWorkingDays(new Date(), daysRemaining + 5);
                  const weekOfMonth = Math.ceil(finish.getDate() / 7);
                  const dateLabel = finish.toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  return {
                    label: `Expected finish: Week ${weekOfMonth}, ${dateLabel}`,
                    hint: "+5 working-day contingency; weekends & WA public holidays skipped",
                  };
                })()
              : { label: "Expected finish: —", hint: "" };
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
              {sectionSummary?.guideBased && sectionSummary.totalFittings != null && (
                <div className="flex justify-between gap-2">
                  <dt style={{ color: tokens.text.muted }}>Fittings installed</dt>
                  <dd className="tabular-nums">
                    {sectionSummary.pipeCount} / {sectionSummary.totalFittings}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Pipe front</dt>
                <dd className="font-medium tabular-nums" style={{ color: tokens.charts.pipeLaid }}>
                  {formatCh(sectionSummary?.pipeFront ?? p.installedChainage)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Finish Ch</dt>
                <dd className="font-medium tabular-nums" style={{ color: tokens.text.secondary }}>
                  {formatCh(p.finalChainage)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Backfill records up to</dt>
                <dd className="font-medium tabular-nums" style={{ color: tokens.charts.backfill }}>
                  {p.pspLodgedUpToChainage != null ? formatCh(p.pspLodgedUpToChainage) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Pipes / Fittings</dt>
                <dd className="tabular-nums">{p.pipeCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: tokens.text.muted }}>Avg rate</dt>
                <dd className="tabular-nums">
                  {p.avgPipesPerDay} pipes/day
                </dd>
              </div>
            </dl>
            <div
              style={{
                marginTop: 4,
                fontSize: tokens.typography.label,
                color: tokens.text.secondary,
                fontFamily: tokens.typography.fontFamily,
              }}
              title={expectedFinishData.hint || undefined}
            >
              {expectedFinishData.label}
            </div>
          </article>
        );
      })}
    </section>
  );
}
