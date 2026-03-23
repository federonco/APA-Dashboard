"use client";

import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { CustomTooltip } from "./CustomTooltip";
import {
  WaterDonutDefs,
  waterDonutGradientId,
  waterDonutPaddingAngle,
  waterDonutSectorFilterUrl,
  waterDonutStroke,
  waterDonutStrokeWidth,
} from "@/lib/waterDonutVisual";
import type { WaterByActivity } from "@/lib/queries/daily";

const WATER_DONUT_DEF_PREFIX = "water-usage-donut";

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
  activeVehicles?: string;
};

export function WaterConsumptionChart({ data, vehicleLitres = 0, activeVehicles }: Props) {
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
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: tokens.typography.subtitle,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.02em",
            }}
          >
            Water usage today
          </span>
          {activeVehicles && (
            <span
              style={{
                fontSize: tokens.typography.label,
                color: tokens.text.muted,
                fontWeight: 400,
              }}
            >
              Active vehicles: {activeVehicles}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent style={{ padding: 0 }} className="flex-1 flex flex-col min-h-0">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-end gap-4"
        >
          <div style={{ height: 192, width: 192, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <WaterDonutDefs
                  prefix={WATER_DONUT_DEF_PREFIX}
                  segments={chartData.map(({ name, color }) => ({ name, color }))}
                />
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
                  paddingAngle={
                    chartData.length > 1 ? waterDonutPaddingAngle : 0
                  }
                  dataKey="value"
                  stroke={waterDonutStroke}
                  strokeWidth={waterDonutStrokeWidth}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={`url(#${waterDonutGradientId(WATER_DONUT_DEF_PREFIX, i, entry.name)})`}
                      filter={waterDonutSectorFilterUrl(WATER_DONUT_DEF_PREFIX)}
                    />
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
