"use client";

import type { PlannerActivity } from "@/lib/planner-types";

type Props = {
  task: PlannerActivity;
  crewName: string;
  onClose: () => void;
};

function toLocalDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

export function PlannerTaskDrawer({ task, crewName, onClose }: Props) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded border border-zinc-200 bg-[#fafafa] p-2.5">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-border pb-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
            Task details
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-700">{task.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700"
        >
          Close
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="rounded border border-zinc-200 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Crew</p>
          <p className="mt-1 font-medium text-zinc-700">{crewName}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Status</p>
          <p className="mt-1 font-medium capitalize text-zinc-700">
            {task.status?.replaceAll("_", " ") || "planned"}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Start</p>
          <p className="mt-1 font-medium text-zinc-700">{toLocalDateLabel(task.start_date)}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">End</p>
          <p className="mt-1 font-medium text-zinc-700">{toLocalDateLabel(task.end_date)}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Duration</p>
          <p className="mt-1 font-medium text-zinc-700">
            {durationDays(task.start_date, task.end_date)} days
          </p>
        </div>
      </div>
    </aside>
  );
}
