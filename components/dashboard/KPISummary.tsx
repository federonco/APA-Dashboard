import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { PIPE_LENGTH_M } from "@/lib/constants";

type Props = {
  pipesCount?: number;
  backfillMeters?: number;
  waterKL?: number;
};

export function KPISummary({
  pipesCount = 0,
  backfillMeters = 0,
  waterKL = 0,
}: Props) {
  const pipeMeters = (pipesCount ?? 0) * PIPE_LENGTH_M;
  const kpiPad = tokens.components.kpiCard.padding;
  const items: { label: string; value: string; subValue?: string }[] = [
    { label: "Pipes installed today", value: String(pipesCount), subValue: `${pipeMeters.toFixed(1)} m` },
    { label: "Backfill today", value: `${backfillMeters} m` },
    { label: "Water used today", value: `${waterKL} kL` },
  ];
  return (
    <section
      className="grid grid-cols-3 gap-4"
      style={{ marginBottom: tokens.spacing.gap }}
    >
      {items.map((item) => (
        <Card
          key={item.label}
          className="justify-center gap-1 relative"
          style={{
            height: tokens.components.kpiCard.height,
            background: tokens.components.kpiCard.background,
            border: `1px solid ${tokens.components.kpiCard.border}`,
            borderRadius: tokens.components.kpiCard.radius,
            padding: kpiPad,
          }}
        >
          <CardHeader style={{ padding: 0 }} className="mb-0">
            <p
              style={{
                fontSize: tokens.typography.subtitle,
                fontWeight: 500,
                color: tokens.text.secondary,
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </p>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <p
              style={{
                fontSize: tokens.components.kpiCard.height === "96px"
                  ? tokens.typography.kpi
                  : tokens.typography.title,
                fontWeight: 600,
                color: tokens.text.primary,
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </p>
          </CardContent>
          {item.subValue ? (
            <p
              style={{
                position: "absolute",
                right: kpiPad,
                bottom: kpiPad,
                margin: 0,
                fontSize: tokens.typography.label,
                color: tokens.text.secondary,
                fontWeight: 500,
                textAlign: "right",
                lineHeight: 1.25,
              }}
            >
              {item.subValue}
            </p>
          ) : null}
        </Card>
      ))}
    </section>
  );
}
