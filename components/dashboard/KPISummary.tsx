import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";

const KPI_ITEMS = [
  { label: "Pipes Installed Today", value: "22" },
  { label: "Backfill Today", value: "80 m" },
  { label: "Water Used Today", value: "28.0 kL" },
  { label: "Productivity", value: "+33%" },
];

export function KPISummary() {
  return (
    <section
      className="grid grid-cols-4 gap-4"
      style={{ marginBottom: tokens.spacing.gap }}
    >
      {KPI_ITEMS.map((item) => (
        <Card
          key={item.label}
          className="justify-center"
          style={{
            height: tokens.components.kpiCard.height,
            background: tokens.components.kpiCard.background,
            border: `1px solid ${tokens.components.kpiCard.border}`,
            borderRadius: tokens.components.kpiCard.radius,
            padding: tokens.components.kpiCard.padding,
          }}
        >
          <CardHeader style={{ padding: 0 }} className="mb-1">
            <p
              style={{
                fontSize: tokens.typography.label,
                fontWeight: 500,
                color: tokens.text.secondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
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
        </Card>
      ))}
    </section>
  );
}
