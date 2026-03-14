"use client";

import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { CustomTooltip } from "./CustomTooltip";
import type { WaterByActivity } from "@/lib/queries/daily";

const ACTIVITY_COLOR_MAP: Record<string, string> = {
  "Pipe jointing": tokens.waterChart.pipeJointing,
  "Dust suppression": tokens.waterChart.dustSuppression,
  Testing: tokens.waterChart.testing,
  Other: tokens.waterChart.other,
  Vehicle: "#6B7280",
};

const FALLBACK_COLORS = [
  tokens.waterChart.pipeJointing,
  tokens.waterChart.dustSuppression,
  tokens.waterChart.testing,
  tokens.waterChart.other,
];

function getColor(activity: string, index: number): string {
  return ACTIVITY_COLOR_MAP[activity] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

type Props = {
  data: WaterByActivity[];
  vehicleLitres?: number;
};

export function WaterConsumptionChart({ data, vehicleLitres = 0 }: Props) {
  const baseItems = useMemo(() => {
    const items = data.map((d, i) => ({
      name: d.activity,
      value: d.litres,
      color: getColor(d.activity, i),
    }));
    if (vehicleLitres > 0) {
      items.push({ name: "Vehicle", value: vehicleLitres, color: ACTIVITY_COLOR_MAP.Vehicle });
    }
    return items;
  }, [data, vehicleLitres]);

  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(baseItems.map((i) => [i.name, true]))
  );

  useEffect(() => {
    setVisible((prev) => {
      const next: Record<string, boolean> = {};
      for (const i of baseItems) {
        next[i.name] = i.name in prev ? prev[i.name] : true;
      }
      return Object.keys(next).length ? next : prev;
    });
  }, [baseItems]);

  const chartData = useMemo(
    () => baseItems.filter((i) => visible[i.name] ?? true),
    [baseItems, visible]
  );
  const totalLitres = chartData.reduce((sum, d) => sum + d.value, 0);
  const totalKL = (totalLitres / 1000).toFixed(1);

  const toggle = (name: string) => () =>
    setVisible((v) => ({ ...v, [name]: !(v[name] ?? true) }));

  return (
    <Card
      className="h-full flex flex-col"
      style={{
        background: tokens.theme.card,
        border: `1px solid ${tokens.theme.border}`,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.cardPadding,
      }}
    >
      <CardHeader
        style={{
          padding: 0,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.subtitle,
            fontWeight: 500,
            color: tokens.text.secondary,
            letterSpacing: "0.02em",
          }}
        >
          WATER CONSUMPTION — TODAY
        </span>
        <span
          style={{
            borderRadius: tokens.radius.badge,
            background: tokens.theme.border,
            padding: "4px 8px",
            fontSize: tokens.typography.body,
            fontWeight: 600,
            color: tokens.text.primary,
          }}
        >
          {totalKL} kL
        </span>
      </CardHeader>
      <CardContent style={{ padding: 0 }} className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col justify-center items-center gap-4 min-h-0"
        >
          <div style={{ height: 192, width: 192, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={<CustomTooltip />}
                  offset={100}
                  wrapperStyle={{ outline: "none" }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={77}
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: tokens.typography.label,
            }}
          >
            <tbody>
              {baseItems.map((entry) => {
                const isActive = visible[entry.name] ?? true;
                const allLitres = baseItems.reduce((s, i) => s + i.value, 0);
                const pct = allLitres > 0 ? ((entry.value / allLitres) * 100).toFixed(1) : "0";
                const kL = (entry.value / 1000).toFixed(1);
                return (
                  <tr
                    key={entry.name}
                    role="button"
                    tabIndex={0}
                    onClick={toggle(entry.name)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(entry.name)())
                    }
                    style={{
                      cursor: "pointer",
                      opacity: isActive ? 1 : 0.5,
                    }}
                  >
                    <td style={{ padding: "2px 8px 2px 0", verticalAlign: "middle", width: 1 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: entry.color,
                          opacity: isActive ? 1 : 0.5,
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "2px 16px 2px 0",
                        textAlign: "left",
                        color: tokens.text.secondary,
                        textDecoration: isActive ? "none" : "line-through",
                      }}
                    >
                      {entry.name}
                    </td>
                    <td
                      style={{
                        padding: "2px 8px 2px 0",
                        textAlign: "right",
                        color: tokens.text.primary,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {kL} kL
                    </td>
                    <td
                      style={{
                        padding: "2px 0",
                        textAlign: "right",
                        color: tokens.text.muted,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ({pct}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
