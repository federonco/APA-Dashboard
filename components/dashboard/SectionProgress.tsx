"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tokens } from "@/lib/designTokens";
import type { SectionInfo, SectionProgressData } from "@/lib/queries/daily";

type Props = {
  sections: SectionInfo[];
  progressBySection: Record<string, SectionProgressData | null>;
};

export function SectionProgress({ sections, progressBySection }: Props) {
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "");
  const section = sections.find((s) => s.id === selectedId);
  const progress = section ? progressBySection[section.id] : null;

  const pb = tokens.components.progressBar;
  const percent = progress?.percent ?? 0;
  const installedCh = progress?.installedChainage ?? 0;
  const finalCh = progress?.finalChainage ?? 0;
  const pipeCount = progress?.pipeCount ?? 0;

  if (sections.length === 0) {
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
              fontSize: tokens.typography.label,
              fontWeight: 500,
              color: tokens.text.secondary,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Section Progress
          </p>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <p style={{ fontSize: tokens.typography.body, color: tokens.text.muted }}>
            No sections configured for this crew
          </p>
        </CardContent>
      </Card>
    );
  }

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
            fontSize: tokens.typography.label,
            fontWeight: 500,
            color: tokens.text.secondary,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Section Progress
        </p>
      </CardHeader>
      <Tabs
        value={selectedId}
        onValueChange={(v) => setSelectedId(v)}
        className="w-full"
      >
        <TabsList variant="line" className="mb-3 h-auto w-full justify-start">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <div>
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
              <span
                style={{
                  fontSize: tokens.typography.label,
                  color: tokens.text.muted,
                }}
              >
                Pipe installed Ch {installedCh.toFixed(1)} m / final Ch {finalCh.toFixed(1)} m
              </span>
              <p
                style={{
                  fontSize: tokens.typography.label,
                  color: tokens.text.muted,
                }}
              >
                {pipeCount} pipes installed
              </p>
            </div>
          </div>
        </div>
      </Tabs>
    </Card>
  );
}
