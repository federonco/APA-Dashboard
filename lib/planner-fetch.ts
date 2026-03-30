"use client";

import type {
  PlannerActivitiesResponse,
  PlannerActivity,
  PlannerCrew,
  PlannerCrewsResponse,
} from "@/lib/planner-types";

function isPlannerActivity(value: unknown): value is PlannerActivity {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.crew_id === "string" &&
    typeof row.name === "string" &&
    typeof row.start_date === "string" &&
    typeof row.end_date === "string"
  );
}

export async function fetchPlannerActivities(signal?: AbortSignal): Promise<PlannerActivity[]> {
  const response = await fetch("/api/planner/activities", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch planner activities (${response.status})`);
  }
  const payload = (await response.json()) as PlannerActivitiesResponse;
  if (!Array.isArray(payload)) return [];
  return payload.filter(isPlannerActivity);
}

export async function fetchPlannerCrews(signal?: AbortSignal): Promise<PlannerCrew[]> {
  const response = await fetch("/api/planner/crews", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch planner crews (${response.status})`);
  }
  const payload = (await response.json()) as PlannerCrewsResponse;
  if (!payload || !Array.isArray(payload.crews)) return [];
  return payload.crews.filter((crew): crew is PlannerCrew => {
    return !!crew && typeof crew.id === "string" && typeof crew.name === "string";
  });
}
