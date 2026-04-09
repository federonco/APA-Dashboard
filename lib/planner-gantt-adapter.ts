import type { ITask } from "@svar-ui/react-gantt";
import type { PlannerActivity, PlannerCrew } from "@/lib/planner-types";

const DONE_TASK_COLOR = "#16a34a";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function overlapsRange(start: Date, end: Date, horizonStart: Date, horizonEnd: Date): boolean {
  return start <= horizonEnd && end >= horizonStart;
}

export function toPlannerGanttTasks(
  activities: PlannerActivity[],
  crews: PlannerCrew[],
  horizonDays: number
): ITask[] {
  const now = new Date();
  const horizonStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizonEnd = new Date(horizonStart);
  horizonEnd.setDate(horizonEnd.getDate() + Math.max(1, horizonDays));

  const parentTasks: ITask[] = crews.map((crew) => ({
    id: `crew-${crew.id}`,
    text: `Crew - ${crew.name}`,
    type: "summary",
    open: true,
  }));

  const childTasks: ITask[] = [];
  for (const activity of activities) {
    const start = parseDate(activity.start_date);
    const endRaw = parseDate(activity.end_date);
    if (!start || !endRaw) continue;
    const end = endOfDay(endRaw);
    if (!overlapsRange(start, end, horizonStart, horizonEnd)) continue;

    childTasks.push({
      id: activity.id,
      text: activity.name || "Untitled activity",
      start,
      end,
      parent: `crew-${activity.crew_id}`,
      type: "task",
      progress: Math.max(0, Math.min(100, Number(activity.progress_percent) || 0)),
      status: activity.status,
      color: activity.status === "done" ? DONE_TASK_COLOR : undefined,
      barColor: activity.status === "done" ? DONE_TASK_COLOR : undefined,
      sort_order: activity.sort_order ?? 0,
    });
  }

  childTasks.sort((a, b) => {
    const aSort = Number(a.sort_order) || 0;
    const bSort = Number(b.sort_order) || 0;
    if (aSort !== bSort) return aSort - bSort;
    const aStart = a.start instanceof Date ? a.start.getTime() : 0;
    const bStart = b.start instanceof Date ? b.start.getTime() : 0;
    return aStart - bStart;
  });

  const usedParents = new Set(childTasks.map((task) => String(task.parent)));
  const filteredParents = parentTasks.filter((parent) => usedParents.has(String(parent.id)));
  return [...filteredParents, ...childTasks];
}
