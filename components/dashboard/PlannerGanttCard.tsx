"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import type { PlannerActivity, HorizonWeeks } from "@/lib/planner-types";

const PlannerGantt = dynamic(() => import("@/components/planner/PlannerGantt"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-zinc-500">
      Loading planner…
    </div>
  ),
});

type Crew = { id: string; name: string };

type Props = {
  crewId: string | null;
};

export function PlannerGanttCard({ crewId }: Props) {
  const [horizon, setHorizon] = useState<HorizonWeeks>(4);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [activities, setActivities] = useState<PlannerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch("/api/planner/crews");
        const body = (await res.json()) as { crews?: Crew[]; error?: string };
        if (!res.ok) throw new Error(body.error || res.statusText);
        if (!cancelled) setCrews(body.crews ?? []);
      } catch (e) {
        if (!cancelled) setCrews([]);
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load crews");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!crewId) {
      setActivities([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams({ crew_id: crewId }).toString();
        const res = await fetch(`/api/planner/activities?${qs}`);
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            body && typeof body === "object" && body && "error" in body && typeof (body as { error: unknown }).error === "string"
              ? (body as { error: string }).error
              : res.statusText;
          throw new Error(msg);
        }
        if (!cancelled) setActivities(Array.isArray(body) ? (body as PlannerActivity[]) : []);
      } catch (e) {
        if (!cancelled) setActivities([]);
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load activities");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crewId]);

  const crewMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; index: number }>();
    crews.forEach((c, idx) => map.set(c.id, { id: c.id, name: c.name, index: idx }));
    return map;
  }, [crews]);

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
          flexWrap: "wrap",
          gap: 8,
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
          Planner — Gantt
        </span>
        <label className="flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="font-medium">Horizon</span>
          <select
            className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value) as HorizonWeeks)}
          >
            <option value={2}>2 weeks</option>
            <option value={4}>4 weeks</option>
            <option value={6}>6 weeks</option>
            <option value={8}>8 weeks</option>
          </select>
        </label>
      </CardHeader>
      <CardContent style={{ padding: 0 }} className="min-h-0 flex-1">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && activities.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-zinc-500">
            Loading…
          </div>
        ) : (
          <PlannerGantt
            activities={activities}
            crewMap={crewMap}
            horizon={horizon}
            onActivityClick={() => {}}
            onGanttSelect={() => {}}
            peopleLeaves={[]}
          />
        )}
      </CardContent>
    </Card>
  );
}

