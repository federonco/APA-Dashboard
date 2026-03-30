"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Gantt } from "@svar-ui/react-gantt";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tokens } from "@/lib/designTokens";
import { fetchPlannerActivities, fetchPlannerCrews } from "@/lib/planner-fetch";
import { toPlannerGanttTasks } from "@/lib/planner-gantt-adapter";
import type { PlannerActivity, PlannerCrew } from "@/lib/planner-types";
import { PlannerTaskDrawer } from "@/components/dashboard/PlannerTaskDrawer";

const HORIZON_OPTIONS = [
  { label: "2W", days: 14 },
  { label: "4W", days: 28 },
  { label: "6W", days: 42 },
  { label: "8W", days: 56 },
] as const;
type HorizonDays = (typeof HORIZON_OPTIONS)[number]["days"];

function getHorizonEnd(days: number): Date {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + days);
  return end;
}

function getHorizonStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function weekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `W${weekNo}`;
}

function dayLabel(date: Date): string {
  return String(date.getDate()).padStart(2, "0");
}

export function PlannerGanttCard() {
  const [activities, setActivities] = useState<PlannerActivity[]>([]);
  const [crews, setCrews] = useState<PlannerCrew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizonDays, setHorizonDays] = useState<HorizonDays>(28);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([fetchPlannerActivities(controller.signal), fetchPlannerCrews(controller.signal)])
      .then(([activityRows, crewRows]) => {
        setActivities(activityRows);
        setCrews(crewRows);
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load planner data");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const tasks = useMemo(
    () => toPlannerGanttTasks(activities, crews, horizonDays),
    [activities, crews, horizonDays]
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return activities.find((activity) => activity.id === selectedTaskId) ?? null;
  }, [activities, selectedTaskId]);

  const selectedCrewName = useMemo(() => {
    if (!selectedTask) return "";
    return crews.find((crew) => crew.id === selectedTask.crew_id)?.name ?? selectedTask.crew_id;
  }, [crews, selectedTask]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const exists = activities.some((activity) => activity.id === selectedTaskId);
    if (!exists) setSelectedTaskId(null);
  }, [activities, selectedTaskId]);

  const ganttStyle = useMemo(
    () =>
      ({
        "--wx-background": "#fafafa",
        "--wx-gantt-border-color": "#e4e4e7",
        "--wx-gantt-border": "1px solid #e4e4e7",
        "--wx-grid-body-row-border": "1px solid #ececf0",
        "--wx-grid-body-cell-border": "1px solid #f1f1f4",
        "--wx-timescale-border": "1px solid #ececf0",
        "--wx-grid-header-font": "500 12px var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
        "--wx-grid-header-font-color": "#71717a",
        "--wx-grid-body-font": "400 12px var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
        "--wx-grid-body-font-color": "#52525b",
        "--wx-timescale-font": "500 11px var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
        "--wx-timescale-font-color": "#71717a",
        "--wx-gantt-task-color": "#3b82f6",
        "--wx-gantt-task-fill-color": "#2563eb",
        "--wx-gantt-task-border-color": "#2563eb",
        "--wx-gantt-task-border": "1px solid #2563eb",
        "--wx-gantt-summary-color": "#f59e0b",
        "--wx-gantt-summary-fill-color": "#d97706",
        "--wx-gantt-summary-border-color": "#d97706",
        "--wx-gantt-summary-border": "1px solid #d97706",
        "--wx-gantt-bar-border-radius": "4px",
        "--wx-gantt-bar-shadow": "none",
        "--wx-gantt-select-color": "rgba(59,130,246,0.08)",
      }) as CSSProperties,
    []
  );

  return (
    <Card
      className="planner-gantt-onsite overflow-hidden"
      style={{
        background: "#fafafa",
        border: "1px solid #f1f1f4",
        borderRadius: 8,
        marginTop: tokens.spacing.gap,
      }}
    >
      <CardHeader style={{ padding: "8px 10px 6px 10px" }}>
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#52525b",
                letterSpacing: "0.01em",
              }}
            >
              Look Ahead
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-zinc-500">Horizon</span>
            <div className="inline-flex rounded border border-zinc-200 bg-white p-0.5">
              {HORIZON_OPTIONS.map(({ label, days }) => {
                const active = days === horizonDays;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setHorizonDays(days)}
                    className={`h-5 rounded-sm px-1.5 text-[10px] transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-700"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                    }`}
                    aria-pressed={active}
                    title={`Show ${label} planning horizon`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: "0 10px 10px 10px" }}>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center rounded border border-dashed border-zinc-200 bg-white text-xs text-zinc-500">
            Loading planner timeline...
          </div>
        ) : error ? (
          <div className="h-[500px] flex flex-col items-center justify-center rounded border border-red-200 bg-red-50/30 text-xs text-red-700">
            <span>Planner timeline unavailable</span>
            <span className="mt-1 text-xs">{error}</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center rounded border border-dashed border-zinc-200 bg-white text-xs text-zinc-500">
            No planner activities available in the selected horizon.
          </div>
        ) : (
          <div className={`grid gap-2 ${selectedTask ? "grid-cols-1 xl:grid-cols-[1fr_292px]" : "grid-cols-1"}`}>
            <div className="h-[560px] overflow-hidden rounded border border-zinc-200 bg-[#fafafa]" style={ganttStyle}>
              <Gantt
                readonly
                tasks={tasks}
                activeTask={selectedTaskId ?? undefined}
                onselecttask={(event) => {
                  const id = String((event as { id?: string | number }).id ?? "");
                  if (!id || id.startsWith("crew-")) return;
                  setSelectedTaskId(id);
                }}
                autoScale={false}
                start={getHorizonStart()}
                end={getHorizonEnd(horizonDays)}
                cellWidth={20}
                zoom={false}
                cellHeight={28}
                scales={[
                  { unit: "week", step: 1, format: weekLabel },
                  { unit: "day", step: 1, format: dayLabel },
                ]}
              />
            </div>
            {selectedTask ? (
              <PlannerTaskDrawer
                task={selectedTask}
                crewName={selectedCrewName}
                onClose={() => setSelectedTaskId(null)}
              />
            ) : null}
          </div>
        )}
      </CardContent>
      <style jsx global>{`
        .planner-gantt-onsite .wx-chart,
        .planner-gantt-onsite .wx-table-container,
        .planner-gantt-onsite .wx-gantt {
          overflow-x: hidden !important;
        }
        .planner-gantt-onsite .wx-table-container {
          border-right: 1px solid #e7e7eb !important;
        }
        .planner-gantt-onsite .wx-grid .wx-header .wx-cell {
          padding: 0 4px !important;
          letter-spacing: 0 !important;
          font-weight: 500 !important;
          color: #71717a !important;
        }
        .planner-gantt-onsite .wx-grid .wx-header .wx-cell:first-child {
          padding-left: 8px !important;
        }
        .planner-gantt-onsite .wx-grid .wx-body .wx-row {
          min-height: 26px !important;
        }
        .planner-gantt-onsite .wx-grid .wx-body .wx-cell {
          padding: 0 4px !important;
          color: #52525b !important;
        }
        .planner-gantt-onsite .wx-scale .wx-cell {
          font-size: 10px !important;
          font-weight: 500 !important;
          color: #71717a !important;
          border-right: 1px solid #ececf0 !important;
        }
        .planner-gantt-onsite .wx-scale .wx-row {
          min-height: 24px !important;
        }
        .planner-gantt-onsite .wx-selected {
          background: rgba(59, 130, 246, 0.06) !important;
        }
        .planner-gantt-onsite .wx-bar,
        .planner-gantt-onsite .wx-bar .wx-segment {
          box-shadow: none !important;
          height: 18px !important;
          line-height: 18px !important;
          border-radius: 3px !important;
        }
        .planner-gantt-onsite .wx-bar .wx-content {
          font-size: 10px !important;
          font-weight: 500 !important;
          opacity: 0.9;
        }
        .planner-gantt-onsite .wx-task:hover,
        .planner-gantt-onsite .wx-summary:hover {
          box-shadow: none !important;
          filter: brightness(0.98);
        }
        .planner-gantt-onsite .wx-task.wx-selected,
        .planner-gantt-onsite .wx-summary.wx-selected {
          box-shadow: none !important;
          outline: 1px solid rgba(37, 99, 235, 0.35) !important;
          outline-offset: 0 !important;
        }
      `}</style>
    </Card>
  );
}
