import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";

type ScheduleStatus = "ahead" | "behind" | "on-schedule";

function ScheduleIndicator({ status, delta }: { status: ScheduleStatus; delta?: number }) {
  if (status === "on-schedule") {
    return (
      <span style={{ fontSize: tokens.typography.label, color: tokens.text.muted }}>
        On schedule
      </span>
    );
  }
  const isAhead = status === "ahead";
  const color = isAhead ? tokens.status.live : "#ef4444";
  const arrow = isAhead ? "↑" : "↓";
  const sign = isAhead ? "+" : "−";
  return (
    <span style={{ fontSize: tokens.typography.label, color }}>
      <span style={{ fontSize: 10, lineHeight: 1 }}>{arrow}</span>
      {sign}{Math.abs(delta ?? 0)}% {isAhead ? "ahead" : "behind"} of plan
    </span>
  );
}

type ProjectProgressProps = {
  installed: number;
  planned: number;
  scheduleStatus: ScheduleStatus;
  scheduleDelta: number;
};

export function ProjectProgress({
  installed,
  planned,
  scheduleStatus,
  scheduleDelta,
}: ProjectProgressProps) {
  const percent = planned > 0 ? Math.min(100, Math.round((installed / planned) * 100)) : 0;
  const pb = tokens.components.progressBar;

  return (
    <Card
      style={{
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.cardPadding,
        marginBottom: tokens.spacing.gap,
      }}
    >
      <CardHeader style={{ padding: 0, marginBottom: 12 }}>
        <p
          style={{
            fontSize: tokens.typography.subtitle,
            fontWeight: 500,
            color: tokens.text.secondary,
            letterSpacing: "0.02em",
          }}
        >
          Project progress
        </p>
      </CardHeader>
      <CardContent style={{ padding: 0 }}>
        <div
          style={{
            width: "100%",
            height: pb.height,
            background: pb.background,
            borderRadius: pb.radius,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              background: pb.fill,
              borderRadius: pb.radius,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-4">
            <p
              style={{
                fontSize: tokens.typography.subtitle,
                fontWeight: 600,
                color: tokens.text.primary,
                lineHeight: 1.2,
              }}
            >
              {percent}% complete
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <ScheduleIndicator status={scheduleStatus} delta={scheduleDelta} />
            <p
              style={{
                fontSize: tokens.typography.label,
                color: tokens.text.muted,
              }}
            >
              {installed} pipes installed / {planned} planned
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
